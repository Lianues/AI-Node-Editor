import { Node, NodeTypeDefinition, NodeExecutionState, PortDataType } from '../../../types';
import { Connection } from '../../connections/types/connectionTypes';
import { START_NODE_TYPE_KEY } from '../../../nodes/Start/Definition';
import { InvocationRequest, CheckNodeDependenciesResult } from './executionEngineTypes'; 
import { checkNodeDependencies } from './DependencyEngine';
import { UpstreamNodeVisualStateManager, UpstreamDataState } from './UpstreamNodeVisualStateManager';

export interface UpstreamSourceInfo { 
  upstreamNodeId: string;
  upstreamOutputPortId: string;
  executionContextId?: string; 
  sendTimestamp?: number; 
}
export interface PortDataCacheEntry extends UpstreamSourceInfo { 
  value: any;
  upstreamPortDataType: PortDataType; 
  sendTimestamp: number; 
}

/**
 * Propagates outputs from an executed node, updates caches/signals,
 * and prepares invocation requests for ready connected nodes.
 * This function is direction-agnostic regarding graph layout; it processes any node
 * whose inputs are satisfied by the executedNode's outputs.
 */
export const propagateOutputsAndPrepareConnectedNodeRequests = (
  executedNode: Node,
  outputs: Record<string, any>, 
  overallSendTimestamp: number, 
  getConnections: () => Connection[], 
  getNodes: () => Node[], 
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
  portDataCache: Map<string, PortDataCacheEntry[]>, 
  activeFlowSignals: Map<string, UpstreamSourceInfo[]>, 
  onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
  nodeExecutionInProgress: ReadonlySet<string>, 
  upstreamVisualStateManager: UpstreamNodeVisualStateManager,
  currentExecutionContextId?: string 
): InvocationRequest[] => {
  const logPrefix = `[PropagationEngine SW_ID:${executedNode.data?.subWorkflowId || 'Main'}]`;
  const affectedConnectedNodes = new Set<string>();
  const readyConnectedNodeRequests: InvocationRequest[] = [];
  
  const currentConnections = getConnections(); 
  const currentAllNodes = getNodes(); 

  for (const outputPortId in outputs) {
    const outputValue = outputs[outputPortId];

    currentConnections.forEach(conn => {
      if (conn.source.nodeId === executedNode.id && conn.source.portId === outputPortId) {
        const targetNode = currentAllNodes.find(n => n.id === conn.target.nodeId);
        if (targetNode) {
          const targetPortKey = `${targetNode.id}-${conn.target.portId}`;
          
          let targetPortDefinition = targetNode.inputs.find(p => p.id === conn.target.portId);
          if (!targetPortDefinition) {
            const targetNodeDefType = getNodeDefinition(targetNode.type);
            targetPortDefinition = targetNodeDefType?.inputs.find(p => p.id === conn.target.portId);
          }
          
          const upstreamSourceInfoBase = {
            upstreamNodeId: conn.source.nodeId,
            upstreamOutputPortId: conn.source.portId,
            executionContextId: currentExecutionContextId,
          };

          if (targetPortDefinition?.dataType === PortDataType.FLOW) {
            if (typeof outputValue === 'object' && outputValue?.flowSignal === true) {
              if (!activeFlowSignals.has(targetPortKey)) {
                activeFlowSignals.set(targetPortKey, []);
              }
              activeFlowSignals.get(targetPortKey)!.push({
                ...upstreamSourceInfoBase,
                sendTimestamp: overallSendTimestamp, 
              });
            }
          } else { 
            if (!portDataCache.has(targetPortKey)) {
              portDataCache.set(targetPortKey, []);
            }
            const cacheEntry: PortDataCacheEntry = {
              ...upstreamSourceInfoBase,
              sendTimestamp: overallSendTimestamp, 
              value: outputValue, 
              upstreamPortDataType: conn.source.dataType, 
            };
            portDataCache.get(targetPortKey)!.push(cacheEntry);
          }
          affectedConnectedNodes.add(targetNode.id);
          
          const isTargetNodeCurrentlyExecuting = nodeExecutionInProgress.has(targetNode.id);
          let isTargetNodeWaitingForOtherInputsIfItWereNotExecuting = false;
          
          if (targetPortDefinition) { 
            const targetNodeDefinitionFromType = getNodeDefinition(targetNode.type);
            if (targetNodeDefinitionFromType) {
              const depCheck = checkNodeDependencies(
                targetNode, 
                targetNodeDefinitionFromType, 
                getConnections, 
                portDataCache, 
                activeFlowSignals,
                getNodes, // Pass getter
                getNodeDefinition // Pass getter
              );
              isTargetNodeWaitingForOtherInputsIfItWereNotExecuting = !depCheck.canExecute && 
                                                (!!depCheck.missingDataInputPortIds?.length || !!depCheck.needsFlowSignal);
            }
          }
          
          upstreamVisualStateManager.notifyDataPropagation(
            executedNode.id,
            outputPortId,
            targetNode.id,
            conn.target.portId,
            isTargetNodeCurrentlyExecuting, 
            isTargetNodeWaitingForOtherInputsIfItWereNotExecuting
          );
        }
      }
    });
  }

  affectedConnectedNodes.forEach(nodeId => {
    const nodeToPotentiallyQueue = currentAllNodes.find(n => n.id === nodeId);
    if (nodeToPotentiallyQueue && nodeToPotentiallyQueue.type !== START_NODE_TYPE_KEY) {
      const definition = getNodeDefinition(nodeToPotentiallyQueue.type);
      if (definition) {
        const depCheckResult: CheckNodeDependenciesResult = checkNodeDependencies(
          nodeToPotentiallyQueue, 
          definition, 
          getConnections, 
          portDataCache, 
          activeFlowSignals,
          getNodes, // Pass getter
          getNodeDefinition // Pass getter
        );
        
        const isTargetNodeCurrentlyExecuting = nodeExecutionInProgress.has(nodeToPotentiallyQueue.id);

        if (depCheckResult.canExecute && depCheckResult.inputs !== null && depCheckResult.consumedSources) {
          // Node is ready to execute.
          // If it's not currently busy, its state is 'idle' (or 'waiting' if it was just a flow signal that made it ready).
          // If it IS busy, it will be queued, so its state shouldn't be changed from 'running' here.
          if (!isTargetNodeCurrentlyExecuting) {
            const existingDetails = nodeToPotentiallyQueue.executionState?.executionDetails;
            onNodeStateChange(nodeToPotentiallyQueue.id, { 
              status: 'idle', 
              executionDetails: existingDetails,
              satisfiedInputPortIds: depCheckResult.allSatisfiedInputPortIds,
              missingInputs: undefined,
              needsFlowSignal: false,
              portSpecificErrors: undefined,
              error: undefined,
              activeExecutionContextId: depCheckResult.triggeringExecutionContextId, 
            });
          }
          const invocationRequest: InvocationRequest = {
            nodeId: nodeToPotentiallyQueue.id,
            inputs: depCheckResult.inputs,
            consumedSources: depCheckResult.consumedSources,
            executionContextId: depCheckResult.triggeringExecutionContextId, 
          };
          readyConnectedNodeRequests.push(invocationRequest);
        } else { 
          // Node is not ready to execute.
          // Only update its state (to paused/waiting) if it's not currently busy.
          if (!isTargetNodeCurrentlyExecuting) {
            const existingDetails = nodeToPotentiallyQueue.executionState?.executionDetails;
            onNodeStateChange(nodeToPotentiallyQueue.id, {
              status: depCheckResult.needsFlowSignal ? 'waiting' : 'paused',
              missingInputs: depCheckResult.missingDataInputPortIds,
              needsFlowSignal: depCheckResult.needsFlowSignal,
              satisfiedInputPortIds: depCheckResult.allSatisfiedInputPortIds,
              error: depCheckResult.needsFlowSignal ? 'Waiting for flow signal' : (depCheckResult.missingDataInputPortIds && depCheckResult.missingDataInputPortIds.length > 0 ? `Waiting for data on ports: ${depCheckResult.missingDataInputPortIds.join(', ')}` : 'Paused due to unmet dependencies'),
              executionDetails: existingDetails,
              portSpecificErrors: undefined, 
              activeExecutionContextId: depCheckResult.triggeringExecutionContextId,
            });
          }
        }
      }
    }
  });
  
  return readyConnectedNodeRequests;
};