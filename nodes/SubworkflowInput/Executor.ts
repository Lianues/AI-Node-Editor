

import { Node, WorkflowServices, NodeExecutionState, RegisteredAiTool } from '../../types'; // Added RegisteredAiTool

export const executeSubworkflowInput = async (
  node: Node,
  inputs: Record<string, any>, // These are standard node inputs, not used by SubworkflowInputNode
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] // Added customTools (though not used by SubworkflowInputNode)
): Promise<{ outputs: Record<string, any>; executionDetails?: NodeExecutionState['executionDetails'] }> => {
  const portName = node.data?.portName || node.outputs[0]?.label || 'N/A'; // Use label
  const logPrefix = `[Executor.SW_Input ${node.id} (Port: ${portName})]`;
  let outputValue: any;

  

  if (services.subworkflowHost && typeof services.subworkflowHost.getInputValue === 'function') {
    outputValue = services.subworkflowHost.getInputValue(node.id); 
    
  } else {
    outputValue = node.data?.testValue === undefined 
                  ? `(Test Input for: ${portName})` 
                  : node.data.testValue;
    
  }
  
  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: typeof outputValue === 'string' ? outputValue : JSON.stringify(outputValue),
    lastExecutionContextId: executionContextId,
  };
  
  
  return { outputs: { 'value_out': outputValue }, executionDetails };
};

export default executeSubworkflowInput;