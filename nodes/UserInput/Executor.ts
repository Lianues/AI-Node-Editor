

import { Node, WorkflowServices, PortDataType, NodeExecutionState, RegisteredAiTool } from '../../types'; // Added WorkflowServices, PortDataType, RegisteredAiTool
// import { userInputDefinition } from './Definition'; // To access port IDs

export const executeUserInput = async (
  node: Node, 
  inputs: Record<string, any>,
  services: WorkflowServices, // Added services
  executionContextId?: string, // Added executionContextId
  customTools?: RegisteredAiTool[] // Added customTools (though not used by UserInputNode)
): Promise<{ outputs: Record<string, any>; executionDetails?: NodeExecutionState['executionDetails'] }> => {
  
  
  const content = node.data?.userInput || ""; 
  
  const outputsMap: Record<string, any> = {};
  
  const contentOutPort = node.outputs.find(p => p.id === 'content_out');
  let flowEndPort = node.outputs.find(p => p.dataType === PortDataType.FLOW && p.id === 'flow_end');
  if (!flowEndPort) { 
    flowEndPort = node.outputs.find(p => p.dataType === PortDataType.FLOW);
  }

  if (contentOutPort) {
    outputsMap[contentOutPort.id] = content;
  }
  if (flowEndPort) {
    outputsMap[flowEndPort.id] = { flowSignal: true }; 
  }
  
  return { outputs: outputsMap };
};

export default executeUserInput;