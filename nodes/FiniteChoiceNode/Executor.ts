
import { Node, WorkflowServices, NodeTypeDefinition, AiServiceConfig, NodeExecutionState, PortDataType, GeminiFunctionDeclaration, GeminiFunctionDeclarationSchema, RegisteredAiTool, OpenAIToolCall, Tool, ModelConfigGroup, EditableAiModelConfig, GeminiContent, OpenAIChatMessage, GeminiHistoryItem, OpenAIMessageForHistory } from '../../types';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';
import { AVAILABLE_AI_TOOLS } from '../../features/ai/tools/availableAiTools';
import { FINITE_CHOICE_NODE_TYPE_KEY } from './Definition';
import { resolveAiServiceConfig, getFullAiConfigFromGroupId as getFullAiConfigFromGroupIdUtil } from '../../features/ai/execution/commonAiExecutorUtils';
import { processTemplateString } from '../../features/execution/engine/NodeExecutionEngine';
import { DEFAULT_ENV_GEMINI_CONFIG_ID, PREDEFINED_MODEL_CONFIG_GROUPS } from '../../globalModelConfigs';
import * as aiHistoryUtils from '../../utils/aiHistoryUtils'; // Assuming path is correct


const sanitizePortIdComponent = (choice: string): string => {
  return choice.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);
};


