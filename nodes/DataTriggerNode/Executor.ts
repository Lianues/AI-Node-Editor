
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';

export const executeDataTriggerNode = async (
  node: Node,
  inputs: Record<string, any>, // Contains data for all connected & ready input ports
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] // Not used by this node, but part of the standard signature
): Promise<{
  outputs: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const outputsMap: Record<string, any> = {};

  // The core logic of this node is simply to trigger the flow_end port.
  // The DependencyEngine has already ensured that all connected data inputs
  // (which are marked as isDataRequiredOnConnection: true by default for data ports)
  // have received data before this executor is called.

  const flowEndPort = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  if (flowEndPort) {
    outputsMap[flowEndPort.id] = { flowSignal: true };
  }

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: "数据条件满足，已触发后续流程。",
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsMap, executionDetails };
};

export default executeDataTriggerNode;
