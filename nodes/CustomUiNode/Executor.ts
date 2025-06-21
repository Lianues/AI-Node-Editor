
import { Node, WorkflowServices, NodeExecutionState, RegisteredAiTool } from '../../types';

export const executeCustomUiNode = async (
  node: Node,
  inputs: Record<string, any>,
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[]
): Promise<{ 
  outputs: Record<string, any>; 
  dataUpdates?: Record<string, any>; 
  executionDetails?: NodeExecutionState['executionDetails'] 
}> => {
  // Executor for CustomUiNode no longer automatically passes data or triggers flow.
  // All outputs, including flow_end, must be triggered by the custom UI via window.aiStudioBridge.sendOutput().
  const outputsMap: Record<string, any> = {};

  const dataUpdates: Record<string, any> = {
    lastReceivedInputs: { ...inputs }, 
  };

  // The node is now essentially "paused" waiting for UI interaction to send output.
  // The execution engine should handle this pause state if a flow output is expected but not yet sent.
  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: "等待自定义界面交互...", 
    lastExecutionContextId: executionContextId,
  };
  
  return { outputs: outputsMap, dataUpdates, executionDetails };
};

export default executeCustomUiNode;
