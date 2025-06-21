
import {
  Node,
  WorkflowServices,
  NodeTypeDefinition,
  AiServiceConfig,
  NodeExecutionState,
  GeminiFunctionDeclaration,
  GeminiServiceFunctionCallResult,
  PortDataType,
  Tool, 
  OpenAIToolCall, 
  ModelConfigGroup, 
  EditableAiModelConfig, 
  RegisteredAiTool, 
} from '../../../types'; 
import { processTemplateString } from '../../execution/engine/NodeExecutionEngine'; 
import { DEFAULT_ENV_GEMINI_CONFIG_ID, PREDEFINED_MODEL_CONFIG_GROUPS } from '../../../globalModelConfigs'; 
import { AVAILABLE_AI_TOOLS } from '../../ai/tools/availableAiTools'; 

export const getFullAiConfigFromGroupId = (
  groupId: string,
  allConfigs: Array<ModelConfigGroup | EditableAiModelConfig>
): { model: string; apiFormat: 'gemini' | 'openai'; apiUrl?: string; apiKey?: string } | null => {
  const groupDetails = allConfigs.find(g => g.id === groupId);
  if (!groupDetails) {
    console.warn(`[getFullAiConfigFromGroupId] Config group with ID '${groupId}' not found.`);
    return null;
  }

  let model: string;
  let apiFormat: 'gemini' | 'openai';
  let apiUrl: string | undefined;
  let apiKey: string | undefined;

  if ('defaultModel' in groupDetails) { 
    model = groupDetails.defaultModel;
    apiFormat = groupDetails.format;
    apiUrl = groupDetails.apiUrl;
    if (groupDetails.id !== DEFAULT_ENV_GEMINI_CONFIG_ID) {
        const editableCounterpart = allConfigs.find(c => c.id === groupDetails.id && !('defaultModel' in c)) as EditableAiModelConfig | undefined;
        apiKey = editableCounterpart?.apiKey;
    }
  } else { 
    model = groupDetails.model;
    apiFormat = groupDetails.format;
    apiUrl = groupDetails.apiUrl;
    apiKey = groupDetails.apiKey;
  }
  return { model, apiFormat, apiUrl, apiKey };
};


