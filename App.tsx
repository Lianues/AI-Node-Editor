

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { vscodeDarkTheme } from './theme/vscodeDark';
import { ContextMenu } from './components/ContextMenu/ContextMenu';
import { useContextMenu } from './components/ContextMenu/useContextMenu';
import { useClipboard } from './features/clipboard/useClipboard';
// WorkflowExecutionManager will be provided by useAppOrchestration
import * as geminiService from './services/geminiService';
import { WorkflowServices, RegisteredAiTool, NodeTypeDefinition, Node, PortDataType, NodePort, Tool, AiServiceConfig, GenerateContentResponse as TypesGenerateContentResponse, OpenAIChatCompletion, OpenAIToolCall, EditableAiModelConfig, GeminiHistoryItem, OpenAIMessageForHistory, GeminiContent, OpenAIChatMessage } from './types'; 
import { useAppOrchestration } from './hooks/useAppOrchestration';
import { getStaticNodeDefinition } from './nodes'; 
import { useShortcutManager } from './features/shortcuts/useShortcutManager';
import { GlobalNotificationDisplay } from './components/shared/GlobalNotificationDisplay';
import { AiToolsViewer } from './components/AiToolsViewer/AiToolsViewer';
import CreateCustomAiNodeModal, { CustomAiNodeFormData, CustomPortConfig as ModalCustomAiPortConfig } from './components/Modals/CreateCustomAiNodeModal'; 
import FullScreenUiViewer from './components/Modals/FullScreenUiViewer'; 
import UniversalNodeRenderer from './features/nodes/components/UniversalNodeRenderer';
import BaseNodeInspector from './features/nodes/components/inspectors/BaseNodeInspector';
import { calculateNodeHeight } from './nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from './components/renderingConstants';
import { MainLayout } from './layout/MainLayout'; 
import { AVAILABLE_AI_TOOLS } from './features/ai/tools/availableAiTools';
import { getDefaultHexColorFromTailwind, getDefaultHexColorFromTailwindText } from './utils/colorUtils';
import { CUSTOM_UI_NODE_TYPE_KEY } from './nodes/CustomUiNode/Definition'; 
import { CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY } from './nodes/CustomDataProcessingNode/Definition'; 
import { executeCustomDataProcessingNode } from './nodes/CustomDataProcessingNode/Executor'; 
import CustomDataProcessingInspector from './nodes/CustomDataProcessingNode/Inspector'; 
import { GlobalSettingsModal } from './components/Modals/GlobalSettingsModal';
import { DEFAULT_ENV_GEMINI_CONFIG_ID, PREDEFINED_MODEL_CONFIG_GROUPS, ModelConfigGroup } from './globalModelConfigs';
import { initialEditableConfigsForService as defaultInitialEditableConfigs } from './components/Modals/GlobalSettingsModal/AiModelConfigSettings'; // Renamed for clarity
import * as aiHistoryUtils from './utils/aiHistoryUtils';
import { resolveAiServiceConfig as commonResolveAiServiceConfig, getFullAiConfigFromGroupId as commonGetFullAiConfigFromGroupId } from './features/ai/execution/commonAiExecutorUtils';


// This function will be passed to the WorkflowExecutionManager and then to individual node executors.
// It needs access to the live mergedModelConfigs.
const getFullAiConfigFromGroupId = (
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

  if ('defaultModel' in groupDetails) { // It's a ModelConfigGroup (predefined)
    model = groupDetails.defaultModel;
    apiFormat = groupDetails.format;
    apiUrl = groupDetails.apiUrl;
    // For predefined groups (except ENV_GEMINI), apiKey comes from associated editableConfig
    if (groupDetails.id !== DEFAULT_ENV_GEMINI_CONFIG_ID) {
        // Find the editable counterpart within the *live* allConfigs array
        const editableCounterpart = allConfigs.find(ec => ec.id === groupDetails.id && !('defaultModel' in ec)) as EditableAiModelConfig | undefined;
        apiKey = editableCounterpart?.apiKey; 
    }
    // For ENV_GEMINI, apiKey is handled by the service directly from process.env
  } else { // It's an EditableAiModelConfig (user-defined or editable predefined)
    model = groupDetails.model;
    apiFormat = groupDetails.format;
    apiUrl = groupDetails.apiUrl;
    apiKey = groupDetails.apiKey;
  }
  return { model, apiFormat, apiUrl, apiKey };
};


