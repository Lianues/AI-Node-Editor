
import React from 'react';
// Import connection-specific types from the new file if they are used by general types in this file
import { PortInteractionInfo, Connection, ConnectionPortIdentifier } from './features/connections/types/connectionTypes'; 
// Export them so other files that used to import from here still work
export type { Connection, ConnectionPortIdentifier }; // Added Connection and ConnectionPortIdentifier for re-export

import { GenerateContentResponse, Type as GeminiType } from '@google/genai'; // Removed Part import
import { UpstreamDataState, UpstreamNodeVisualStateManager } from './features/execution/engine/UpstreamNodeVisualStateManager'; 
import { PortDataCacheEntry, UpstreamSourceInfo } from './features/execution/engine/PropagationEngine'; 
import { Tab } from './features/tabs/types/tabTypes'; 
import { FileSystemItem as ProjectFileSystemItem } from './features/projectFiles/types/fileSystemTypes'; 
import { DefinedArea as AreaDefinitionType } from './features/areaDefinition/types/areaDefinitionTypes'; 
import { NodeGroupItem as NodeGroupItemType } from './features/nodeGroups/types/nodeGroupTypes'; 
import { SubWorkflowItem as SubWorkflowItemType } from './features/subworkflows/types/subWorkflowTypes'; 
import { WorkflowState as OriginalWorkflowState } from './hooks/useWorkflowTabsManager'; // Updated import
import { RegisteredAiTool } from './features/ai/tools/availableAiTools'; 
import { ModelConfigGroup as GlobalModelConfigGroup } from './globalModelConfigs'; // Added ModelConfigGroup

export enum SidebarItemId {
  ProjectFiles = 'project-files',
  NodeList = 'node-list',
  NodeGroupLibrary = 'node-group-library',
  SubWorkflowLibrary = 'sub-workflow-library',
  ProgramInterface = 'program-interface', 
  PropertyInspector = 'property-inspector',
}

export interface SidebarItemType {
  id: SidebarItemId;
  label: string;
  icon: React.ElementType; 
}

export type { Tab };
export type FileSystemItem = ProjectFileSystemItem;
export type DefinedArea = AreaDefinitionType;
export type NodeGroupItem = NodeGroupItemType;
export type SubWorkflowItem = SubWorkflowItemType;
export type ModelConfigGroup = GlobalModelConfigGroup; // Re-export for convenience


export enum PortDataType {
  STRING = 'string',
  FLOW = 'flow',
  AI_CONFIG = 'ai_config',
  ANY = 'any', 
  DATA_COLLECTION = 'data_collection', 
  UNKNOWN = 'unknown',
}

export interface NodePort {
  id:string;
  label: string; 
  dataType: PortDataType;
  shape?: 'circle' | 'diamond' | 'square'; // Added 'square'
  isPortRequired?: boolean; 
  isDataRequiredOnConnection?: boolean; // New field: Is data required if this port is connected?
  isAlwaysActive?: boolean; // New field: Is this flow input port always considered active?
  isEditing?: boolean; 
}

export interface NodeExecutionState {
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused' | 'waiting' | 'warning'; 
  error?: string;
  warningMessage?: string; 
  missingInputs?: string[]; 
  needsFlowSignal?: boolean; 
  satisfiedInputPortIds?: string[]; 
  portSpecificErrors?: { portId: string; message: string }[]; 
  executionDetails?: {
    tokenCount?: number | null;
    thoughts?: string | null;
    outputContent?: string | null;
    lastRunError?: string | null; 
    lastExecutionContextId?: string; 
  };
  activeExecutionContextId?: string; 
}

export interface NodePortConfig {
  isChoiceOption?: boolean; 
  sourceJsonPortLabel?: string; 
  isAlwaysActive?: boolean; // Added to store the 'always active' state for a port
}

export interface Node {
  id: string;
  title: string;
  x: number;
  y: number;
  type: string;
  width: number;
  height: number;
  inputs: NodePort[];
  outputs: NodePort[];
  headerColor: string; 
  bodyColor: string;   
  data?: Record<string, any> & {
    portConfigs?: Record<string, NodePortConfig>; 
    customHeaderColor?: string; 
    customMainTitleColor?: string; 
    customSubtitleColor?: string;  
    aiConfig?: AiServiceConfig; 
  };
  executionState?: NodeExecutionState; 
  customContentHeight?: number; 
  customContentTitle?: string;  
}

