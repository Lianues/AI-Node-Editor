import { Node, WorkflowServices, NodeExecutionState, RegisteredAiTool, PortDataType } from '../../types';

export const executeDocumentNode = async (
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
  let currentContent = node.data?.documentContent;
  let dataUpdates: Record<string, any> | undefined = undefined;
  let stateUpdated = false;

  // When data is input, it automatically updates the current content
  if (inputs.hasOwnProperty('content_in')) {
    const newContentFromInput = inputs.content_in;

    // If input is null or undefined, store undefined. Otherwise, store as string.
    const contentToStore = (newContentFromInput === null || newContentFromInput === undefined)
      ? undefined
      : String(newContentFromInput);

    if (currentContent !== contentToStore) {
      currentContent = contentToStore;
      dataUpdates = { documentContent: currentContent };
      stateUpdated = true;
    }
  }

  // DocumentNode is a stateful source. It does not actively push its content_out.
  // It also no longer has a flow_end port according to the updated definition.
  const outputsMap: Record<string, any> = {};

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: stateUpdated ? "内部状态已更新。" : "无状态更新，等待拉取。",
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsMap, dataUpdates, executionDetails };
};

export default executeDocumentNode;