export const executeFiniteChoiceNode = async (
  node: Node,
  inputs: Record<string, any>,
  services: WorkflowServices & { getMergedModelConfigs?: () => Array<ModelConfigGroup | EditableAiModelConfig> }, 
  executionContextId?: string,
  customTools?: RegisteredAiTool[] 
): Promise<{
  outputs: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'] & { portSpecificErrors?: { portId: string; message: string }[] }
}> => {
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;
  if (!nodeDefinition) {
    const errorMsg = `Node definition not found for type: ${node.type}`;
    return {
      outputs: {},
      executionDetails: { lastRunError: errorMsg, outputContent: errorMsg, lastExecutionContextId: executionContextId },
    };
  }

  const logPrefix = `[FiniteChoiceExecutor Node:${node.id}]`;
  let executionErrorForNode: string | undefined = undefined;

  const availableChoices: string[] = [];
  node.outputs.forEach(port => {
    if (port.id !== 'flow_end' && port.id !== 'history_out' && node.data?.portConfigs?.[port.id]?.isChoiceOption) {
      availableChoices.push(port.label);
    }
  });

  if (availableChoices.length === 0) {
    const errorMsg = "没有为有限选择节点配置有效的输出选项端口。";
    console.warn(`${logPrefix} ${errorMsg}`);
    return {
      outputs: {},
      executionDetails: { lastRunError: errorMsg, outputContent: errorMsg, lastExecutionContextId: executionContextId },
    };
  }
  
  const toolNameForFiniteChoice = 'select_from_finite_options_tool'; 
  const registeredTool = AVAILABLE_AI_TOOLS.find(t => t.declaration.name === toolNameForFiniteChoice);

  if (!registeredTool) {
    executionErrorForNode = `AI tool '${toolNameForFiniteChoice}' not found. Cannot execute finite choice selection.`;
    console.warn(`${logPrefix} ${executionErrorForNode}`);
    // Fall through to return error details at the end.
  }
  
  const dynamicToolDeclaration: GeminiFunctionDeclaration | null = registeredTool ? JSON.parse(JSON.stringify(registeredTool.declaration)) : null;
  if (dynamicToolDeclaration && dynamicToolDeclaration.parameters?.properties?.[registeredTool!.expectedArgName]?.items) {
      dynamicToolDeclaration.parameters.properties[registeredTool!.expectedArgName].items.enum = availableChoices;
  } else if (dynamicToolDeclaration) { // Tool exists but structure is wrong
     executionErrorForNode = `Tool '${toolNameForFiniteChoice}' definition is missing expected structure for dynamic enum.`;
     console.warn(`${logPrefix} ${executionErrorForNode}`);
  }
  
  const availableChoicesAsString = JSON.stringify(availableChoices);
  let promptTemplate = node.data?.defaultPrompt ?? nodeDefinition.defaultData?.defaultPrompt ?? "请根据以下内容：\n{{user_input}}\n\n从以下选项中选择最合适的答案：{{available_choices_as_string}}";
  promptTemplate = promptTemplate.replace(/\{\{\s*available_choices_as_string\s*\}\}/g, availableChoicesAsString);
  const currentUserPrompt = inputs.user_input ?? ''; 
  const promptToUseForService = processTemplateString(promptTemplate, { ...inputs, user_input: currentUserPrompt });

  const resolvedAiConfig = resolveAiServiceConfig(inputs, node, nodeDefinition);
  
  let finalAiConfig: AiServiceConfig & { model: string; tools?: Tool[]; history?: GeminiHistoryItem[] | OpenAIMessageForHistory[] } | null = null;

  // History processing
  const historyInJson = inputs.history_in as string | undefined;
  let parsedInputHistory: GeminiHistoryItem[] | OpenAIMessageForHistory[] | null = null;
  if (historyInJson && !executionErrorForNode) { // Only process if no prior error
    parsedInputHistory = aiHistoryUtils.parseHistoryInput(historyInJson);
    if (!parsedInputHistory) {
      executionErrorForNode = "无效的历史记录输入格式。";
    }
  }
  let historyForServiceCall: GeminiHistoryItem[] | OpenAIMessageForHistory[] = [];
  const effectiveApiFormat = resolvedAiConfig.apiFormat || (PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === (resolvedAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID))?.format || 'gemini');

  if (parsedInputHistory && !executionErrorForNode) {
    if (effectiveApiFormat === 'gemini') {
      historyForServiceCall = aiHistoryUtils.isGeminiHistory(parsedInputHistory)
        ? parsedInputHistory
        : aiHistoryUtils.convertToGeminiFormat(parsedInputHistory as OpenAIMessageForHistory[]);
    } else { // openai
      historyForServiceCall = aiHistoryUtils.isOpenAIHistory(parsedInputHistory)
        ? parsedInputHistory
        : aiHistoryUtils.convertToOpenAIFormat(parsedInputHistory as GeminiHistoryItem[]);
    }
  }

  let serviceCallPayload: string | GeminiContent[] | OpenAIChatMessage[];
  let userMessageForOutputHistory: GeminiHistoryItem | OpenAIMessageForHistory;


  if (services.getMergedModelConfigs && !executionErrorForNode) {
      const allConfigs = services.getMergedModelConfigs();
      const groupId = resolvedAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;
      const groupDetails = getFullAiConfigFromGroupIdUtil(groupId, allConfigs);
      if (groupDetails) {
          finalAiConfig = {
              ...resolvedAiConfig,
              model: resolvedAiConfig.model || groupDetails.model,
              apiFormat: effectiveApiFormat, // Use already resolved effectiveApiFormat
              apiUrl: resolvedAiConfig.apiUrl || groupDetails.apiUrl,
              apiKey: resolvedAiConfig.apiKey !== undefined ? resolvedAiConfig.apiKey : groupDetails.apiKey,
              aiModelConfigGroupId: groupId,
              tools: dynamicToolDeclaration ? [{ functionDeclarations: [dynamicToolDeclaration] }] : undefined
          };
           if (finalAiConfig.tools && registeredTool?.systemInstructionSuffix && registeredTool.systemInstructionSuffix.trim() !== '') {
              finalAiConfig.systemInstruction = `${finalAiConfig.systemInstruction || "You are a helpful assistant."}\n${registeredTool.systemInstructionSuffix.trim()}`;
          }

          if (finalAiConfig.apiFormat === 'gemini') {
              const geminiContents: GeminiContent[] = (historyForServiceCall as GeminiHistoryItem[]).map(item => ({ role: item.role, parts: item.parts }));
              geminiContents.push({ role: "user", parts: [{ text: promptToUseForService }] });
              serviceCallPayload = geminiContents;
              userMessageForOutputHistory = { role: "user", parts: [{ text: promptToUseForService }] };
          } else { // openai
              const openAiMessages: OpenAIChatMessage[] = (historyForServiceCall as OpenAIMessageForHistory[]).map(item => ({ role: item.role, content: item.content }));
              openAiMessages.push({ role: "user", content: promptToUseForService });
              serviceCallPayload = openAiMessages;
              userMessageForOutputHistory = { role: "user", content: promptToUseForService };
          }

      } else {
        executionErrorForNode = `AI模型配置组 '${groupId}' 未找到。`;
      }
  } else if (!executionErrorForNode) {
    executionErrorForNode = "无法访问AI模型配置服务。";
  }


  let selectedChoicesByAI: string[] = [];
  const portSpecificErrorsForExecutor: { portId: string; message: string }[] = [];
  let serviceTokenCount: number | null = null;
  let serviceThoughts: string | null = null;
  let aiResponseTextForHistory: string | null = null;

  if (!executionErrorForNode && services.geminiService?.generateText && finalAiConfig) {
    const genTextResult = await services.geminiService.generateText(serviceCallPayload! as any, finalAiConfig);
    
    serviceTokenCount = genTextResult?.tokenCount ?? null;
    serviceThoughts = genTextResult?.thoughts ?? null;
    if (genTextResult?.error) executionErrorForNode = genTextResult.error;
    
    let extractedChoices: string[] | null = null;

    if (genTextResult?.response) {
      if ('functionCalls' in genTextResult.response && genTextResult.response.functionCalls && genTextResult.response.functionCalls.length > 0) {
        const geminiFuncCall = genTextResult.response.functionCalls.find(fc => fc.name === toolNameForFiniteChoice);
        if (geminiFuncCall?.args && Array.isArray(geminiFuncCall.args[registeredTool!.expectedArgName])) {
          extractedChoices = geminiFuncCall.args[registeredTool!.expectedArgName] as string[];
        } else {
          executionErrorForNode = `Gemini tool call '${toolNameForFiniteChoice}' did not return expected array for '${registeredTool!.expectedArgName}'.`;
        }
        aiResponseTextForHistory = JSON.stringify(geminiFuncCall?.args);
      } else if ('choices' in genTextResult.response && Array.isArray(genTextResult.response.choices) && genTextResult.response.choices.length > 0) {
        const message = genTextResult.response.choices[0].message;
        if (message.tool_calls && message.tool_calls.length > 0) {
          const openAiToolCall = message.tool_calls.find(tc => tc.function.name === toolNameForFiniteChoice);
          if (openAiToolCall) {
            try {
              const argsObject = JSON.parse(openAiToolCall.function.arguments);
              if (argsObject && Array.isArray(argsObject[registeredTool!.expectedArgName])) {
                extractedChoices = argsObject[registeredTool!.expectedArgName] as string[];
              } else {
                executionErrorForNode = `OpenAI tool call '${toolNameForFiniteChoice}' did not return expected array for '${registeredTool!.expectedArgName}'. Args: ${openAiToolCall.function.arguments}`;
              }
              aiResponseTextForHistory = openAiToolCall.function.arguments; 
            } catch (e) {
              executionErrorForNode = `Failed to parse arguments for OpenAI tool call '${toolNameForFiniteChoice}': ${e instanceof Error ? e.message : String(e)}. Args: ${openAiToolCall.function.arguments}`;
              aiResponseTextForHistory = openAiToolCall.function.arguments;
            }
          } else {
             executionErrorForNode = "AI did not call the expected tool for selection.";
             aiResponseTextForHistory = message.content;
          }
        } else {
            executionErrorForNode = "AI response did not contain tool calls for selection.";
            aiResponseTextForHistory = message.content;
        }
      } else {
        executionErrorForNode = "AI response format not recognized for tool call extraction.";
        // Safely access .text if it's a Gemini response, otherwise use a placeholder or stringify
        if ('text' in genTextResult.response && typeof genTextResult.response.text === 'string') {
            aiResponseTextForHistory = genTextResult.response.text;
        } else {
            aiResponseTextForHistory = "[Unrecognized AI Response Content for History]";
            if (typeof genTextResult.response === 'object' && genTextResult.response !== null) {
                try {
                    aiResponseTextForHistory = JSON.stringify(genTextResult.response);
                } catch (e) { /* ignore */ }
            } else if (typeof genTextResult.response === 'string') {
                aiResponseTextForHistory = genTextResult.response;
            }
        }
      }
    } else if (!executionErrorForNode) {
        executionErrorForNode = "AI service did not return a response.";
    }
    
    if (extractedChoices) {
        selectedChoicesByAI = extractedChoices.filter(choice => availableChoices.includes(choice));
        if (selectedChoicesByAI.length !== extractedChoices.length) {
            const invalidChoices = extractedChoices.filter(choice => !availableChoices.includes(choice));
            portSpecificErrorsForExecutor.push({ portId: "user_input", message: `AI selected invalid options: ${invalidChoices.join(', ')}.`});
            if (!executionErrorForNode) executionErrorForNode = "AI选择了一些无效选项。";
        }
        if (selectedChoicesByAI.length === 0 && extractedChoices.length > 0 && !executionErrorForNode) {
            executionErrorForNode = "AI选择的选项均无效。";
        }
    } else if (!executionErrorForNode) {
      executionErrorForNode = "AI未能选择任何选项。";
    }

  } else if (!executionErrorForNode) {
    executionErrorForNode = finalAiConfig ? "AI service (generateText) not available." : "AI configuration could not be resolved.";
  }


  const executionDetails: NodeExecutionState['executionDetails'] & { portSpecificErrors?: { portId: string; message: string }[] } = {
    tokenCount: serviceTokenCount,
    thoughts: serviceThoughts,
    outputContent: executionErrorForNode ? `错误: ${executionErrorForNode}` : `AI选择: ${JSON.stringify(selectedChoicesByAI)}`,
    lastRunError: executionErrorForNode,
    portSpecificErrors: portSpecificErrorsForExecutor.length > 0 ? portSpecificErrorsForExecutor : undefined,
    lastExecutionContextId: executionContextId,
  };

  const outputsMap: Record<string, any> = {};
  selectedChoicesByAI.forEach(choice => {
    const matchingPort = node.outputs.find(p => p.label === choice && node.data?.portConfigs?.[p.id]?.isChoiceOption);
    if (matchingPort) {
      outputsMap[matchingPort.id] = { flowSignal: true };
    } else {
      console.warn(`${logPrefix} AI selected choice '${choice}', but corresponding output port not found or not configured as a choice option on node.`);
    }
  });

  // Construct output history
  let outputHistoryInitial = [...historyForServiceCall];
  
  if (effectiveApiFormat === 'gemini') {
    (outputHistoryInitial as GeminiHistoryItem[]).push(userMessageForOutputHistory as GeminiHistoryItem);
    if (aiResponseTextForHistory !== null) {
      (outputHistoryInitial as GeminiHistoryItem[]).push({ role: "model", parts: [{ text: aiResponseTextForHistory }] });
    }
  } else { // openai
    (outputHistoryInitial as OpenAIMessageForHistory[]).push(userMessageForOutputHistory as OpenAIMessageForHistory);
    if (aiResponseTextForHistory !== null) {
      (outputHistoryInitial as OpenAIMessageForHistory[]).push({ role: "assistant", content: aiResponseTextForHistory });
    }
  }
  outputsMap['history_out'] = JSON.stringify(outputHistoryInitial);


  const flowEndPortDef = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  if (flowEndPortDef) {
    outputsMap[flowEndPortDef.id] = {
      flowSignal: true,
      error: !!executionErrorForNode,
      errorMessage: executionErrorForNode,
    };
  } else {
     console.warn(`${logPrefix} 'flow_end' port not found on node.`);
  }
  
  return { outputs: outputsMap, executionDetails };
};

export default executeFiniteChoiceNode;