export interface SpecificNodeRendererProps {
  node: Node;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSelect: (event: React.MouseEvent<HTMLDivElement>) => void; 
  isSelected: boolean;
  isDragging: boolean;
  
  isConnectionDraggingActive: boolean;
  onPortMouseDownForConnection: (
    node: Node,
    port: NodePort,
    portIndex: number,
    portSide: 'input' | 'output',
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
  onPortPointerEnterForConnection?: (portInfo: PortInteractionInfo) => void;
  onPortPointerLeaveForConnection?: (portInfo: PortInteractionInfo) => void;
  onPortPointerUpForConnection?: (portInfo: PortInteractionInfo) => void;
  
  hoveredPortIdAsTarget: string | null; 
  isHoveredPortValidTarget: boolean | null; 
  portIdToHighlightAsSelectedConnectionEndpoint?: string | null;
  generalValidDragTargetPortIds?: string[];

  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined;

  executionState?: NodeExecutionState; 
  upstreamDataState?: UpstreamDataState; 
  getUpstreamNodeVisualStateManager?: () => UpstreamNodeVisualStateManager; 

  connections: Connection[];
  getQueuedInputsForDownstreamPort: (downstreamNodeId: string, downstreamInputPortId: string, dataType: PortDataType) => Array<PortDataCacheEntry | UpstreamSourceInfo> | undefined;
  nodeExecutionStates: Map<string, NodeExecutionState>; 
  allNodes: Node[]; 
  onOpenCustomUiPreview?: (html: string, height: number, nodeId: string, inputData?: Record<string, any>) => void; 
  mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig>; // Added for AiModelSelectionNode's renderer
}


export interface SpecificNodeInspectorProps {
  node: Node;
  executionDetails?: NodeExecutionState['executionDetails'] | null; 
  customTools?: RegisteredAiTool[]; 
  mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig>; // Added mergedModelConfigs
}

export interface CustomContentRendererProps {
  node: Node;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  onOpenCustomUiPreview?: (html: string, height: number, nodeId: string, inputData?: Record<string, any>) => void; 
  mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig>; // Added for AiModelSelectionNodeContent
}

export interface GeminiFunctionDeclarationSchema {
  type?: GeminiType; 
  description?: string;
  properties?: {
    [key: string]: GeminiFunctionDeclarationSchema; 
  };
  required?: string[];
  items?: GeminiFunctionDeclarationSchema; 
  enum?: string[]; 
}

export interface GeminiFunctionDeclaration {
  name: string; // Changed from name?: string to name: string
  description: string;
  parameters?: GeminiFunctionDeclarationSchema;
}

// Define Tool locally based on usage
export interface Tool {
  functionDeclarations?: GeminiFunctionDeclaration[];
}

// Define our own Part types locally
export interface AppTextPart {
  text: string;
}

export interface AppFilePart {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded string
  };
}

export type AppPart = AppTextPart | AppFilePart;

// Define our own GeminiContent interface using AppPart
export interface GeminiContent {
  role?: string; // Role is optional string, e.g. "user", "model"
  parts: AppPart[]; // Use our locally defined AppPart
}

export { GeminiType, GenerateContentResponse }; 
export type { RegisteredAiTool }; 

// History types for AI services
export interface GeminiPart { // This is our app's simple text Part, used in GeminiHistoryItem
  text: string;
}

export interface GeminiHistoryItem {
  role: "user" | "model";
  parts: GeminiPart[]; // This uses our app's simple GeminiPart for history, primarily text.
                       // Conversion to AppPart[] with potential images would happen during service call prep.
}

export interface OpenAIMessageForHistory {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
}


export interface AiServiceConfig {
  aiModelConfigGroupId?: string;
  apiFormat?: 'gemini' | 'openai'; 
  apiUrl?: string; 
  apiKey?: string; 
  model?: string; 
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  thinkingConfig?: { 
    thinkingBudget?: number;
    includeThoughts?: boolean; 
  };
  error?: string; 
  tools?: Tool[]; 
  history?: GeminiHistoryItem[] | OpenAIMessageForHistory[]; 
}