export const resolveAiServiceConfig = (
  inputs: Record<string, any>,
  node: Node,
  nodeDefinition?: NodeTypeDefinition,
): AiServiceConfig & { model: string } => { 
  
  const inputAiConfig = inputs?.ai_config_in as AiServiceConfig | undefined;
  const nodeDataAiConfig = node.data?.aiConfig as AiServiceConfig | undefined;
  const definitionAiConfig = nodeDefinition?.defaultData?.aiConfig as AiServiceConfig | undefined;

  // Prioritize core model/API fields from inputAiConfig
  const aiModelConfigGroupId = inputAiConfig?.aiModelConfigGroupId ?? nodeDataAiConfig?.aiModelConfigGroupId ?? definitionAiConfig?.aiModelConfigGroupId ?? DEFAULT_ENV_GEMINI_CONFIG_ID;
  const model = inputAiConfig?.model ?? nodeDataAiConfig?.model ?? definitionAiConfig?.model ?? "gemini-2.5-flash-preview-04-17";
  const apiFormat = inputAiConfig?.apiFormat ?? nodeDataAiConfig?.apiFormat ?? definitionAiConfig?.apiFormat;
  const apiUrl = inputAiConfig?.apiUrl ?? nodeDataAiConfig?.apiUrl ?? definitionAiConfig?.apiUrl;
  const apiKey = inputAiConfig?.apiKey ?? nodeDataAiConfig?.apiKey ?? definitionAiConfig?.apiKey;


  const resolvedConfigFromSources: Record<string, any> = { thinkingConfig: {} };
  const configSourcesForNonCore = [
    inputAiConfig || {},       // Input config for non-core params too
    nodeDataAiConfig || {},   
    definitionAiConfig || {}, 
  ];

  const nonCoreAiParams = ['systemInstruction', 'temperature', 'topP', 'topK'];
  nonCoreAiParams.forEach(key => {
    for (const source of configSourcesForNonCore) {
      if (source[key] !== undefined) {
        if (key === 'systemInstruction' && source === inputAiConfig && typeof source.systemInstruction === 'string') {
          resolvedConfigFromSources[key] = processTemplateString(source.systemInstruction, inputs);
        } else {
          resolvedConfigFromSources[key] = source[key];
        }
        break; 
      }
    }
  });

  const thinkingConfigKeys = ['thinkingBudget', 'includeThoughts'];
  for (const source of configSourcesForNonCore) {
    if (source.thinkingConfig) {
      thinkingConfigKeys.forEach(key => {
        if (source.thinkingConfig[key] !== undefined && resolvedConfigFromSources.thinkingConfig[key] === undefined) {
          resolvedConfigFromSources.thinkingConfig[key] = source.thinkingConfig[key];
        }
      });
    }
  }
  
  if (resolvedConfigFromSources.temperature !== undefined) resolvedConfigFromSources.temperature = Number(resolvedConfigFromSources.temperature);
  if (resolvedConfigFromSources.topP !== undefined) resolvedConfigFromSources.topP = Number(resolvedConfigFromSources.topP);
  if (resolvedConfigFromSources.topK !== undefined) resolvedConfigFromSources.topK = Number(resolvedConfigFromSources.topK);

  if (resolvedConfigFromSources.thinkingConfig.thinkingBudget !== undefined && resolvedConfigFromSources.thinkingConfig.thinkingBudget !== null && resolvedConfigFromSources.thinkingConfig.thinkingBudget !== '') {
    resolvedConfigFromSources.thinkingConfig.thinkingBudget = Number(resolvedConfigFromSources.thinkingConfig.thinkingBudget);
    if (isNaN(resolvedConfigFromSources.thinkingConfig.thinkingBudget) || resolvedConfigFromSources.thinkingConfig.thinkingBudget < 0) { 
      delete resolvedConfigFromSources.thinkingConfig.thinkingBudget;
    }
  } else {
    delete resolvedConfigFromSources.thinkingConfig.thinkingBudget; 
  }
  resolvedConfigFromSources.thinkingConfig.includeThoughts = !!resolvedConfigFromSources.thinkingConfig.includeThoughts;
  
  let baseSystemInstruction = resolvedConfigFromSources.systemInstruction;
  if (!baseSystemInstruction || String(baseSystemInstruction).trim() === '') {
    // Fallback through the hierarchy for systemInstruction if not found in nonCoreAiParams loop
    baseSystemInstruction = inputAiConfig?.systemInstruction ?? nodeDataAiConfig?.systemInstruction ?? definitionAiConfig?.systemInstruction ?? "You are a helpful assistant.";
  }


  const finalConfigObject: AiServiceConfig & { model: string } = {
    aiModelConfigGroupId, 
    model, 
    ...(apiFormat && { apiFormat }),
    ...(apiUrl && { apiUrl }),
    ...(apiKey && { apiKey }), // apiKey can be undefined if using ENV group or not set
    ...(baseSystemInstruction && { systemInstruction: String(baseSystemInstruction).trim() }),
    ...(resolvedConfigFromSources.temperature !== undefined && { temperature: resolvedConfigFromSources.temperature }),
    ...(resolvedConfigFromSources.topP !== undefined && { topP: resolvedConfigFromSources.topP }),
    ...(resolvedConfigFromSources.topK !== undefined && { topK: resolvedConfigFromSources.topK }),
    thinkingConfig: {
      ...(resolvedConfigFromSources.thinkingConfig.thinkingBudget !== undefined && { thinkingBudget: resolvedConfigFromSources.thinkingConfig.thinkingBudget }),
      ...(resolvedConfigFromSources.thinkingConfig.includeThoughts === true && { includeThoughts: true }),
    }
  };
  
  if (Object.keys(finalConfigObject.thinkingConfig || {}).length === 0) {
    delete finalConfigObject.thinkingConfig;
  }
  
  return finalConfigObject;
};