// Placeholder executor for custom AI nodes
const executePlaceholderCustomAiNode = async (
    node: Node, 
    inputs: Record<string, any>, 
    services: WorkflowServices & { getMergedModelConfigs?: () => Array<ModelConfigGroup | EditableAiModelConfig> }, 
    executionContextId?: string, 
    customToolsPassed?: RegisteredAiTool[]
) => {
  console.log(`Executing custom AI node: ${node.title}`, { inputs, data: node.data, customAiConfig: node.data?.customAiConfig, portToolConfig: node.data?.portToolConfig });
  
  let executionErrorForNode: string | undefined = undefined;
  const nodeDefinition = getStaticNodeDefinition(node.type); // Assuming custom AI nodes use a base static definition for defaults
  const aiConfigFromNode = node.data?.customAiConfig as (AiServiceConfig & { defaultPrompt?: string; aiModelConfigGroupId?: string });
  
  let generatedText = `来自 ${node.title} 的输出`;
  let toolsForServiceCall: Tool[] = [];
  let outputDataMap: Record<string, any> = {}; 
  const outputs: Record<string, any> = {};

  const allAvailableTools = [...AVAILABLE_AI_TOOLS, ...(customToolsPassed || [])];

  if (node.data?.portToolConfig) {
    for (const portId in node.data.portToolConfig) {
      const config = node.data.portToolConfig[portId];
      if (config.useTool && config.toolName) {
        const foundTool = allAvailableTools.find(t => t.declaration.name === config.toolName);
        if (foundTool) {
          toolsForServiceCall.push({ functionDeclarations: [foundTool.declaration as any] });
        } else {
          console.warn(`Custom AI Node ${node.title}: Tool '${config.toolName}' configured for port '${portId}' not found.`);
        }
      }
    }
  }

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
  
  // Resolve full AI config using common utility
  const resolvedNodeAiConfig = commonResolveAiServiceConfig(inputs, node, nodeDefinition);
  const effectiveApiFormat = resolvedNodeAiConfig.apiFormat || (PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === (resolvedNodeAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID))?.format || 'gemini');


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

  if (aiConfigFromNode && services.geminiService?.generateText && services.getMergedModelConfigs && !executionErrorForNode) {
    const promptFromInput = inputs.data_in; 
    const promptFromNodeData = aiConfigFromNode.defaultPrompt;
    
    const groupId = resolvedNodeAiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;
    const allConfigs = services.getMergedModelConfigs();
    const resolvedGroupConfig = commonGetFullAiConfigFromGroupId(groupId, allConfigs);

    if (!resolvedGroupConfig) {
        generatedText = `AI 错误: 未找到ID为 '${groupId}' 的模型配置组。`;
        executionErrorForNode = generatedText;
    } else {
        const modelForServiceCall = resolvedNodeAiConfig.model || resolvedGroupConfig.model; // Prioritize model from resolvedNodeAiConfig
        let currentUserPrompt = promptFromInput || promptFromNodeData || `使用模型 ${modelForServiceCall} 告诉我一些有趣的事情。`;
        
        if (typeof currentUserPrompt === 'string') {
            currentUserPrompt = currentUserPrompt.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, portId) => {
                const portValue = inputs[portId];
                if (portValue === undefined) return "";
                if (portValue === null) return "null";
                if (typeof portValue === 'string') return portValue;
                if (typeof portValue === 'number' || typeof portValue === 'boolean') return String(portValue);
                try { return JSON.stringify(portValue); } catch (e) { return `[Error serializing ${portId}]`;}
            });
        }
        
        // effectiveApiFormat already resolved above

        if (effectiveApiFormat === 'gemini') {
            const geminiContents: GeminiContent[] = (historyForServiceCall as GeminiHistoryItem[]).map(item => ({ role: item.role, parts: item.parts.map(p => ({text: p.text})) }));
            geminiContents.push({ role: "user", parts: [{ text: currentUserPrompt }] });
            serviceCallPayload = geminiContents;
            userMessageForOutputHistory = { role: "user", parts: [{ text: currentUserPrompt }] };
        } else { // openai
            const openAiMessages: OpenAIChatMessage[] = (historyForServiceCall as OpenAIMessageForHistory[]).map(item => ({ role: item.role, content: item.content }));
            openAiMessages.push({ role: "user", content: currentUserPrompt });
            serviceCallPayload = openAiMessages;
            userMessageForOutputHistory = { role: "user", content: currentUserPrompt };
        }

        try {
          const serviceCallConfig: AiServiceConfig = {
            aiModelConfigGroupId: groupId, 
            apiKey: resolvedNodeAiConfig.apiKey ?? resolvedGroupConfig.apiKey, // Prioritize resolved first
            apiUrl: resolvedNodeAiConfig.apiUrl ?? resolvedGroupConfig.apiUrl,
            apiFormat: effectiveApiFormat,
            model: modelForServiceCall,
            systemInstruction: resolvedNodeAiConfig.systemInstruction,
            temperature: resolvedNodeAiConfig.temperature,
            topP: resolvedNodeAiConfig.topP,
            topK: resolvedNodeAiConfig.topK,
            thinkingConfig: (resolvedNodeAiConfig.thinkingConfig?.thinkingBudget !== undefined || resolvedNodeAiConfig.thinkingConfig?.includeThoughts) ? {
                thinkingBudget: resolvedNodeAiConfig.thinkingConfig?.thinkingBudget,
                includeThoughts: resolvedNodeAiConfig.thinkingConfig?.includeThoughts,
            } : undefined,
          };
          if (toolsForServiceCall.length > 0) {
            (serviceCallConfig as any).tools = toolsForServiceCall; 
          }

          const result = await services.geminiService.generateText(serviceCallPayload, serviceCallConfig);
          
          let aiResponseTextForOutputHistory: string | null = null;

          if (result && result.response) {
            const responseData = result.response; 
            if ('functionCalls' in responseData && responseData.functionCalls && responseData.functionCalls.length > 0 && toolsForServiceCall.length > 0) { 
              const functionCall = responseData.functionCalls[0];
              const registeredTool = allAvailableTools.find(at => at.declaration.name === functionCall.name);
              const expectedArgName = registeredTool?.expectedArgName || 'generated_text';
              
              const outputPortForToolCall = node.outputs.find(op => 
                node.data?.portToolConfig?.[op.id]?.useTool && node.data?.portToolConfig?.[op.id]?.toolName === functionCall.name
              );
              let extractedData: any;
              if (functionCall.args && functionCall.args[expectedArgName] !== undefined) {
                extractedData = functionCall.args[expectedArgName];
              } else {
                extractedData = `AI 调用了工具 ${functionCall.name} 但未提供预期的参数 '${expectedArgName}'。原始参数: ${JSON.stringify(functionCall.args)}`;
              }
              if (outputPortForToolCall) outputDataMap[outputPortForToolCall.id] = extractedData;
              generatedText = String(extractedData); 
              aiResponseTextForOutputHistory = JSON.stringify(functionCall.args); // For history, use the full args
            } else if ('choices' in responseData && responseData.choices && typeof responseData.choices[0]?.message?.content === 'string') { // OpenAI direct text
               generatedText = responseData.choices[0].message.content;
               aiResponseTextForOutputHistory = generatedText;
            } else if ('choices' in responseData && responseData.choices && responseData.choices[0]?.message?.tool_calls && responseData.choices[0].message.tool_calls.length > 0) { // OpenAI tool call
                const toolCall: OpenAIToolCall = responseData.choices[0].message.tool_calls[0];
                const functionName = toolCall.function.name;
                const registeredTool = allAvailableTools.find(at => at.declaration.name === functionName);
                const expectedArgName = registeredTool?.expectedArgName || 'generated_text';
                const outputPortForToolCall = node.outputs.find(op => 
                    node.data?.portToolConfig?.[op.id]?.useTool && node.data?.portToolConfig?.[op.id]?.toolName === functionName
                );
                let extractedData: any;
                try {
                    const argsObject = JSON.parse(toolCall.function.arguments);
                    if (argsObject && argsObject[expectedArgName] !== undefined) extractedData = argsObject[expectedArgName];
                    else extractedData = `AI 调用了工具 ${functionName} 但未提供预期的参数 '${expectedArgName}'。原始参数: ${toolCall.function.arguments}`;
                    aiResponseTextForOutputHistory = toolCall.function.arguments; // For history, raw args string
                } catch (e) {
                    extractedData = `解析工具参数失败: ${e instanceof Error ? e.message : String(e)}. 原始参数: ${toolCall.function.arguments}`;
                    aiResponseTextForOutputHistory = toolCall.function.arguments;
                }
                if (outputPortForToolCall) outputDataMap[outputPortForToolCall.id] = extractedData;
                generatedText = String(extractedData); 
            } else if ('text' in responseData && typeof responseData.text === 'string') { // Gemini direct text
               generatedText = responseData.text;
               aiResponseTextForOutputHistory = generatedText;
            } else {
               generatedText = `AI 响应无效或格式无法识别。`;
               executionErrorForNode = generatedText;
            }
            
            let finalizedOutputHistory: GeminiHistoryItem[] | OpenAIMessageForHistory[];
            if (effectiveApiFormat === 'gemini') {
                const baseHistory = historyForServiceCall as GeminiHistoryItem[];
                const userMessage = userMessageForOutputHistory as GeminiHistoryItem;
                const modelMessagePart: GeminiHistoryItem[] = aiResponseTextForOutputHistory !== null
                    ? [{ role: "model", parts: [{ text: aiResponseTextForOutputHistory }] }]
                    : [];
                finalizedOutputHistory = [...baseHistory, userMessage, ...modelMessagePart];
            } else { // openai
                const baseHistory = historyForServiceCall as OpenAIMessageForHistory[];
                const userMessage = userMessageForOutputHistory as OpenAIMessageForHistory;
                const assistantMessagePart: OpenAIMessageForHistory[] = aiResponseTextForOutputHistory !== null
                    ? [{ role: "assistant", content: aiResponseTextForOutputHistory }]
                    : [];
                finalizedOutputHistory = [...baseHistory, userMessage, ...assistantMessagePart];
            }
            outputs.history_out = JSON.stringify(finalizedOutputHistory);

          } else if (result && result.error) {
            generatedText = `AI 错误: ${result.error}`;
            executionErrorForNode = generatedText;
          } else if (!result) {
            generatedText = `调用 AI 时出错: 未收到结果。`;
            executionErrorForNode = generatedText;
          } else {
            generatedText = `调用 AI 时出错: 响应无效。`;
            executionErrorForNode = generatedText;
          }
        } catch (e) {
          generatedText = `调用 AI 时出错: ${e instanceof Error ? e.message : String(e)}`;
          executionErrorForNode = generatedText;
        }
    }
  } else if (executionErrorForNode) { // If history parsing failed earlier
    generatedText = executionErrorForNode;
  }

  node.outputs.forEach(outputPort => {
    if (outputDataMap.hasOwnProperty(outputPort.id)) {
      outputs[outputPort.id] = outputDataMap[outputPort.id];
    } else if (outputPort.dataType === PortDataType.FLOW) {
      outputs[outputPort.id] = { flowSignal: true, error: !!executionErrorForNode, errorMessage: executionErrorForNode };
    } else if (outputPort.dataType === PortDataType.STRING && outputPort.id !== 'history_out') { // Don't override history_out
      outputs[outputPort.id] = generatedText;
    }
  });
  
  // Ensure flow_end is triggered if not already part of outputDataMap
  const flowEndPort = node.outputs.find(p => p.id === 'flow_end');
  if (flowEndPort && !outputs[flowEndPort.id]) {
     outputs[flowEndPort.id] = { flowSignal: true, error: !!executionErrorForNode, errorMessage: executionErrorForNode };
  }

  return { outputs };
};