export type ApiFormat = 'gemini' | 'openai';

export interface EditableAiModelConfig {
  id: string;
  name: string;
  format: ApiFormat;
  apiUrl: string;
  apiKey: string;
  model: string; 
}


export interface GeminiServiceFunctionCallResult {
  extractedData: any | null; 
  errorMessage: string | null;
  rawResponse: GenerateContentResponse | null; 
  tokenCount?: number; 
  thoughts?: string;   
}

export interface OpenAIFunctionCallDetails {
  name: string;
  arguments: string; 
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: OpenAIFunctionCallDetails;
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string; 
}

export interface OpenAIChatChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason: string; 
}

export interface OpenAIChatCompletion {
  id: string;
  object: string; 
  created: number;
  model: string; 
  choices: OpenAIChatChoice[];
  usage?: { 
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string | null;
}


export type WorkflowState = OriginalWorkflowState; 

export interface WorkflowServices {
  geminiService?: {
    generateText: ( 
      promptOrMessages: string | GeminiContent[] | OpenAIChatMessage[], 
      config?: AiServiceConfig
    ) => Promise<{ 
      response: GenerateContentResponse | OpenAIChatCompletion | null; 
      tokenCount?: number;
      thoughts?: string;
      error?: string; 
    } | null>;

    callGeminiWithFunction: ( 
      prompt: string,
      aiConfig: AiServiceConfig & { model: string }, 
      functionToCall: GeminiFunctionDeclaration,
      expectedFunctionArgName: string, 
      nodeIdForLogging?: string
    ) => Promise<GeminiServiceFunctionCallResult>;
    testAiModel: (config: { 
      apiFormat: 'gemini' | 'openai';
      model: string;
      prompt: string;
      apiKey?: string;
      apiUrl?: string;
    }) => Promise<{ text?: string; error?: string } | null>;
  };
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined;
  getGraphDefinition: (workflowId: string) => Promise<WorkflowState | null>; 
  subworkflowHost?: {
    getInputValue: (internalInputNodeId: string) => any;
    setOutputValue: (internalOutputNodeId: string, value: any) => void;
  };
  getMergedModelConfigs?: () => Array<ModelConfigGroup | EditableAiModelConfig>; 
}


export interface NodeTypeDefinition {
  type: string;
  label: string;
  description?: string; 
  defaultTitle: string;
  width: number;
  height?: number; 
  inputs: NodePort[];
  outputs: NodePort[];
  renderer: React.FC<SpecificNodeRendererProps>; 
  inspector: React.FC<SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }>; 
  executor?: (
    node: Node, 
    inputs: Record<string, any>,
    services: WorkflowServices, 
    executionContextId?: string,
    customTools?: RegisteredAiTool[] 
  ) => Promise<{ 
    outputs: Record<string, any>; 
    dataUpdates?: Record<string, any>; 
    executionDetails?: NodeExecutionState['executionDetails'] & { 
      portSpecificErrors?: { portId: string; message: string }[];
    } 
  }>;
  headerColor: string; 
  bodyColor: string;   
  defaultData?: Record<string, any>; 
  customContentHeight?: number; 
  customContentRenderer?: React.FC<CustomContentRendererProps>; 
  customContentTitle?: string; 
  isStatefulSource?: boolean; // New: Indicates if node can be directly queried for state
  stateOutputDataKeys?: Record<string, string>; // New: Maps output port ID to data key for state retrieval
}

export interface CanvasSnapshot {
  nodes: Node[];
  connections: Connection[];
  pan: { x: number; y: number };
  scale: number;
  selectedNodeIds: string[]; 
  selectedConnectionId: string | null;
  nodeExecutionStates: Array<[string, NodeExecutionState]>; 
  nodeTypeToPlace: string | null;
  definedAreas?: DefinedArea[]; 
  logicalInterfaces?: ProgramInterfaceDisplayItem[]; 
}

export enum NotificationType {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Success = 'success',
}

export interface NotificationMessage {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; 
}

export interface ProgramInterfaceDisplayItem {
  id: string; 
  name: string;
  dataType: PortDataType; 
  originalDataType?: PortDataType; 
  isRequired: boolean;
  nodeType: 'input' | 'output';
  isLogical?: boolean; 
}
