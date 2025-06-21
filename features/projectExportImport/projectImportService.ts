
import {
  Tab,
  NodeExecutionState,
  SubWorkflowItem,
  NodeGroupItem,
  NodeTypeDefinition,
  RegisteredAiTool,
  WorkflowState,
  Node,
  Connection,
  DefinedArea,
  ProgramInterfaceDisplayItem,
  PortDataType,
  EditableAiModelConfig, // Added EditableAiModelConfig
} from '../../types';
import { ProjectExportData } from './projectExportService'; // Corrected import

/**
 * Validates if the parsed data has the basic structure of a ProjectExportData.
 * @param data The parsed JSON data.
 * @returns True if the data appears to be a ProjectExportData, false otherwise.
 */
export const isValidProjectExportData = (data: any): data is ProjectExportData => {
  if (typeof data !== 'object' || data === null) return false;

  const hasVersion = typeof data.version === 'string';
  const hasTabs = Array.isArray(data.tabs);
  const hasTabWorkflowStates = typeof data.tabWorkflowStates === 'object' && data.tabWorkflowStates !== null;
  const hasSubWorkflows = Array.isArray(data.subWorkflowDefinitions);
  const hasNodeGroups = Array.isArray(data.nodeGroupDefinitions);
  const hasCustomNodes = Array.isArray(data.customAiNodeDefinitions);
  const hasCustomTools = Array.isArray(data.customAiTools);
  const hasEditableAiConfigs = Array.isArray(data.editableAiModelConfigs); // New check

  if (!hasVersion || !hasTabs || !hasTabWorkflowStates || !hasSubWorkflows || !hasNodeGroups || !hasCustomNodes || !hasCustomTools || !hasEditableAiConfigs) {
    console.warn("Project data validation failed: Missing one or more top-level fields or incorrect types (editableAiModelConfigs check added).");
    return false;
  }

  // Basic check for tab structure
  if (data.tabs.some((tab: any) => typeof tab.id !== 'string' || typeof tab.title !== 'string' || typeof tab.type !== 'string')) {
    console.warn("Project data validation failed: Invalid tab structure.");
    return false;
  }
  
  // Basic check for workflow state structure for each tab
  for (const tabId in data.tabWorkflowStates) {
    if (Object.prototype.hasOwnProperty.call(data.tabWorkflowStates, tabId)) {
      const wfState = data.tabWorkflowStates[tabId];
      if (
        typeof wfState !== 'object' || wfState === null ||
        !Array.isArray(wfState.nodes) ||
        !Array.isArray(wfState.connections) ||
        typeof wfState.pan !== 'object' || wfState.pan === null ||
        typeof wfState.scale !== 'number' ||
        !Array.isArray(wfState.nodeExecutionStates) || 
        !Array.isArray(wfState.logicalInterfaces) // Ensure logicalInterfaces is an array
      ) {
        console.warn(`Project data validation failed: Invalid workflow state structure for tab ${tabId} (logicalInterfaces check added).`);
        return false;
      }
    }
  }

  // Basic check for editable AI model configs structure
  if (data.editableAiModelConfigs.some((config: any) => 
    typeof config.id !== 'string' ||
    typeof config.name !== 'string' ||
    (config.format !== 'gemini' && config.format !== 'openai') ||
    typeof config.apiUrl !== 'string' ||
    typeof config.apiKey !== 'string' || // API key can be empty, but field should exist
    typeof config.model !== 'string'
  )) {
    console.warn("Project data validation failed: Invalid structure in editableAiModelConfigs.");
    return false;
  }

  return true;
};

/**
 * Deserializes nodeExecutionStates from array to Map for a single WorkflowState.
 * This function is intended to be used when loading the state into a runtime manager.
 */
export const deserializeWorkflowStateExecutionStates = (
  serializedState: Omit<WorkflowState, 'nodeExecutionStates'> & { nodeExecutionStates: Array<[string, NodeExecutionState]> }
): WorkflowState => {
  const nodeExecutionStatesMap = new Map<string, NodeExecutionState>();
  if (serializedState.nodeExecutionStates && Array.isArray(serializedState.nodeExecutionStates)) {
    serializedState.nodeExecutionStates.forEach(([id, state]) => {
      nodeExecutionStatesMap.set(id, state); // JSON.parse(JSON.stringify(state)) could be used for deeper clone if state is complex
    });
  }
  return {
    ...serializedState,
    // Ensure logicalInterfaces is an array, defaulting to empty if not present (for backward compatibility)
    logicalInterfaces: Array.isArray(serializedState.logicalInterfaces) ? serializedState.logicalInterfaces : [], 
    nodeExecutionStates: nodeExecutionStatesMap,
  };
};


/**
 * Parses the project file content and validates its structure.
 * Returns ProjectExportData with nodeExecutionStates as an Array.
 * @param fileContent The raw string content of the project file.
 * @returns A Promise resolving to the parsed ProjectExportData or rejecting with an error.
 */
export const parseAndValidateProjectFile = (fileContent: string): Promise<ProjectExportData> => {
  return new Promise((resolve, reject) => {
    try {
      const parsedData = JSON.parse(fileContent);
      if (isValidProjectExportData(parsedData)) {
        // Resolve with parsedData directly, where nodeExecutionStates is an array.
        // The conversion to Map will happen when this data is loaded into a runtime state manager.
        resolve(parsedData as ProjectExportData);
      } else {
        reject(new Error("文件内容不是有效的项目导出格式。"));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "解析项目文件失败。";
      reject(new Error(`解析项目文件失败: ${errorMessage}。请确保文件是有效的 JSON。`));
    }
  });
};