const sanitizePortIdForNode = (label: string): string => {
  return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30) || `port_${Date.now()}`;
};


const App: React.FC = () => {
  const { menuConfig, openContextMenu, closeContextMenu } = useContextMenu();
  const clipboardControls = useClipboard();
  
  const [mouseWorldPosOnCanvas, setMouseWorldPosOnCanvas] = useState<{ x: number, y: number } | null>(null);
  const [isMKeyPressed, setIsMKeyPressed] = useState(false); 
  const [isAiToolsViewerOpen, setIsAiToolsViewerOpen] = useState(false);
  const [customTools, setCustomTools] = useState<RegisteredAiTool[]>([]);
  const [isCreateCustomAiNodeModalOpen, setIsCreateCustomAiNodeModalOpen] = useState(false);
  const [customNodeDefinitions, setCustomNodeDefinitions] = useState<NodeTypeDefinition[]>([]);

  const [isFullScreenUiViewerOpen, setIsFullScreenUiViewerOpen] = useState(false);
  const [fullScreenUiContent, setFullScreenUiContent] = useState('');
  const [fullScreenUiNodeId, setFullScreenUiNodeId] = useState<string | null>(null); 
  const [fullScreenUiContentHeight, setFullScreenUiContentHeight] = useState(300);
  const [fullScreenUiInputData, setFullScreenUiInputData] = useState<Record<string, any> | undefined>(undefined);
  const [previewedNodeId, setPreviewedNodeId] = useState<string | null>(null);
  const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);
  
  const [editableAiModelConfigs, setEditableAiModelConfigs] = useState<EditableAiModelConfig[]>(defaultInitialEditableConfigs);

  const mergedModelConfigs = useMemo(() => {
    const envGroup = PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === DEFAULT_ENV_GEMINI_CONFIG_ID);
    const otherPredefinedGroups = PREDEFINED_MODEL_CONFIG_GROUPS.filter(g => g.id !== DEFAULT_ENV_GEMINI_CONFIG_ID);
    
    const combined = [
        ...(envGroup ? [envGroup] : []),
        ...otherPredefinedGroups.map(pg => {
            const editableVersion = editableAiModelConfigs.find(ec => ec.id === pg.id);
            return editableVersion || { 
                id: pg.id,
                name: pg.name,
                format: pg.format,
                apiUrl: pg.apiUrl || (pg.format === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' : 'https://api.openai.com/v1/chat/completions'),
                apiKey: '', 
                model: pg.defaultModel,
                notes: pg.notes,
            } as unknown as EditableAiModelConfig;
        }),
        ...editableAiModelConfigs.filter(ec => !PREDEFINED_MODEL_CONFIG_GROUPS.some(pg => pg.id === ec.id)) 
    ];
    
    const uniqueMap = new Map<string, ModelConfigGroup | EditableAiModelConfig>();
    combined.forEach(item => {
        if (!uniqueMap.has(item.id) || editableAiModelConfigs.some(ec => ec.id === item.id)) {
            uniqueMap.set(item.id, item);
        }
    });
    return Array.from(uniqueMap.values());
  }, [editableAiModelConfigs]);


  const baseWorkflowServicesWithGetter = useMemo(() => ({
    geminiService: geminiService,
    getMergedModelConfigs: () => mergedModelConfigs, 
  }), [mergedModelConfigs]);



  const canvasRef = useRef<HTMLDivElement>(null);

  const getCanvasBoundingClientRect = useCallback(
    () => canvasRef.current?.getBoundingClientRect() ?? null,
    [] 
  );

  const getCombinedNodeDefinition = useCallback((type: string): NodeTypeDefinition | undefined => {
    const customDefFromState = customNodeDefinitions.find(def => def.type === type);
    if (customDefFromState) {
      // If it's a custom AI node (dynamically created by user), ensure its functions are correctly wired,
      // especially after import where they might be undefined.
      if (type.startsWith('custom_ai_node_')) {
        return {
          ...customDefFromState,
          renderer: UniversalNodeRenderer, 
          inspector: BaseNodeInspector,   
          executor: executePlaceholderCustomAiNode, 
        };
      }
      // For other types of custom nodes that might be registered (not currently the case for non-AI general custom nodes)
      // If such nodes existed and also needed dynamic function re-assignment, similar logic would be added here.
      return customDefFromState;
    }
    
    // Handle static types (including CUSTOM_UI_NODE and CUSTOM_DATA_PROCESSING_NODE)
    if (type === CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY) {
        const staticCustomDataNodeDef = getStaticNodeDefinition(type);
        if (staticCustomDataNodeDef) {
            return {
                ...staticCustomDataNodeDef,
                // Ensure executor/inspector are correctly assigned even if the static def had them optional
                // This ensures that if the static definition for some reason didn't have these (e.g. if they were optional in types),
                // they get correctly assigned here. For our current static defs, they are already set.
                executor: staticCustomDataNodeDef.executor || executeCustomDataProcessingNode,
                inspector: staticCustomDataNodeDef.inspector || CustomDataProcessingInspector,
            };
        }
    }
    // For CUSTOM_UI_NODE_TYPE_KEY, getStaticNodeDefinition should already return a complete definition
    // including its specific executor and inspector from nodes/CustomUiNode/index.ts.
    // Same for other built-in static types.
    return getStaticNodeDefinition(type);
  }, [customNodeDefinitions /* executePlaceholderCustomAiNode is stable and defined outside App component */]);
  
  const appOrchestration = useAppOrchestration({
    contextMenuControls: { openContextMenu, closeContextMenu, menuConfig },
    clipboardControls,
    getNodeDefinition: getCombinedNodeDefinition, 
    getCanvasBoundingClientRect,
    isMKeyPressed,
    baseWorkflowServices: baseWorkflowServicesWithGetter, 
    customTools,
    setCustomTools, 
    customNodeDefinitions,
    setCustomNodeDefinitions, 
    editableAiModelConfigs, 
    setEditableAiModelConfigs, 
  });

  useEffect(() => {
    const nodes = appOrchestration.editor.nodes;
    const nodesToUpdateHeight: Array<{ nodeId: string; updates: Partial<Node> }> = [];

    nodes.forEach(node => {
      if (node.type === CUSTOM_UI_NODE_TYPE_KEY) {
        const definition = getCombinedNodeDefinition(node.type);
        if (definition) {
          const currentCustomContentHeight = definition.customContentHeight ?? 0; 
          const currentCustomContentTitle = undefined; 
          const newCalculatedHeight = calculateNodeHeight(
            node.inputs,
            node.outputs,
            HEADER_HEIGHT,
            currentCustomContentHeight,
            currentCustomContentTitle 
          );
          if (node.height !== newCalculatedHeight) {
            nodesToUpdateHeight.push({ nodeId: node.id, updates: { height: newCalculatedHeight } });
          }
        }
      }
    });

    if (nodesToUpdateHeight.length > 0) {
      appOrchestration.editor.updateNodesWithNewProperties(nodesToUpdateHeight);
    }
  }, [appOrchestration.editor.nodes, getCombinedNodeDefinition, appOrchestration.editor.updateNodesWithNewProperties]);


  useEffect(() => {
    const isInputActive = () => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || activeElement.hasAttribute('contenteditable');
      }
      return false;
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm' && !isInputActive() && !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) {
        setIsMKeyPressed(true);
      }
      if (event.key === 'Escape') {
        if (isAiToolsViewerOpen) closeAiToolsViewer();
        if (isCreateCustomAiNodeModalOpen) closeCreateCustomAiNodeModal();
        if (isFullScreenUiViewerOpen) closeFullScreenUiViewer(); 
        if (isGlobalSettingsModalOpen) closeGlobalSettingsModal();
      }
    };
    const handleGlobalKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm') {
        setIsMKeyPressed(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keyup', handleGlobalKeyUp);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [isAiToolsViewerOpen, isCreateCustomAiNodeModalOpen, isFullScreenUiViewerOpen, isGlobalSettingsModalOpen]);


  useEffect(() => {
    if (!previewedNodeId) {
      return;
    }
  
    const node = appOrchestration.editor.nodes.find(n => n.id === previewedNodeId);
    const newReceivedInputs = node?.data?.lastReceivedInputs;
  
    if (JSON.stringify(newReceivedInputs) !== JSON.stringify(fullScreenUiInputData)) {
      setFullScreenUiInputData(newReceivedInputs);
    }
  }, [previewedNodeId, appOrchestration.editor.nodes, fullScreenUiInputData]);

  useEffect(() => {
    if (appOrchestration.execution) {
      (window as any).aiStudioBridge = {
        sendOutput: (nodeId: string, portId: string, data: any) => {
          console.log('[aiStudioBridge] sendOutput called with raw data:', { nodeId, portId, data });
          let processedData = data;
          if (typeof data === 'object' && data !== null) {
            try {
              processedData = JSON.stringify(data);
              console.log('[aiStudioBridge] Data was object, stringified to:', processedData);
            } catch (e) {
              console.error('[aiStudioBridge] Failed to stringify object data:', e, 'Sending as is.');
            }
          }
          appOrchestration.execution.triggerCustomNodeOutput(nodeId, portId, processedData);
        },
      };
    }
    return () => {
      delete (window as any).aiStudioBridge;
    };
  }, [appOrchestration.execution]);


  const shortcutDependencies = useMemo(() => ({ 
    primarySelectedNodeId: appOrchestration.editor.primarySelectedNodeId, 
    selectedNodeIds: appOrchestration.editor.selectedNodeIds, 
    selectedConnectionId: appOrchestration.editor.selectedConnectionId,
    appHandleCopyNode: appOrchestration.editor.appHandleCopyNode,
    appHandleCutNode: appOrchestration.editor.appHandleCutNode,
    appHandleDelete: appOrchestration.editor.appHandleDelete,
    appHandlePasteNode: appOrchestration.editor.appHandlePasteNode,
    canPaste: appOrchestration.editor.canPaste,
    mouseWorldPosOnCanvas: mouseWorldPosOnCanvas,
    canUndo: appOrchestration.core.canUndo, 
    appHandleUndo: appOrchestration.core.handleUndo, 
    canRedo: appOrchestration.core.canRedo, 
    appHandleRedo: appOrchestration.core.handleRedo,
    appHandleSaveFile: appOrchestration.saveCoordinator.saveActivePage, // Added save handler
  }), [
    appOrchestration.editor.primarySelectedNodeId,
    appOrchestration.editor.selectedNodeIds,
    appOrchestration.editor.selectedConnectionId,
    appOrchestration.editor.appHandleCopyNode,
    appOrchestration.editor.appHandleCutNode,
    appOrchestration.editor.appHandleDelete,
    appOrchestration.editor.appHandlePasteNode,
    appOrchestration.editor.canPaste,
    mouseWorldPosOnCanvas,
    appOrchestration.core.canUndo,
    appOrchestration.core.handleUndo,
    appOrchestration.core.canRedo,
    appOrchestration.core.handleRedo,
    appOrchestration.saveCoordinator.saveActivePage, // Added save handler
  ]);
  useShortcutManager(shortcutDependencies);

  useEffect(() => {
    document.body.className = `${vscodeDarkTheme.app.bodyBg} ${vscodeDarkTheme.app.textPrimary} antialiased`;
  }, []);

  const openAiToolsViewer = useCallback(() => setIsAiToolsViewerOpen(true), []);
  const closeAiToolsViewer = useCallback(() => setIsAiToolsViewerOpen(false), []);
  const addCustomTool = useCallback((tool: RegisteredAiTool) => setCustomTools(prev => [...prev, tool]), []);
  
  const openCreateCustomAiNodeModal = useCallback(() => setIsCreateCustomAiNodeModalOpen(true), []);
  const closeCreateCustomAiNodeModal = useCallback(() => setIsCreateCustomAiNodeModalOpen(false), []);


  const openFullScreenUiViewer = useCallback((html: string, height: number, nodeId: string, inputData?: Record<string, any>) => {
    setFullScreenUiContent(html);
    setFullScreenUiNodeId(nodeId); 
    setFullScreenUiContentHeight(height);
    setFullScreenUiInputData(inputData);
    setPreviewedNodeId(nodeId); 
    setIsFullScreenUiViewerOpen(true);
  }, []);
  const closeFullScreenUiViewer = useCallback(() => {
    setIsFullScreenUiViewerOpen(false);
    setPreviewedNodeId(null); 
    setFullScreenUiNodeId(null);
  }, []);

  const openGlobalSettingsModal = useCallback(() => setIsGlobalSettingsModalOpen(true), []);
  const closeGlobalSettingsModal = useCallback(() => setIsGlobalSettingsModalOpen(false), []);


  const handleSaveCustomAiNode = useCallback((formData: CustomAiNodeFormData) => {
    const newNodeTypeKey = `custom_ai_node_${Date.now()}_${Math.random().toString(36).substring(2,5)}`;

    const mapCustomAiPortToNodePort = (customPort: ModalCustomAiPortConfig): NodePort => {
      let shape: 'circle' | 'diamond' = 'circle';
      if (customPort.dataType === PortDataType.FLOW) {
        shape = customPort.isRequired === false ? 'circle' : 'diamond';
      } else {
        shape = customPort.isRequired ? 'diamond' : 'circle';
      }
      // For non-flow ports, isDataRequiredOnConnection is implicitly true if isRequired is true.
      // If isRequired is false, isDataRequiredOnConnection will default to true (circle).
      // This part doesn't yet reflect the new square port logic, as the modal doesn't expose isDataRequiredOnConnection.
      // We'll default isDataRequiredOnConnection to true for custom AI nodes for now.
      return {
        id: sanitizePortIdForNode(customPort.label),
        label: customPort.label.trim(),
        dataType: customPort.dataType,
        shape: shape,
        isPortRequired: customPort.isRequired,
        isDataRequiredOnConnection: true, // Default for custom AI node ports
      };
    };

    const nodeInputs: NodePort[] = formData.customInputs.map(mapCustomAiPortToNodePort);
    const nodeOutputs: NodePort[] = formData.customOutputs.map(mapCustomAiPortToNodePort);

    // Add default history ports
    nodeInputs.push({ id: 'history_in', label: '历史记录输入', shape: 'circle', dataType: PortDataType.STRING, isPortRequired: false, isDataRequiredOnConnection: true });
    nodeOutputs.push({ id: 'history_out', label: '历史记录输出', shape: 'circle', dataType: PortDataType.STRING, isDataRequiredOnConnection: true });


    const portToolConfigForNodeData: Record<string, { useTool: boolean; toolName?: string }> = {};
    formData.customOutputs.forEach(outputPort => {
      if (outputPort.useTool && outputPort.toolName) {
        portToolConfigForNodeData[sanitizePortIdForNode(outputPort.label)] = {
          useTool: true,
          toolName: outputPort.toolName,
        };
      }
    });
    
    const DEFAULT_HEADER_BG_HEX = getDefaultHexColorFromTailwind('bg-teal-700');
    const DEFAULT_BODY_BG_CLASS_STRING = 'bg-slate-700'; 
    const DEFAULT_MAIN_TITLE_TEXT_HEX = getDefaultHexColorFromTailwindText('text-slate-100');
    const DEFAULT_SUBTITLE_TEXT_HEX = getDefaultHexColorFromTailwindText('text-slate-400');

    const newDefinition: NodeTypeDefinition = {
      type: newNodeTypeKey,
      label: formData.name.trim(),
      description: formData.description.trim(),
      defaultTitle: formData.name.trim(),
      width: 250, 
      inputs: nodeInputs,
      outputs: nodeOutputs,
      renderer: UniversalNodeRenderer, 
      inspector: BaseNodeInspector,   
      executor: executePlaceholderCustomAiNode, 
      headerColor: formData.headerColor || DEFAULT_HEADER_BG_HEX, 
      bodyColor: DEFAULT_BODY_BG_CLASS_STRING, 
      defaultData: {
        customMainTitleColor: formData.customStyles?.customMainTitleColor && formData.customStyles.customMainTitleColor !== DEFAULT_MAIN_TITLE_TEXT_HEX 
          ? formData.customStyles.customMainTitleColor 
          : undefined,
        customSubtitleColor: formData.customStyles?.customSubtitleColor && formData.customStyles.customSubtitleColor !== DEFAULT_SUBTITLE_TEXT_HEX
          ? formData.customStyles.customSubtitleColor
          : undefined,
        customAiConfig: { 
            aiModelConfigGroupId: formData.aiConfig.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID, 
            systemInstruction: formData.aiConfig.systemInstruction,
            defaultPrompt: formData.aiConfig.defaultPrompt, 
            temperature: formData.aiConfig.temperature,
            topP: formData.aiConfig.topP,
            topK: formData.aiConfig.topK,
            thinkingConfig: { 
              thinkingBudget: formData.aiConfig.thinkingBudget,
              includeThoughts: formData.aiConfig.includeThoughts,
            }
        } as AiServiceConfig & { defaultPrompt?: string; aiModelConfigGroupId?: string }, 
        ...(Object.keys(portToolConfigForNodeData).length > 0 && { portToolConfig: portToolConfigForNodeData }),
      },
    };
    
    // Adjust height based on the final set of ports including history ports
    const finalHeight = calculateNodeHeight(newDefinition.inputs, newDefinition.outputs, HEADER_HEIGHT);
    newDefinition.height = finalHeight; // This line was causing an error. Now fixed by adding height to NodeTypeDefinition.

    setCustomNodeDefinitions(prev => [...prev, newDefinition]);
    closeCreateCustomAiNodeModal();
  }, [closeCreateCustomAiNodeModal, customTools /* mergedModelConfigs is used by modal, not directly by this save func */]);


  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${vscodeDarkTheme.app.bodyBg}`}>
      <MainLayout 
        appOrchestration={appOrchestration} 
        onWorldMouseMove={setMouseWorldPosOnCanvas}
        canvasRefProp={canvasRef}
        isMKeyPressed={isMKeyPressed}
        onOpenAiToolsViewer={openAiToolsViewer}
        onOpenCreateCustomAiNodeModal={openCreateCustomAiNodeModal}
        customTools={customTools}
        customNodeDefinitions={customNodeDefinitions}
        getCombinedNodeDefinition={getCombinedNodeDefinition}
        onOpenCustomUiPreview={openFullScreenUiViewer} 
        onOpenGlobalSettingsModal={openGlobalSettingsModal}
        mergedModelConfigs={mergedModelConfigs} 
      />
      <ContextMenu menuConfig={menuConfig} onClose={closeContextMenu} />
      <GlobalNotificationDisplay 
        notifications={appOrchestration.notifications.notifications} 
        onDismiss={appOrchestration.notifications.removeNotification} 
      />
      <AiToolsViewer 
        isOpen={isAiToolsViewerOpen} 
        onClose={closeAiToolsViewer}
        customTools={customTools} 
        onAddCustomTool={addCustomTool} 
      /> 
      <CreateCustomAiNodeModal
        isOpen={isCreateCustomAiNodeModalOpen}
        onClose={closeCreateCustomAiNodeModal}
        onSave={handleSaveCustomAiNode}
        customTools={customTools}
        mergedModelConfigs={mergedModelConfigs} 
      />
      <FullScreenUiViewer
        isOpen={isFullScreenUiViewerOpen}
        onClose={closeFullScreenUiViewer}
        htmlContent={fullScreenUiContent}
        nodeId={fullScreenUiNodeId!} 
        contentHeight={fullScreenUiContentHeight}
        inputData={fullScreenUiInputData}
      />
      <GlobalSettingsModal
        isOpen={isGlobalSettingsModalOpen}
        onClose={closeGlobalSettingsModal}
        editableConfigs={editableAiModelConfigs} 
        setEditableConfigs={setEditableAiModelConfigs} 
        mergedModelConfigs={mergedModelConfigs} 
      />
    </div>
  );
};

export default App;
