import { Node, NodeTypeDefinition, PortDataType, NodePortConfig } from '../../../types';
import { Connection } from '../../connections/types/connectionTypes';
import { CheckNodeDependenciesResult } from './executionEngineTypes';
import { UpstreamSourceInfo, PortDataCacheEntry } from './PropagationEngine';
import { DATA_COMBINATION_NODE_TYPE_KEY } from '../../../nodes/DataCombinationNode/Definition'; 
import { DATA_MERGE_NODE_TYPE_KEY } from '../../../nodes/DataMergeNode/Definition'; 
import { DOCUMENT_NODE_TYPE_KEY } from '../../../nodes/DocumentNode/Definition';


/**
 * Checks if a node's dependencies are met for execution.
 * A node is considered ready if all its input ports that require data
 * (either flow signals or actual data values) have received it.
 * This check is based on the current state of portDataCache and activeFlowSignals,
 * irrespective of the data's origin in the graph (i.e., it supports non-directional data flow).
 */
export const checkNodeDependencies = (
  node: Node, 
  definition: NodeTypeDefinition, 
  getConnections: () => Connection[],
  portDataCache: Map<string, PortDataCacheEntry[]>, 
  activeFlowSignals: Map<string, UpstreamSourceInfo[]>,
  getNodes: () => Node[], // Restored
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined // Restored
): CheckNodeDependenciesResult => {
  const logPrefix = `[DepEngine Node:${node.id} (${node.title})]`;
  const currentConnections = getConnections(); 
  const currentAllNodes = getNodes(); 
  
  const collectedInputsForExecutor: Record<string, any> = {};
  const consumedSourcesForInvocation: Map<string, PortDataCacheEntry | UpstreamSourceInfo> = new Map();
  const missingDataInputPortIds: string[] = [];
  const allCurrentlySatisfiedInputPortIds: string[] = []; 
  let determinedTriggeringContextId: string | undefined = undefined;

  let hasConnectedFlowInput = false;
  let anyFlowInputSatisfiedForCurrentCheck = false;
  let flowInputSpecificallyNeededButMissing = false;

  for (const portDef of node.inputs) { 
    const isConnected = currentConnections.some(c => c.target.nodeId === node.id && c.target.portId === portDef.id);
    const portKey = `${node.id}-${portDef.id}`;
    const isDataRequiredOnThisPort = portDef.isDataRequiredOnConnection === undefined ? true : portDef.isDataRequiredOnConnection;
    let foundInputForPortViaStatefulSource = false;
    const portConfigFromNodeData = node.data?.portConfigs?.[portDef.id] as NodePortConfig | undefined;

    // Check for stateful source pull
    if (isConnected && portDef.dataType !== PortDataType.FLOW) {
      const upstreamConnectionsToThisPort = currentConnections.filter(c => c.target.nodeId === node.id && c.target.portId === portDef.id);
      for (const conn of upstreamConnectionsToThisPort) {
        const upstreamNodeInstance = currentAllNodes.find(n => n.id === conn.source.nodeId);
        if (!upstreamNodeInstance) continue;

        const upstreamNodeDef = getNodeDefinition(upstreamNodeInstance.type);
        if (upstreamNodeDef?.isStatefulSource && upstreamNodeDef.stateOutputDataKeys?.[conn.source.portId]) {
          const dataKey = upstreamNodeDef.stateOutputDataKeys[conn.source.portId];
          let stateValueRaw = upstreamNodeInstance.data?.[dataKey];
          let stateValue: any;

          if (upstreamNodeInstance.type === DOCUMENT_NODE_TYPE_KEY && dataKey === 'documentContent') {
            stateValue = (stateValueRaw === "" || stateValueRaw === null || stateValueRaw === undefined)
                           ? undefined
                           : stateValueRaw;
          } else {
            stateValue = stateValueRaw;
          }
          
          // If state value is found or data is not strictly required if connected
          if (stateValue !== undefined || !isDataRequiredOnThisPort) {
            allCurrentlySatisfiedInputPortIds.push(portDef.id);
            
            if (node.type === DATA_COMBINATION_NODE_TYPE_KEY || node.type === DATA_MERGE_NODE_TYPE_KEY) {
              collectedInputsForExecutor[portDef.id] = {
                value: stateValue,
                _sourceDataType: conn.source.dataType, 
                _targetDataType: portDef.dataType      
              };
            } else {
              collectedInputsForExecutor[portDef.id] = stateValue;
            }
            
            // For stateful sources, the "consumed source" is essentially the node itself providing its state.
            // The executionContextId is not typically derived from a stateful pull in the same way as propagated data.
            consumedSourcesForInvocation.set(portDef.id, {
              value: stateValue, // Value is part of the stateful source entry
              upstreamNodeId: upstreamNodeInstance.id,
              upstreamOutputPortId: conn.source.portId,
              upstreamPortDataType: conn.source.dataType,
              // sendTimestamp would be 'now' if we considered it, but it's a pull.
              // executionContextId might be undefined or the current node's context if applicable.
            } as PortDataCacheEntry); 
            foundInputForPortViaStatefulSource = true;
            break; 
          }
        }
      }
    }
    
    if (foundInputForPortViaStatefulSource) {
      continue; // Move to the next port, this one is satisfied by stateful source
    }


    if (portDef.dataType === PortDataType.FLOW) {
      const isAlwaysActive = portConfigFromNodeData?.isAlwaysActive === true;
      if (isConnected || isAlwaysActive) { 
        hasConnectedFlowInput = true; 
        const signalSourcesArray = activeFlowSignals.get(portKey);
        
        if (isAlwaysActive || (signalSourcesArray && signalSourcesArray.length > 0)) {
          allCurrentlySatisfiedInputPortIds.push(portDef.id); 
          collectedInputsForExecutor[portDef.id] = { flowSignal: true };
          
          if (!anyFlowInputSatisfiedForCurrentCheck) {
            const firstSignalSource = isAlwaysActive 
              ? { upstreamNodeId: node.id, upstreamOutputPortId: '__ALWAYS_ACTIVE_SIGNAL__', executionContextId: undefined } as UpstreamSourceInfo
              : signalSourcesArray![0];
            
            consumedSourcesForInvocation.set(portDef.id, firstSignalSource);
            anyFlowInputSatisfiedForCurrentCheck = true;
            if (!determinedTriggeringContextId && firstSignalSource.executionContextId) {
                determinedTriggeringContextId = firstSignalSource.executionContextId;
            }
          }
        } else {
          if (!isAlwaysActive) {
            flowInputSpecificallyNeededButMissing = true;
          }
        }
      }
    } else { 
      if (isConnected) {
        const dataEntriesArray = portDataCache.get(portKey);
        if (dataEntriesArray && dataEntriesArray.length > 0) {
          allCurrentlySatisfiedInputPortIds.push(portDef.id); 
          const firstDataEntry = dataEntriesArray[0];
          
          if (node.type === DATA_COMBINATION_NODE_TYPE_KEY || node.type === DATA_MERGE_NODE_TYPE_KEY) {
            collectedInputsForExecutor[portDef.id] = {
              value: firstDataEntry.value,
              _sourceDataType: firstDataEntry.upstreamPortDataType,
              _targetDataType: portDef.dataType 
            };
          } else {
            collectedInputsForExecutor[portDef.id] = firstDataEntry.value;
          }

          consumedSourcesForInvocation.set(portDef.id, firstDataEntry);
          if (!determinedTriggeringContextId && firstDataEntry.executionContextId) {
            determinedTriggeringContextId = firstDataEntry.executionContextId;
          }
        } else { 
          if (isDataRequiredOnThisPort) { 
            missingDataInputPortIds.push(portDef.id);
          } else { 
            allCurrentlySatisfiedInputPortIds.push(portDef.id);
            collectedInputsForExecutor[portDef.id] = undefined; // Explicitly set to undefined if not required and no data
          }
        }
      } else { 
        if (portDef.isPortRequired) {
            missingDataInputPortIds.push(portDef.id);
        }
      }
    }
  }
  
  const result: CheckNodeDependenciesResult = {
      canExecute: false,
      inputs: null,
      missingDataInputPortIds: [],
      needsFlowSignal: false,
      allSatisfiedInputPortIds: allCurrentlySatisfiedInputPortIds,
      consumedSources: undefined,
      triggeringExecutionContextId: determinedTriggeringContextId,
  };

  if (missingDataInputPortIds.length > 0) {
    result.missingDataInputPortIds = missingDataInputPortIds;
    result.needsFlowSignal = (missingDataInputPortIds.length === 0 || missingDataInputPortIds.every(id => node.inputs.find(p=>p.id === id)?.dataType !== PortDataType.FLOW)) && 
                             hasConnectedFlowInput && !anyFlowInputSatisfiedForCurrentCheck && flowInputSpecificallyNeededButMissing;
    return result;
  }

  if (hasConnectedFlowInput && !anyFlowInputSatisfiedForCurrentCheck) {
    const missingFlowPorts = node.inputs 
      .filter(p => {
        if (p.dataType !== PortDataType.FLOW) return false;
        const pConfig = node.data?.portConfigs?.[p.id] as NodePortConfig | undefined;
        if (pConfig?.isAlwaysActive) return false; 
        if (!currentConnections.some(c => c.target.nodeId === node.id && c.target.portId === p.id)) return false; 
        const portSignalKey = `${node.id}-${p.id}`;
        const signals = activeFlowSignals.get(portSignalKey);
        return !signals || signals.length === 0;
      })
      .map(p => p.id);
    
    if (missingFlowPorts.length > 0) { 
        result.missingDataInputPortIds = missingFlowPorts; 
        result.needsFlowSignal = true;
        return result;
    }
  }
  
  result.canExecute = true;
  result.inputs = collectedInputsForExecutor;
  result.consumedSources = consumedSourcesForInvocation;
  
  return result;
};