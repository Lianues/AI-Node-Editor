

import { Node, WorkflowServices, NodeExecutionState, RegisteredAiTool } from '../../types'; // Added WorkflowServices, RegisteredAiTool
import { startDefinition } from './Definition'; // To access port IDs

export const executeStart = async (
  node: Node, 
  inputs: Record<string, any>,
  services: WorkflowServices, // Added services
  executionContextId?: string, // Added, though StartNode typically doesn't use it
  customTools?: RegisteredAiTool[] // Added customTools (though not used by StartNode)
): Promise<{ outputs: Record<string, any>; executionDetails?: NodeExecutionState['executionDetails'] }> => {
  
  
  const outputsMap: Record<string, any> = {};

  // Assuming the first output port is the 'flow_end' or primary flow port
  const flowOutputPort = startDefinition.outputs.find(p => p.dataType === 'flow');
  if (flowOutputPort) {
    outputsMap[flowOutputPort.id] = { flowSignal: true }; // Standardized flow signal
  } else if (node.outputs.length > 0) {
    // Fallback if no specific flow port is found by type, use the first one.
    // This is less robust. Prefer identifying flow ports by a specific property or ID pattern if possible.
    outputsMap[node.outputs[0].id] = { flowSignal: true };
  }
  
  // Example: If StartNode could also output initial data for other port types
  // const stringOutputPort = startDefinition.outputs.find(p => p.dataType === 'string' && p.id === 'initial_text');
  // if (stringOutputPort) {
  //   outputsMap[stringOutputPort.id] = "Initial data from StartNode";
  // }

  return { outputs: outputsMap };
};

export default executeStart;