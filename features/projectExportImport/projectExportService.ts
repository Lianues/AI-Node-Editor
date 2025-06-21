
import {
  Tab,
  NodeExecutionState,
  SubWorkflowItem,
  NodeGroupItem,
  NodeTypeDefinition,
  RegisteredAiTool,
  WorkflowState,
  CanvasSnapshot, // Added CanvasSnapshot
  EditableAiModelConfig, // Added EditableAiModelConfig
} from '../../types';

// Interface for the structure of the exported JSON file
export interface ProjectExportData {
  version: string;
  exportedAt: string;
  projectSettings?: {
    shouldCreateAreaOnGroupDrop?: boolean;
    // Add other project-wide settings here
  };
  tabs: Array<Omit<Tab, 'fileHandle'>>; // Omit non-serializable parts
  activeTabId: string | null;
  // Use a Record (object) for tabWorkflowStates for easier JSON serialization
  tabWorkflowStates: Record<string, Omit<WorkflowState, 'nodeExecutionStates'> & {
    nodeExecutionStates: Array<[string, NodeExecutionState]>;
    // logicalInterfaces is already part of WorkflowState, will be included here
  }>;
  subWorkflowDefinitions: SubWorkflowItem[];
  nodeGroupDefinitions: NodeGroupItem[];
  customAiNodeDefinitions: NodeTypeDefinition[]; // Functions will be placeholders on import
  customAiTools: RegisteredAiTool[];
  editableAiModelConfigs: EditableAiModelConfig[]; // Added for global AI model settings
}

export const exportProjectDataAsJson = (data: ProjectExportData, filename: string = 'ai_workflow_project.json'): void => {
  try {
    // Create a deep copy and ensure functions are nulled out for NodeTypeDefinition before stringifying
    const dataToSerialize: ProjectExportData = JSON.parse(JSON.stringify(data, (key, value) => {
      if ((key === 'renderer' || key === 'inspector' || key === 'executor' || key === 'customContentRenderer') && typeof value === 'function') {
        return undefined; // Functions cannot be serialized, will be re-assigned on import
      }
      return value;
    }));

    const jsonString = JSON.stringify(dataToSerialize, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting project data:", error);
    alert("项目导出失败。详情请查看控制台。");
  }
};

/**
 * Initiates a browser download of the workflow snapshot as a JSON file.
 * @param snapshot The canvas snapshot to download.
 * @param filename The desired filename for the downloaded file (e.g., "workflow.json").
 */
export const downloadWorkflowAsJson = (snapshot: CanvasSnapshot, filename: string): void => {
  try {
    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error preparing or triggering workflow download:", error);
    // Optionally, display an error message to the user
    alert("Error preparing download. See console for details.");
  }
};
