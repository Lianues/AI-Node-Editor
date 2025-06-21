
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';

export const executeDataSynchronizationNode = async (
  node: Node,
  inputs: Record<string, any>, 
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[]
): Promise<{
  outputs: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const outputsMap: Record<string, any> = {};

  // Pass data from data_in_X to data_out_X
  node.inputs.forEach(inputPort => {
    // Ensure we only process data ports (not flow ports, though this node type shouldn't have them as inputs anymore)
    if (inputPort.dataType !== PortDataType.FLOW && inputs.hasOwnProperty(inputPort.id)) {
      const outputPortId = inputPort.id.replace(/^data_in_/, 'data_out_');
      const correspondingOutputPort = node.outputs.find(p => p.id === outputPortId);
      
      if (correspondingOutputPort) {
        outputsMap[outputPortId] = inputs[inputPort.id];
      }
    }
  });

  // No longer explicitly triggers flow_end as it's removed from definition.
  // The node simply passes data when all its data inputs are satisfied.

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: "数据已同步并传递。",
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsMap, executionDetails };
};

export default executeDataSynchronizationNode;
