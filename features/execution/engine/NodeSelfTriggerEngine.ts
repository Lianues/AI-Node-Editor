import { Node, NodeTypeDefinition, PortDataType } from '../../../types';
import { Connection } from '../../connections/types/connectionTypes';
import { InvocationRequest, CheckNodeDependenciesResult } from './executionEngineTypes';
import { PortDataCacheEntry, UpstreamSourceInfo } from './PropagationEngine';
import { checkNodeDependencies } from './DependencyEngine';

const hasAnyPendingDataForNodeInternal = (
  nodeId: string, 
  nodeDefinition: NodeTypeDefinition,
  portDataCache: Map<string, PortDataCacheEntry[]>
): boolean => {
  for (const portDef of nodeDefinition.inputs) {
    if (portDef.dataType !== PortDataType.FLOW) {
      const portKey = `${nodeId}-${portDef.id}`;
      if (portDataCache.has(portKey) && portDataCache.get(portKey)!.length > 0) {
        return true;
      }
    }
  }
  return false;
};

const hasAnyPendingSignalForNodeInternal = (
  nodeId: string, 
  nodeDefinition: NodeTypeDefinition,
  activeFlowSignals: Map<string, UpstreamSourceInfo[]>
): boolean => {
  for (const portDef of nodeDefinition.inputs) {
    if (portDef.dataType === PortDataType.FLOW) {
      const portKey = `${nodeId}-${portDef.id}`;
      if (activeFlowSignals.has(portKey) && activeFlowSignals.get(portKey)!.length > 0) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Checks if a node has pending inputs and, if so, prepares an InvocationRequest for self-triggering.
 * @param node The node that just finished an execution.
 * @param nodeDefinition The definition of the node.
 * @param getConnections Function to get current connections.
 * @param portDataCache Current state of the port data cache.
 * @param activeFlowSignals Current state of active flow signals.
 * @param currentExecutionContextId The execution context ID of the current execution wave.
 * @param getNodes Function to get current nodes. 
 * @param getNodeDefinition Function to get a node's definition by its type. 
 * @returns An InvocationRequest if the node can self-trigger, otherwise null.
 */
export const checkAndPrepareSelfTriggerRequest = (
  node: Node,
  nodeDefinition: NodeTypeDefinition,
  getConnections: () => Connection[], 
  portDataCache: Map<string, PortDataCacheEntry[]>,
  activeFlowSignals: Map<string, UpstreamSourceInfo[]>,
  currentExecutionContextId?: string,
  getNodes?: () => Node[], // Added
  getNodeDefinition?: (type: string) => NodeTypeDefinition | undefined // Added
): InvocationRequest | null => {
  if (!getNodes || !getNodeDefinition) {
    // console.warn("[NodeSelfTriggerEngine] getNodes or getNodeDefinition not provided. Cannot check for self-trigger.");
    return null;
  }

  if (hasAnyPendingDataForNodeInternal(node.id, nodeDefinition, portDataCache) || 
      hasAnyPendingSignalForNodeInternal(node.id, nodeDefinition, activeFlowSignals)) {
    
    const selfDepCheck: CheckNodeDependenciesResult = checkNodeDependencies(
      node, 
      nodeDefinition, 
      getConnections, 
      portDataCache, 
      activeFlowSignals,
      getNodes, // Pass getter
      getNodeDefinition // Pass getter
    );

    if (selfDepCheck.canExecute && selfDepCheck.inputs !== null && selfDepCheck.consumedSources) {
      const selfRequest: InvocationRequest = {
        nodeId: node.id,
        inputs: selfDepCheck.inputs,
        consumedSources: selfDepCheck.consumedSources,
        executionContextId: selfDepCheck.triggeringExecutionContextId, 
      };
      return selfRequest;
    }
  }
  return null;
};