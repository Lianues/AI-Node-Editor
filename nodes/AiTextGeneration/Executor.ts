
import { Node, WorkflowServices, NodeTypeDefinition, NodeExecutionState, AiServiceConfig, RegisteredAiTool, ModelConfigGroup, EditableAiModelConfig, Tool, GeminiHistoryItem, OpenAIMessageForHistory, GeminiContent, OpenAIChatMessage } from '../../types'; 
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';
import { AVAILABLE_AI_TOOLS } from '../../features/ai/tools/availableAiTools';
import { executeAiOperation, resolvePrimaryAiInput, resolveAiServiceConfig, getFullAiConfigFromGroupId as getFullAiConfigFromGroupIdUtil } from '../../features/ai/execution/commonAiExecutorUtils'; 
import { DEFAULT_ENV_GEMINI_CONFIG_ID, PREDEFINED_MODEL_CONFIG_GROUPS } from '../../globalModelConfigs'; 
import * as aiHistoryUtils from '../../utils/aiHistoryUtils'; 
import { processTemplateString } from '../../features/execution/engine/NodeExecutionEngine'; // Added for system_instruction_in

export const executeAiTextGeneration = async (
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

  const outputPortIdForResult = 'result_out'; 
  const portToolConfigForNode = node.data?.portToolConfig || {};
  const specificPortConfig = portToolConfigForNode[outputPortIdForResult];
  let toolToUse: RegisteredAiTool | null = null;
  
  if (specificPortConfig?.useTool && specificPortConfig?.toolName) {
    const allTools = [...AVAILABLE_AI_TOOLS, ...(customTools || [])]; 
    const foundTool = allTools.find(t => t.declaration.name === specificPortConfig.toolName);
    if (foundTool) toolToUse = foundTool;
    else console.warn(`[AiTextGenerationExecutor] Configured tool '${specificPortConfig.toolName}' not found. Proceeding without a specific tool.`);
  }

  const processExtractedData = (
    extractedData: any,
    funcDeclName: string | null, 
    expectedArgName: string | null 
  ): { result: any; error?: string } => {
    if (funcDeclName && expectedArgName) { 
      if (typeof extractedData === 'string') return { result: extractedData };
      if (extractedData === null || extractedData === undefined) return { result: "", error: `AI service call for function '${funcDeclName}' returned no usable data for argument '${expectedArgName}'. Check prompt or model configuration.` };
      const outputPortDef = nodeDefinition.outputs.find(p => p.id === outputPortIdForResult);
      if (outputPortDef && outputPortDef.dataType === 'string' && typeof extractedData !== 'string') return { result: JSON.stringify(extractedData) };
      return { result: extractedData };
    } else { 
      if (typeof extractedData === 'string') return { result: extractedData };
      if (extractedData === null || extractedData === undefined) return { result: "", error: "AI service returned no direct text output."};
      return { result: JSON.stringify(extractedData) };
    }
  };
  
  const fallbackPrompt = nodeDefinition?.defaultData?.defaultPrompt || "Tell me a short story about a friendly robot.";
  let currentUserPrompt = resolvePrimaryAiInput(inputs, node, nodeDefinition, 'user_input', 'defaultPrompt', fallbackPrompt);

  // Initial resolution of AI config from node data, definition, or ai_config_in port
  const baseResolvedAiConfig = resolveAiServiceConfig(inputs, node, nodeDefinition);
  
  let finalAiConfigForOperation: (AiServiceConfig & { model: string; tools?: Tool[]; history?: GeminiHistoryItem[] | OpenAIMessageForHistory[] }) | null = null;
  let executionErrorForNode: string | undefined = undefined;

  // History processing
  const historyInJson = inputs.history_in as string | undefined;
  let parsedInputHistory: GeminiHistoryItem[] | OpenAIMessageForHistory[] | null = null;
  if (historyInJson) {
    parsedInputHistory = aiHistoryUtils.parseHistoryInput(historyInJson);
    if (!parsedInputHistory) {
      executionErrorForNode = "无效的历史记录输入格式。";
    }
  }
  let historyForServiceCall: GeminiHistoryItem[] | OpenAIMessageForHistory[] = [];
  const targetFormat = baseResolvedAiConfig.apiFormat || (PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === (baseResolvedAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID))?.format || 'gemini');
  
  if (parsedInputHistory && !executionErrorForNode) {
    if (targetFormat === 'gemini') {
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

  if (services.getMergedModelConfigs) {
    const allConfigs = services.getMergedModelConfigs();
    const groupId = baseResolvedAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;
    const groupDetails = getFullAiConfigFromGroupIdUtil(groupId, allConfigs);

    if (groupDetails) {
        finalAiConfigForOperation = {
            ...baseResolvedAiConfig, // Start with base resolved config
            model: baseResolvedAiConfig.model || groupDetails.model,
            apiFormat: targetFormat, // Use targetFormat derived earlier
            apiUrl: baseResolvedAiConfig.apiUrl || groupDetails.apiUrl,
            apiKey: baseResolvedAiConfig.apiKey !== undefined ? baseResolvedAiConfig.apiKey : groupDetails.apiKey,
            aiModelConfigGroupId: groupId,
        };

        // NEW: Override systemInstruction if system_instruction_in port is used
        const systemInstructionFromPort = inputs.system_instruction_in as string | undefined;
        if (systemInstructionFromPort && typeof systemInstructionFromPort === 'string' && systemInstructionFromPort.trim() !== '') {
          finalAiConfigForOperation.systemInstruction = processTemplateString(systemInstructionFromPort.trim(), inputs);
        }
        // If not overridden by system_instruction_in, finalAiConfigForOperation.systemInstruction will retain
        // the value from baseResolvedAiConfig (which could be from ai_config_in, node.data, or definition default).

        if (toolToUse) {
            finalAiConfigForOperation.tools = [{ functionDeclarations: [toolToUse.declaration] }];
            if (toolToUse.systemInstructionSuffix && toolToUse.systemInstructionSuffix.trim() !== '') {
                const baseInstruction = finalAiConfigForOperation.systemInstruction || "You are a helpful assistant.";
                finalAiConfigForOperation.systemInstruction = `${baseInstruction}\n${toolToUse.systemInstructionSuffix.trim()}`;
            }
        }

        if (finalAiConfigForOperation.apiFormat === 'gemini') {
            const geminiContents: GeminiContent[] = (historyForServiceCall as GeminiHistoryItem[]).map(item => ({ role: item.role, parts: item.parts }));
            geminiContents.push({ role: "user", parts: [{ text: currentUserPrompt }] });
            serviceCallPayload = geminiContents;
            userMessageForOutputHistory = { role: "user", parts: [{ text: currentUserPrompt }] };
        } else { // openai
            const openAiMessages: OpenAIChatMessage[] = (historyForServiceCall as OpenAIMessageForHistory[]).map(item => ({ role: item.role, content: item.content }));
            openAiMessages.push({ role: "user", content: currentUserPrompt });
            serviceCallPayload = openAiMessages;
            userMessageForOutputHistory = { role: "user", content: currentUserPrompt };
        }

    } else {
      executionErrorForNode = `AI模型配置组 '${groupId}' 未找到。`;
    }
  } else if (!executionErrorForNode) { // Added check to prevent overwriting existing error
    executionErrorForNode = "无法访问AI模型配置服务。";
  }

  if (executionErrorForNode) {
     return { outputs: {}, executionDetails: { lastRunError: executionErrorForNode, outputContent: executionErrorForNode, lastExecutionContextId: executionContextId }};
  }
  
  const aiOperationResult = await executeAiOperation({
    node,
    inputs, 
    services,
    executionContextId,
    nodeDefinition,
    promptToUse: serviceCallPayload! as any, 
    aiConfig: finalAiConfigForOperation as AiServiceConfig & { model: string; tools?: Tool[] }, 
    processExtractedData,
    outputPortIdForResult: outputPortIdForResult,
    outputPortIdForAiConfig: 'ai_config_out',
    outputPortIdForFlowEnd: 'flow_end',
  });
  
  let outputHistoryInitial = [...historyForServiceCall];
  const aiResponseText = aiOperationResult.outputs[outputPortIdForResult];
  
  if (finalAiConfigForOperation?.apiFormat === 'gemini') {
    (outputHistoryInitial as GeminiHistoryItem[]).push(userMessageForOutputHistory as GeminiHistoryItem);
    if (aiResponseText !== undefined && aiResponseText !== null && typeof aiResponseText === 'string') {
      (outputHistoryInitial as GeminiHistoryItem[]).push({ role: "model", parts: [{ text: aiResponseText }] });
    }
  } else { // openai
    (outputHistoryInitial as OpenAIMessageForHistory[]).push(userMessageForOutputHistory as OpenAIMessageForHistory);
    if (aiResponseText !== undefined && aiResponseText !== null && typeof aiResponseText === 'string') {
      (outputHistoryInitial as OpenAIMessageForHistory[]).push({ role: "assistant", content: aiResponseText });
    }
  }
  
  const outputsWithHistory = {
    ...aiOperationResult.outputs,
    history_out: JSON.stringify(outputHistoryInitial),
  };

  return { outputs: outputsWithHistory, executionDetails: aiOperationResult.executionDetails };
};

export default executeAiTextGeneration;
