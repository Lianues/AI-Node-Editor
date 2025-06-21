import { NodeExecutionState } from '../../../types';

export type UpstreamDataState = 
  | 'idle'                      // Default state, or after data has been fully processed and downstream is idle.
  | 'queued_at_downstream'      // Data sent, downstream node is busy with another task.
  | 'waiting_for_downstream_others' // Data sent, downstream node is idle but waiting for its other inputs.
  | 'consumed_by_downstream';   // Downstream node has started processing this specific data.

interface UpstreamPortOutputState {
  downstreamNodeId: string;
  downstreamPortId: string;
  status: UpstreamDataState;
}

// Stores the state of data sent from each output port of an upstream node
// to each connected downstream input port.
// Map<upstreamNodeId, Map<outputPortId, UpstreamPortOutputState[]>>
// An output port can connect to multiple downstream input ports.
type VisualStatesMap = Map<string, Map<string, UpstreamPortOutputState[]>>;


export class UpstreamNodeVisualStateManager {
  private visualStates: VisualStatesMap = new Map();

  public clearStates(): void {
    this.visualStates.clear();
  }

  public notifyDataPropagation(
    upstreamNodeId: string,
    upstreamOutputPortId: string,
    downstreamNodeId: string,
    downstreamPortId: string,
    isDownstreamNodeCurrentlyExecuting: boolean, 
    isDownstreamNodeWaitingForOtherInputsIfItWereNotExecuting: boolean
  ): void {
    if (!this.visualStates.has(upstreamNodeId)) {
      this.visualStates.set(upstreamNodeId, new Map());
    }
    const upstreamNodeOutputs = this.visualStates.get(upstreamNodeId)!;
    if (!upstreamNodeOutputs.has(upstreamOutputPortId)) {
      upstreamNodeOutputs.set(upstreamOutputPortId, []);
    }
    const outputPortConnections = upstreamNodeOutputs.get(upstreamOutputPortId)!;

    let newState: UpstreamDataState;
    
    // This condition means: "If the downstream node *were* not busy, would its dependencies be met by this input?"
    // OR, "Is this input the only thing the downstream node is waiting for (ignoring its current execution status)?"
    const canDownstreamExecuteIfItWereNotBusy = !isDownstreamNodeWaitingForOtherInputsIfItWereNotExecuting;

    if (canDownstreamExecuteIfItWereNotBusy && isDownstreamNodeCurrentlyExecuting) {
      newState = 'queued_at_downstream'; // Executable, but busy -> queued
    } else if (isDownstreamNodeWaitingForOtherInputsIfItWereNotExecuting) {
      newState = 'waiting_for_downstream_others'; // Still waiting for other inputs, regardless of current execution
    } else {
      newState = 'consumed_by_downstream'; // All deps met AND not busy (or about to consume it)
    }
    
    const existingIndex = outputPortConnections.findIndex(
      s => s.downstreamNodeId === downstreamNodeId && s.downstreamPortId === downstreamPortId
    );
    if (existingIndex > -1) {
      outputPortConnections[existingIndex].status = newState;
    } else {
      outputPortConnections.push({
        downstreamNodeId,
        downstreamPortId,
        status: newState,
      });
    }
  }

  public notifySpecificLinkConsumption(
    upstreamNodeId: string,
    upstreamOutputPortId: string,
    consumingDownstreamNodeId: string,
    consumedDownstreamInputPortId: string
  ): void {
    const outputPortMap = this.visualStates.get(upstreamNodeId);
    if (outputPortMap) {
      const connectionStates = outputPortMap.get(upstreamOutputPortId);
      if (connectionStates) {
        const specificState = connectionStates.find(
          s => s.downstreamNodeId === consumingDownstreamNodeId && s.downstreamPortId === consumedDownstreamInputPortId
        );
        if (specificState) {
          if (specificState.status !== 'consumed_by_downstream') {
            specificState.status = 'consumed_by_downstream';
          }
        } else {
           connectionStates.push({
            downstreamNodeId: consumingDownstreamNodeId,
            downstreamPortId: consumedDownstreamInputPortId,
            status: 'consumed_by_downstream',
          });
        }
      }
    }
  }

  public getIsInputPortDataQueued(downstreamNodeId: string, downstreamInputPortId: string): boolean {
    for (const [_upNodeId, upstreamNodeOutputs] of this.visualStates.entries()) {
      for (const [_upOutputPortId, outputPortConnections] of upstreamNodeOutputs.entries()) {
        for (const connState of outputPortConnections) {
          if (connState.downstreamNodeId === downstreamNodeId &&
              connState.downstreamPortId === downstreamInputPortId) {
            if (connState.status === 'queued_at_downstream') {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  public getUpstreamNodeOverallVisualState(nodeId: string): UpstreamDataState {
    const outputPortMap = this.visualStates.get(nodeId);
    if (!outputPortMap || outputPortMap.size === 0) {
      return 'idle'; 
    }

    let hasQueued = false;
    let hasWaiting = false;
    let allTrackedAreConsumedOrIdle = true; 
    let hasAnyActiveTracked = false; 

    for (const connectionStates of outputPortMap.values()) {
        if (connectionStates.length > 0) {
            for (const state of connectionStates) {
                if (state.status !== 'idle') { 
                    hasAnyActiveTracked = true;
                }
                if (state.status === 'queued_at_downstream') hasQueued = true;
                if (state.status === 'waiting_for_downstream_others') hasWaiting = true;
                if (state.status !== 'consumed_by_downstream' && state.status !== 'idle') {
                    allTrackedAreConsumedOrIdle = false;
                }
            }
        }
    }
    
    if (!hasAnyActiveTracked) return 'idle'; 
    if (hasQueued) return 'queued_at_downstream';
    if (hasWaiting) return 'waiting_for_downstream_others';
    if (allTrackedAreConsumedOrIdle) return 'consumed_by_downstream'; 
    
    return 'idle'; 
  }
}