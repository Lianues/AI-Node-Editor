
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';
// processTemplateString is not directly used here, assuming inputs are direct values.
// If input data_collection_in could be a template string itself, then this import is needed.
// For now, data_collection_in is expected to be a JSON string directly.
// import { processTemplateString } from '../../features/execution/engine/NodeExecutionEngine'; 

interface DataCollectionItem {
  portId: string; // ID of the original input port from the DataCombinationNode
  label: string;  // Label of the original input port
  type: PortDataType; // Data type of the original value
  value: any;     // The actual value
}

export const executeDataSplitNode = async (
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
  const jsonInputString = inputs.data_collection_in as string;
  let executionError: string | undefined = undefined;
  const outputsMap: Record<string, any> = {};
  let parsedData: DataCollectionItem[] = [];

  let dataUpdates: Record<string, any> = {
    displayedValue: jsonInputString || "输入为空或无效。",
  };

  if (typeof jsonInputString !== 'string' || !jsonInputString.trim()) {
    executionError = "输入的数据集合为空或不是有效的JSON字符串。";
  } else {
    try {
      parsedData = JSON.parse(jsonInputString);
      if (!Array.isArray(parsedData)) {
        throw new Error("数据集合必须是一个JSON数组。");
      }
      // Basic validation of array items can be added here if needed
    } catch (e: any) {
      executionError = `解析数据集合JSON失败: ${e.message || String(e)}`;
      console.error(`[DataSplitExec ${node.id}] ${executionError}`, e);
      parsedData = []; // Ensure parsedData is an empty array on error
    }
  }

  if (!executionError) {
    for (const outputPort of node.outputs) {
      if (outputPort.dataType !== PortDataType.FLOW) {
        const portConfig = node.data?.portConfigs?.[outputPort.id];
        // Default to matching by label if sourceJsonPortLabel is not configured
        const sourceIdentifier = portConfig?.sourceJsonPortLabel || outputPort.label; 
        
        const matchingItem = parsedData.find(item => item.label === sourceIdentifier);

        if (matchingItem) {
          outputsMap[outputPort.id] = matchingItem.value;
        } else {
          // Output undefined if no matching item is found for this port's configured source label
          outputsMap[outputPort.id] = undefined;
        }
      }
    }
  }
  
  const flowEndPort = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  if (flowEndPort) {
    outputsMap[flowEndPort.id] = { flowSignal: true, error: !!executionError, errorMessage: executionError };
  }

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: executionError 
      ? `错误: ${executionError}` 
      : `成功拆分 ${parsedData.length} 个数据项。`,
    lastRunError: executionError,
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsMap, dataUpdates, executionDetails };
};

export default executeDataSplitNode;