export const resolvePrimaryAiInput = (
  inputs: Record<string, any>,
  node: Node,
  nodeDefinition: NodeTypeDefinition | undefined,
  primaryInputPortId: string,
  dataFieldForDefault: string,
  fallbackValue: string
): string => {
  let resolvedInput: string;

  if (typeof inputs?.[primaryInputPortId] === 'string' && inputs[primaryInputPortId].trim() !== '') {
    resolvedInput = processTemplateString(inputs[primaryInputPortId], inputs);
  } else if (node.data && typeof node.data[dataFieldForDefault] === 'string' && node.data[dataFieldForDefault].trim() !== '') {
    resolvedInput = node.data[dataFieldForDefault];
  } else if (nodeDefinition?.defaultData && typeof nodeDefinition.defaultData[dataFieldForDefault] === 'string' && nodeDefinition.defaultData[dataFieldForDefault].trim() !== '') {
    resolvedInput = nodeDefinition.defaultData[dataFieldForDefault];
  } else {
    resolvedInput = fallbackValue;
  }
  return resolvedInput;
};

interface ExecuteAiOperationParams {
  node: Node;
  inputs: Record<string, any>;
  services: WorkflowServices;
  executionContextId?: string;
  nodeDefinition: NodeTypeDefinition;
  promptToUse: string; 
  aiConfig: AiServiceConfig & { model: string; tools?: Tool[] }; 
  processExtractedData: (
    extractedData: any,
    funcDeclName: string | null, 
    expectedArgName: string | null 
  ) => { result: any; error?: string };
  outputPortIdForResult: string;
  outputPortIdForAiConfig?: string;
  outputPortIdForFlowEnd: string;
}


