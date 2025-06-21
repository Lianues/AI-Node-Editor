
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';

interface DataCollectionItem {
  portId: string;
  label: string;
  type: PortDataType;
  value: any;
}

export const executeDataCombinationNode = async (
  node: Node,
  inputs: Record<string, any>, // Expects inputs like: { port_id: { value: any, _sourceDataType: PortDataType, _targetDataType: PortDataType } }
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[]
): Promise<{
  outputs: Record<string, any>;
  dataUpdates?: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const dataCollection: DataCollectionItem[] = [];

  for (const port of node.inputs) { // port is a DataCombinationNode's input port definition
    if (port.dataType !== PortDataType.FLOW && inputs.hasOwnProperty(port.id)) {
      const inputValueContainer = inputs[port.id];
      
      if (typeof inputValueContainer === 'object' && inputValueContainer !== null && 
          'value' in inputValueContainer && '_sourceDataType' in inputValueContainer && '_targetDataType' in inputValueContainer) {
          
          const actualValue = inputValueContainer.value;
          const upstreamOutputPortType = inputValueContainer._sourceDataType as PortDataType;
          const combinationNodeInputConfiguredType = inputValueContainer._targetDataType as PortDataType; // This should match port.dataType

          let typeToRecord: PortDataType;

          if (combinationNodeInputConfiguredType === PortDataType.ANY && upstreamOutputPortType === PortDataType.ANY) {
            typeToRecord = PortDataType.ANY;
          } else if (combinationNodeInputConfiguredType === PortDataType.ANY && upstreamOutputPortType !== PortDataType.ANY) {
            typeToRecord = upstreamOutputPortType;
          } else if (combinationNodeInputConfiguredType !== PortDataType.ANY && upstreamOutputPortType === PortDataType.ANY) {
            typeToRecord = combinationNodeInputConfiguredType;
          } else { // Both are specific (or one specific and one not ANY which is covered by above)
            // If connected, types must be compatible. Record the combination node's input port type.
            typeToRecord = combinationNodeInputConfiguredType;
          }

          dataCollection.push({
            portId: port.id,
            label: port.label,
            type: typeToRecord,
            value: actualValue,
          });

      } else {
          // Fallback if the input structure is not the expected augmented format
          // This indicates an issue upstream in DependencyEngine or PropagationEngine.
          console.warn(`[DataCombinationExec ${node.id}] Input for port ${port.id} (label: ${port.label}) is not in the expected augmented format. Received:`, inputValueContainer);
          dataCollection.push({
              portId: port.id,
              label: port.label,
              type: port.dataType, // Fallback to the port's configured type
              value: inputValueContainer, // Assume it's the direct value if not augmented
          });
      }
    }
  }

  const jsonOutputString = JSON.stringify(dataCollection, null, 2);

  const dataUpdates = {
    displayedValue: jsonOutputString,
  };

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: jsonOutputString.length > 200 ? jsonOutputString.substring(0, 200) + "..." : jsonOutputString,
    lastExecutionContextId: executionContextId,
  };

  const outputsMap: Record<string, any> = {
    data_collection_out: jsonOutputString,
  };

  const flowEndPort = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  if (flowEndPort) {
    outputsMap[flowEndPort.id] = { flowSignal: true };
  }

  return { outputs: outputsMap, dataUpdates, executionDetails };
};

export default executeDataCombinationNode;