

import { Node, WorkflowServices, NodeExecutionState, RegisteredAiTool } from '../../types'; // Added RegisteredAiTool

export const executeDataViewer = async (
  node: Node,
  inputs: Record<string, any>,
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] // Added customTools (though not used by DataViewerNode)
): Promise<{ 
  outputs: Record<string, any>; 
  dataUpdates?: Record<string, any>; // Added dataUpdates to return type
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const dataToDisplay = inputs.data_in; 

  const dataUpdates = { // Changed to dataUpdates
    displayedValue: dataToDisplay,
    lastDataUpdateTime: Date.now(),
  };
  
  // node.data = { ...(node.data || {}), ...nodeDataUpdates }; // Removed direct modification

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: typeof dataToDisplay === 'string' ? dataToDisplay : JSON.stringify(dataToDisplay),
    lastExecutionContextId: executionContextId, // Ensure lastExecutionContextId is set
  };

  // Return dataUpdates so the engine can apply them
  return { outputs: {}, dataUpdates, executionDetails }; 
};

export default executeDataViewer;