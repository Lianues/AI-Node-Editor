
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';

interface MergedDataTypedItem {
  type: PortDataType;
  mergedValue: any;
  sourceLabels: string[];
  sourcePortIds: string[];
}

// This is the structure expected by DataCollectionViewerContent
interface DisplayableMergedItem {
  label: string; // e.g., "Merged Strings from: PortA, PortB"
  type: PortDataType; // The common data type
  value: any; // The merged value
}

export const executeDataMergeNode = async (
  node: Node,
  inputs: Record<string, any>, // Expected: { port_id: { value: any, _sourceDataType: PortDataType, _targetDataType: PortDataType } }
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[]
): Promise<{
  outputs: Record<string, any>;
  dataUpdates?: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const tempMergedDataByType: Map<PortDataType, { values: any[], sourceLabels: string[], sourcePortIds: string[] }> = new Map();

  // Iterate node.inputs to maintain defined port order
  for (const port of node.inputs) {
    if (port.dataType === PortDataType.FLOW) {
      continue;
    }

    if (inputs.hasOwnProperty(port.id)) {
      const inputValueContainer = inputs[port.id];

      if (typeof inputValueContainer === 'object' && inputValueContainer !== null &&
          'value' in inputValueContainer && '_sourceDataType' in inputValueContainer && '_targetDataType' in inputValueContainer) {

        const actualValue = inputValueContainer.value;
        const upstreamOutputPortType = inputValueContainer._sourceDataType as PortDataType;
        const mergeNodeInputConfiguredType = inputValueContainer._targetDataType as PortDataType;

        let effectiveDataType: PortDataType;
        if (mergeNodeInputConfiguredType === PortDataType.ANY && upstreamOutputPortType === PortDataType.ANY) {
          effectiveDataType = PortDataType.ANY; // Or could default to STRING if actualValue is string, etc.
        } else if (mergeNodeInputConfiguredType === PortDataType.ANY) {
          effectiveDataType = upstreamOutputPortType;
        } else {
          effectiveDataType = mergeNodeInputConfiguredType;
        }
        
        if (actualValue === undefined) continue; // Skip undefined values from merging

        if (!tempMergedDataByType.has(effectiveDataType)) {
          tempMergedDataByType.set(effectiveDataType, { values: [], sourceLabels: [], sourcePortIds: [] });
        }
        const typeGroup = tempMergedDataByType.get(effectiveDataType)!;
        typeGroup.values.push(actualValue);
        typeGroup.sourceLabels.push(port.label);
        typeGroup.sourcePortIds.push(port.id);

      } else {
        // Fallback for non-augmented inputs (should ideally not happen with current engine)
        if (inputValueContainer === undefined) continue;

        const effectiveDataType = port.dataType; // Use port's configured type as best guess
         if (!tempMergedDataByType.has(effectiveDataType)) {
          tempMergedDataByType.set(effectiveDataType, { values: [], sourceLabels: [], sourcePortIds: [] });
        }
        const typeGroup = tempMergedDataByType.get(effectiveDataType)!;
        typeGroup.values.push(inputValueContainer);
        typeGroup.sourceLabels.push(port.label);
        typeGroup.sourcePortIds.push(port.id);
      }
    }
  }

  const mergedCollectionForDisplay: DisplayableMergedItem[] = [];
  const mergedCollectionForOutput: MergedDataTypedItem[] = [];

  tempMergedDataByType.forEach((data, type) => {
    let mergedValue;
    if (type === PortDataType.STRING) {
      mergedValue = data.values.join(''); // Concatenate strings
    } else {
      mergedValue = data.values; // Keep as array for other types
    }
    const displayLabel = `${type.charAt(0).toUpperCase() + type.slice(1)} (来自: ${data.sourceLabels.join(', ')})`;
    
    mergedCollectionForDisplay.push({
      label: displayLabel,
      type: type,
      value: mergedValue,
    });
    mergedCollectionForOutput.push({
      type: type,
      mergedValue: mergedValue,
      sourceLabels: data.sourceLabels,
      sourcePortIds: data.sourcePortIds,
    });
  });

  const jsonOutputStringForDisplay = JSON.stringify(mergedCollectionForDisplay, null, 2);
  const jsonOutputStringForPort = JSON.stringify(mergedCollectionForOutput, null, 2);


  const dataUpdates = {
    displayedValue: jsonOutputStringForDisplay,
  };

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: `合并了 ${tempMergedDataByType.size} 种类型的数据。`,
    lastExecutionContextId: executionContextId,
  };

  const outputsMap: Record<string, any> = {
    merged_data_out: jsonOutputStringForPort, // Output port uses the detailed MergedDataTypedItem[]
  };

  const flowEndPort = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  if (flowEndPort) {
    outputsMap[flowEndPort.id] = { flowSignal: true };
  }

  return { outputs: outputsMap, dataUpdates, executionDetails };
};

export default executeDataMergeNode;