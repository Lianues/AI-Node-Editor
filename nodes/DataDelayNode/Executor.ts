
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';

export const executeDataDelayNode = async (
  node: Node,
  inputs: Record<string, any>, 
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] 
): Promise<{
  outputs: Record<string, any>;
  dataUpdates?: Record<string, any>; 
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const outputsMap: Record<string, any> = {};
  const portDelayTimes = node.data?.portDelayTimes || {};
  const DEFAULT_DELAY = 1000; // Default delay in ms if not specified for a port

  const delayPromises: Promise<void>[] = [];
  const flowOutputsToSignal: Array<{ outputPortId: string; signal: any }> = [];
  const portSummary: string[] = [];

  for (const inputPort of node.inputs) {
    if (inputs.hasOwnProperty(inputPort.id)) {
      const inputData = inputs[inputPort.id];
      
      // Determine corresponding output port ID
      let outputPortId = inputPort.id; // Default for custom ports
      if (inputPort.id.startsWith('data_in_')) {
        outputPortId = inputPort.id.replace(/^data_in_/, 'data_out_');
      } else if (inputPort.id.startsWith('flow_in_')) {
        outputPortId = inputPort.id.replace(/^flow_in_/, 'flow_out_');
      }
      // For other custom port IDs, inputPort.id is used as outputPortId by useNodeManager

      const correspondingOutputPort = node.outputs.find(p => p.id === outputPortId);

      if (correspondingOutputPort) {
        if (inputPort.dataType === PortDataType.FLOW) {
          // Store flow signals to be passed after data delays
          flowOutputsToSignal.push({ outputPortId: correspondingOutputPort.id, signal: inputData });
          portSummary.push(`${inputPort.label} (流程信号)`);
        } else {
          // Handle data port delays
          const delayTime = portDelayTimes[inputPort.id] !== undefined ? Number(portDelayTimes[inputPort.id]) : DEFAULT_DELAY;
          portSummary.push(`${inputPort.label} (延迟: ${delayTime}ms)`);
          const promise = new Promise<void>((resolve) => {
            setTimeout(() => {
              outputsMap[correspondingOutputPort.id] = inputData;
              resolve();
            }, delayTime < 0 ? 0 : delayTime); // Ensure delay is not negative
          });
          delayPromises.push(promise);
        }
      }
    }
  }

  // Wait for all data delay promises to resolve
  if (delayPromises.length > 0) {
    await Promise.all(delayPromises);
  }

  // After all data delays, add the flow signals to the outputsMap
  flowOutputsToSignal.forEach(flowOutput => {
    outputsMap[flowOutput.outputPortId] = flowOutput.signal;
  });

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: (delayPromises.length > 0 || flowOutputsToSignal.length > 0)
      ? `数据/流程已处理。端口: ${portSummary.join(', ') || '无'}` 
      : "无数据或流程输入，未执行。",
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsMap, executionDetails };
};

export default executeDataDelayNode;