export const executeAiOperation = async ({
  node,
  inputs,
  services,
  executionContextId,
  nodeDefinition,
  promptToUse,      
  aiConfig,         
  processExtractedData,
  outputPortIdForResult,
  outputPortIdForAiConfig,
  outputPortIdForFlowEnd,
}: ExecuteAiOperationParams): Promise<{
  outputs: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'] & { portSpecificErrors?: { portId: string; message: string }[] };
}> => {
  const logPrefix = `[CommonAIUtil Node:${node.id}]`;
  
  let resultForOutputPort: any;
  let executionErrorForNode: string | undefined = undefined;
  const portSpecificErrorsForExecutor: { portId: string; message: string }[] = [];
  let serviceTokenCount: number | null = null;
  let serviceThoughts: string | null = null;
  let processedResult: { result: any; error?: string };

  const functionToCall = (aiConfig as AiServiceConfig & { tools?: Tool[] }).tools?.[0]?.functionDeclarations?.[0] ?? null;
  const expectedFunctionArgName = functionToCall ? (AVAILABLE_AI_TOOLS.find(t => t.declaration.name === functionToCall.name)?.expectedArgName || null) : null;


  if (services.geminiService) {
    if (functionToCall && expectedFunctionArgName && services.geminiService.callGeminiWithFunction && aiConfig.apiFormat === 'gemini') {
      const serviceResult = await services.geminiService.callGeminiWithFunction(
        promptToUse, aiConfig, functionToCall as GeminiFunctionDeclaration, expectedFunctionArgName, logPrefix
      );
      serviceTokenCount = serviceResult.tokenCount ?? null;
      serviceThoughts = serviceResult.thoughts ?? null;
      if (serviceResult.errorMessage) executionErrorForNode = serviceResult.errorMessage;
      processedResult = processExtractedData(serviceResult.extractedData, functionToCall.name, expectedFunctionArgName);

    } else if (services.geminiService.generateText) {
      const genTextResult = await services.geminiService.generateText(promptToUse, aiConfig); 
      
      serviceTokenCount = genTextResult?.tokenCount ?? null;
      serviceThoughts = genTextResult?.thoughts ?? null;
      if (genTextResult?.error) executionErrorForNode = genTextResult.error;
      
      let directTextOutput: any = null; 
      let openAiToolCalls: OpenAIToolCall[] | undefined = undefined;

      if (genTextResult?.response) {
          if ('text' in genTextResult.response && typeof genTextResult.response.text === 'string') {
            directTextOutput = genTextResult.response.text;
          } else if ('functionCalls' in genTextResult.response && genTextResult.response.functionCalls && genTextResult.response.functionCalls.length > 0) {
            const geminiFuncCall = genTextResult.response.functionCalls[0];
            if (geminiFuncCall.args && expectedFunctionArgName && geminiFuncCall.args[expectedFunctionArgName] !== undefined) {
                directTextOutput = geminiFuncCall.args[expectedFunctionArgName];
            } else {
                directTextOutput = `Gemini tool call to '${geminiFuncCall.name}' missing expected arg.`;
            }
          } else if ('choices' in genTextResult.response && Array.isArray(genTextResult.response.choices) && genTextResult.response.choices.length > 0) {
            const message = genTextResult.response.choices[0].message;
            if (message.tool_calls && message.tool_calls.length > 0) {
              openAiToolCalls = message.tool_calls;
              const firstToolCall = openAiToolCalls[0];
              const toolArgs = JSON.parse(firstToolCall.function.arguments);
              if (toolArgs && expectedFunctionArgName && toolArgs[expectedFunctionArgName] !== undefined) {
                  directTextOutput = toolArgs[expectedFunctionArgName];
              } else {
                  directTextOutput = `OpenAI tool call to '${firstToolCall.function.name}' missing expected arg or arg mismatch.`;
              }
            } else {
                directTextOutput = message.content ?? null;
            }
          }
      }
      const funcNameForProcessing = functionToCall?.name || (openAiToolCalls ? openAiToolCalls[0].function.name : null);
      processedResult = processExtractedData(directTextOutput, funcNameForProcessing, expectedFunctionArgName);

    } else {
      executionErrorForNode = "AI service methods not available.";
      processedResult = { result: `Error: ${executionErrorForNode}`, error: executionErrorForNode };
    }
  } else {
    executionErrorForNode = "AI service not available.";
    processedResult = { result: `Error: ${executionErrorForNode}`, error: executionErrorForNode };
  }
  
  resultForOutputPort = processedResult.result;
  if (processedResult.error && !executionErrorForNode) {
    executionErrorForNode = processedResult.error;
  }
  if (processedResult.error) {
    portSpecificErrorsForExecutor.push({ portId: outputPortIdForResult, message: processedResult.error });
  }

  const executionDetails: NodeExecutionState['executionDetails'] & { portSpecificErrors?: { portId: string; message: string }[] } = {
    tokenCount: serviceTokenCount,
    thoughts: serviceThoughts,
    outputContent: typeof resultForOutputPort === 'string' ? resultForOutputPort : JSON.stringify(resultForOutputPort),
    lastRunError: executionErrorForNode,
    portSpecificErrors: portSpecificErrorsForExecutor.length > 0 ? portSpecificErrorsForExecutor : undefined,
    lastExecutionContextId: executionContextId,
  };

  const outputsMap: Record<string, any> = {};
  const resultOutPortDef = node.outputs.find(p => p.id === outputPortIdForResult);
  
  if (resultOutPortDef) {
    outputsMap[resultOutPortDef.id] = resultForOutputPort;
  }

  if (outputPortIdForAiConfig) {
    const aiConfigOutPortDef = node.outputs.find(p => p.id === outputPortIdForAiConfig);
    if (aiConfigOutPortDef) {
      // Simplified output: only model group ID and actual model name
      const simplifiedConfigOutput: Partial<AiServiceConfig> = {
        aiModelConfigGroupId: aiConfig.aiModelConfigGroupId,
        model: aiConfig.model, // aiConfig.model is the actual model name used
      };
      if (executionErrorForNode) {
        simplifiedConfigOutput.error = executionErrorForNode;
      }
      outputsMap[aiConfigOutPortDef.id] = simplifiedConfigOutput;
    }
  }

  let flowEndPortDef = node.outputs.find(p => p.id === outputPortIdForFlowEnd && p.dataType === PortDataType.FLOW);
  if (!flowEndPortDef) flowEndPortDef = node.outputs.find(p => p.dataType === PortDataType.FLOW);

  if (flowEndPortDef) {
    outputsMap[flowEndPortDef.id] = {
      flowSignal: true,
      error: !!executionErrorForNode,
      errorMessage: executionErrorForNode,
    };
  }
  
  return { outputs: outputsMap, executionDetails };
};
