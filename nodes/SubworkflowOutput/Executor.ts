

import { Node, WorkflowServices, NodeExecutionState, RegisteredAiTool } from '../../types'; // Added RegisteredAiTool

export const executeSubworkflowOutput = async (
  node: Node,
  inputs: Record<string, any>,
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] // Added customTools (though not used by SubworkflowOutputNode)
): Promise<{ outputs: Record<string, any>; executionDetails?: NodeExecutionState['executionDetails'] }> => {
  const portName = node.data?.portName || node.inputs[0]?.label || 'N/A'; // Use label
  const logPrefix = `[Executor.SW_Output ${node.id} (Port: ${portName})]`;
  const receivedValue = inputs.value_in;
  
  
  
  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: typeof receivedValue === 'string' ? receivedValue : JSON.stringify(receivedValue),
    lastExecutionContextId: executionContextId,
  };
  
  // This node itself doesn't have outputs. Its 'value_in' port's data is an output of the subworkflow.
  // The SubworkflowExecutionService will inspect the data cache for this node's input port.
  if (services.subworkflowHost && typeof services.subworkflowHost.setOutputValue === 'function') {
      // This is more of a conceptual call; the actual value is picked up by SubworkflowExecutionService from its cache
      // by looking at what was fed into *this* node's 'value_in' port.
      
      services.subworkflowHost.setOutputValue(node.id, receivedValue);
  } else {
      
  }

  
  return { outputs: {}, executionDetails };
};

export default executeSubworkflowOutput;