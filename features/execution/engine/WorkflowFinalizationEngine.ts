import { Node, NodeTypeDefinition, NodeExecutionState } from '../../../types';
import { Connection } from '../../connections/types/connectionTypes';
import { PortDataCacheEntry, UpstreamSourceInfo } from './PropagationEngine';
import { CheckNodeDependenciesResult } from './executionEngineTypes';
import { checkNodeDependencies } from './DependencyEngine'; // Corrected import path

/**
 * Finalizes the execution states of all nodes in the workflow after the primary execution paths
 * (originating from start nodes) have completed or errored.
 *
 * This function iterates through nodes that weren't explicitly completed or errored during the run.
 * For each such node, it checks its dependencies based on the final state of data caches and flow signals.
 * It then updates the node's UI state to reflect whether it's paused (missing data),
 * waiting (missing flow signal), or idle (if dependencies are met but it wasn't triggered, or no inputs).
 *
 * @param getNodes Function to get all nodes in the workflow.
 * @param getNodeDefinition Function to get a node's definition by its type.
 * @param getConnections Function to get all connections in the workflow.
 * @param portDataCache The final state of the port data cache.
 * @param activeFlowSignals The final state of active flow signals.
 * @param onNodeStateChange Callback to update a node's execution state in the UI.
 * @param completedOrErroredInThisRun A set containing IDs of nodes that were successfully executed to completion or errored during the run.
 */
export const finalizeWorkflowNodeStates = (
  getNodes: () => Node[], 
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined,
  getConnections: () => Connection[], 
  portDataCache: Map<string, PortDataCacheEntry[]>,
  activeFlowSignals: Map<string, UpstreamSourceInfo[]>,
  onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
  completedOrErroredInThisRun: Set<string>
): void => {
  const currentNodes = getNodes(); 

  currentNodes.forEach(node => {
    const currentState = node.executionState; 

    if (completedOrErroredInThisRun.has(node.id)) {
      if (currentState && currentState.status !== 'running' && currentState.activeExecutionContextId) {
        onNodeStateChange(node.id, { ...currentState, activeExecutionContextId: undefined });
      }
      return;
    }

    const definition = getNodeDefinition(node.type);
    if (!definition || definition.inputs.length === 0) {
      if (currentState?.status !== 'completed' && currentState?.status !== 'error') {
        const newIdleState: NodeExecutionState = {
          status: 'idle',
          executionDetails: currentState?.executionDetails,
          activeExecutionContextId: undefined, 
        };
        onNodeStateChange(node.id, newIdleState);
      } else if (currentState && currentState.activeExecutionContextId) {
         onNodeStateChange(node.id, { ...currentState, activeExecutionContextId: undefined });
      }
      return;
    }

    const depCheck: CheckNodeDependenciesResult = checkNodeDependencies(
      node,
      definition,
      getConnections, 
      portDataCache,
      activeFlowSignals,
      getNodes, // Pass getter
      getNodeDefinition // Pass getter
    );

    let statusToSet: NodeExecutionState['status'] = currentState?.status || 'idle';
    let errorToSet: string | undefined = currentState?.error;
    let missingInputsToSet: string[] | undefined = currentState?.missingInputs;
    let needsFlowToSet: boolean | undefined = currentState?.needsFlowSignal;
    let satisfiedInputsToSet: string[] | undefined = currentState?.satisfiedInputPortIds;
    let activeContextIdToSet: string | undefined = undefined; 

    if (!depCheck.canExecute) {
      statusToSet = depCheck.needsFlowSignal ? 'waiting' : 'paused';
      errorToSet = depCheck.needsFlowSignal
        ? 'Waiting for flow signal'
        : (depCheck.missingDataInputPortIds && depCheck.missingDataInputPortIds.length > 0
          ? `Waiting for data on ports: ${depCheck.missingDataInputPortIds.join(', ')}`
          : 'Workflow ended; dependencies not met.');
      missingInputsToSet = depCheck.missingDataInputPortIds;
      needsFlowToSet = depCheck.needsFlowSignal;
      satisfiedInputsToSet = depCheck.allSatisfiedInputPortIds;
    } else {
      statusToSet = 'idle';
      errorToSet = undefined;
      missingInputsToSet = undefined;
      needsFlowToSet = false;
      satisfiedInputsToSet = depCheck.allSatisfiedInputPortIds;
    }

    const needsUpdate =
      currentState?.status !== statusToSet ||
      currentState?.activeExecutionContextId !== activeContextIdToSet || 
      (statusToSet === 'idle' && (currentState?.error || currentState?.missingInputs || currentState?.needsFlowSignal !== false)) ||
      (statusToSet === 'paused' && (
        (currentState?.missingInputs?.join(',') !== missingInputsToSet?.join(',')) ||
        (currentState?.satisfiedInputPortIds?.join(',') !== satisfiedInputsToSet?.join(','))
      )) ||
      (statusToSet === 'waiting' && (
        currentState?.needsFlowSignal !== needsFlowToSet ||
        (currentState?.satisfiedInputPortIds?.join(',') !== satisfiedInputsToSet?.join(','))
      )) ||
      ( (statusToSet === 'paused' || statusToSet === 'waiting') && currentState?.portSpecificErrors !== undefined );

    if (needsUpdate) {
      const finalStateUpdate: NodeExecutionState = {
        status: statusToSet,
        error: errorToSet,
        missingInputs: missingInputsToSet,
        needsFlowSignal: needsFlowToSet,
        satisfiedInputPortIds: satisfiedInputsToSet,
        executionDetails: currentState?.executionDetails, 
        portSpecificErrors: (statusToSet === 'paused' || statusToSet === 'waiting')
          ? currentState?.portSpecificErrors
          : undefined,
        activeExecutionContextId: activeContextIdToSet,
      };
      onNodeStateChange(node.id, finalStateUpdate);
    } else if (currentState?.activeExecutionContextId) {
      onNodeStateChange(node.id, { ...currentState, activeExecutionContextId: undefined });
    }
  });
};