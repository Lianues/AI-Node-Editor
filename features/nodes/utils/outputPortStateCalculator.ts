import { Node as NodeType, NodePort as NodePortType, NodeTypeDefinition, NodeExecutionState, PortDataType } from '../../../types';
import { Connection } from '../../connections/types/connectionTypes';
import { PortDataCacheEntry, UpstreamSourceInfo } from '../../execution/engine/PropagationEngine';

export interface OutputPortStateResult {
  queueRank?: number; // For overall (cyan) queue
  isPrimaryQueuedItem?: boolean; // For overall (cyan) queue
  isReflectingDownstreamError?: boolean; // Red
  isReflectingDownstreamWaiting?: boolean; // Orange
  reflectingDownstreamSatisfiedWaitingRank?: number; // Green, ranked
}

export function calculateOutputPortState(
  outputPort: NodePortType,
  parentNode: NodeType,
  connections: Connection[],
  allNodes: NodeType[],
  nodeExecutionStates: Map<string, NodeExecutionState>,
  getQueuedInputsForDownstreamPort: (
    downstreamNodeId: string,
    downstreamInputPortId: string,
    dataType: PortDataType
  ) => Array<PortDataCacheEntry | UpstreamSourceInfo> | undefined,
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined
): OutputPortStateResult {
  let minOverallQueueRank: number | undefined = undefined;
  let isPrimaryInAnyOverallQueue = false;

  let isReflectingErrorOverall = false;
  let isReflectingWaitingOrangeOverall = false;
  let bestReflectedSatisfiedWaitingRank: number | undefined = undefined;

  const outgoingConnections = connections.filter(
    conn => conn.source.nodeId === parentNode.id && conn.source.portId === outputPort.id
  );

  for (const conn of outgoingConnections) {
    // --- 1. Calculate Overall Queue Status (for Cyan ring) ---
    const overallQueue = getQueuedInputsForDownstreamPort(conn.target.nodeId, conn.target.portId, conn.target.dataType);
    if (overallQueue) {
      const rankInThisOverallQueue = overallQueue.findIndex(
        entry => entry.upstreamNodeId === parentNode.id && entry.upstreamOutputPortId === outputPort.id
      );
      if (rankInThisOverallQueue !== -1) {
        const actualOverallRank = rankInThisOverallQueue + 1;
        if (minOverallQueueRank === undefined || actualOverallRank < minOverallQueueRank) {
          minOverallQueueRank = actualOverallRank;
        }
        if (actualOverallRank === 1) {
          isPrimaryInAnyOverallQueue = true;
        }
      }
    }

    // --- 2. Calculate Downstream Port Status Reflection (for Red, Orange, Green rings) ---
    const targetNodeState = nodeExecutionStates.get(conn.target.nodeId);
    if (targetNodeState) {
      const targetNodeInstance = allNodes.find(n => n.id === conn.target.nodeId);
      if (targetNodeInstance) {
        const targetNodeDef = getNodeDefinition(targetNodeInstance.type);
        const targetPortDefinition = targetNodeDef?.inputs.find(p => p.id === conn.target.portId);

        // Check for RED: Downstream Port Error
        if (targetNodeState.portSpecificErrors?.some(e => e.portId === conn.target.portId)) {
          isReflectingErrorOverall = true;
          // If one connection leads to error reflection, this output port will reflect error.
          // Stop checking other reflection types for this connection, but continue loop for other connections.
        }

        // Only proceed to check Orange/Green if not already reflecting an error from ANY connection for this output port.
        if (!isReflectingErrorOverall && targetPortDefinition) {
          // Check for ORANGE: Downstream Port is directly waiting for THIS input
          const isTargetPortDirectlyWaitingForThisInput =
            (targetNodeState.missingInputs?.includes(conn.target.portId)) ||
            (targetPortDefinition.dataType === PortDataType.FLOW &&
             targetNodeState.needsFlowSignal &&
             !targetNodeState.satisfiedInputPortIds?.includes(conn.target.portId));

          if (isTargetPortDirectlyWaitingForThisInput) {
            isReflectingWaitingOrangeOverall = true;
             // Orange reflection found. Continue checking other connections in case one causes an error (which takes precedence).
          } else if (!isReflectingWaitingOrangeOverall) { 
            // Check for GREEN: Downstream Port is "satisfied but waiting for other inputs"
            // This means the current connection's target port IS satisfied, but the target NODE is waiting for OTHER inputs.
            const isTargetPortSatisfied = targetNodeState.satisfiedInputPortIds?.includes(conn.target.portId);
            
            let isTargetNodeWaitingForOtherInputs = false;
            if (targetNodeState.status === 'paused' || targetNodeState.status === 'waiting') {
                if (targetNodeState.missingInputs && targetNodeState.missingInputs.length > 0) {
                    // Check if there's any missing input that is NOT the current target port
                    if (targetNodeState.missingInputs.some(missingId => missingId !== conn.target.portId)) {
                        isTargetNodeWaitingForOtherInputs = true;
                    }
                }
                if (!isTargetNodeWaitingForOtherInputs && targetNodeState.needsFlowSignal) {
                    // If it needs a flow signal, check if it's for a port OTHER than the current target port
                    const flowInputs = targetNodeDef?.inputs.filter(p => p.dataType === PortDataType.FLOW) || [];
                    if (flowInputs.some(flowP => 
                        flowP.id !== conn.target.portId && // It's a different flow port
                        !targetNodeState.satisfiedInputPortIds?.includes(flowP.id) // And that different flow port is not satisfied
                    )) {
                        isTargetNodeWaitingForOtherInputs = true;
                    } else if (targetPortDefinition.dataType === PortDataType.FLOW && targetNodeState.satisfiedInputPortIds?.includes(conn.target.portId) && flowInputs.length > 1) {
                        // Special case: current target is a satisfied flow port, but node needsFlowSignal (must be for another flow port)
                        isTargetNodeWaitingForOtherInputs = true;
                    }
                }
            }


            if (isTargetPortSatisfied && isTargetNodeWaitingForOtherInputs) {
              const specificDownstreamQueue = getQueuedInputsForDownstreamPort(conn.target.nodeId, conn.target.portId, conn.target.dataType);
              if (specificDownstreamQueue) {
                const rankInSpecificQueue = specificDownstreamQueue.findIndex(
                  entry => entry.upstreamNodeId === parentNode.id && entry.upstreamOutputPortId === outputPort.id
                );
                if (rankInSpecificQueue !== -1) {
                  const actualRank = rankInSpecificQueue + 1;
                  if (bestReflectedSatisfiedWaitingRank === undefined || actualRank < bestReflectedSatisfiedWaitingRank) {
                    bestReflectedSatisfiedWaitingRank = actualRank;
                  }
                }
              }
            }
          }
        }
      }
    }
    // If an error state is found for this output port from any of its connections,
    // that's the highest priority reflection type, so we can stop checking other connections for reflection types.
    // However, we still need to calculate the overall queue rank (minOverallQueueRank) across all connections.
    if (isReflectingErrorOverall) {
        // We can break here if we only cared about the highest priority *reflection* type.
        // But since overall queue rank is independent, we must continue iterating all connections.
        // The prioritization of which *ring* to show happens in Port.tsx or by how these props are combined below.
    }
  }

  // Final determination of which reflection state takes precedence
  const reflectsError = isReflectingErrorOverall;
  const reflectsWaitingOrange = !reflectsError && isReflectingWaitingOrangeOverall;
  const reflectsSatisfiedWaitingRankValue = (!reflectsError && !reflectsWaitingOrange) ? bestReflectedSatisfiedWaitingRank : undefined;

  return {
    queueRank: minOverallQueueRank,
    isPrimaryQueuedItem: isPrimaryInAnyOverallQueue,
    isReflectingDownstreamError: reflectsError,
    isReflectingDownstreamWaiting: reflectsWaitingOrange,
    reflectingDownstreamSatisfiedWaitingRank: reflectsSatisfiedWaitingRankValue,
  };
}
