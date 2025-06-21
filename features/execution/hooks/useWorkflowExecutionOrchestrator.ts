
import { useState, useCallback } from 'react';
import { Node, NodeTypeDefinition, NodeExecutionState, PortDataType, RegisteredAiTool, Connection } from '../../../types'; // Added Connection, RegisteredAiTool
import { WorkflowExecutionManager } from '../WorkflowExecutionManager';
import { PortDataCacheEntry, UpstreamSourceInfo } from '../engine/PropagationEngine';

interface UseWorkflowExecutionOrchestratorProps {
  executionManager: WorkflowExecutionManager;
  getNodes: () => Node[];
  getConnections: () => Connection[]; 
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined;
  updateNodeData: (nodeId: string, dataUpdates: Record<string, any>) => void; 
  customTools?: RegisteredAiTool[]; 
  onConnectionUpdateCallback: (updatedConnection: Connection) => void; 
}

export const useWorkflowExecutionOrchestrator = ({
  executionManager,
  getNodes,
  getConnections, 
  getNodeDefinition,
  updateNodeData, 
  customTools, 
  onConnectionUpdateCallback, 
}: UseWorkflowExecutionOrchestratorProps) => {
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Map<string, NodeExecutionState>>(new Map());
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);

  const handleNodeStateChange = useCallback((nodeId: string, state: NodeExecutionState) => {
    setNodeExecutionStates(prevStates => {
      const newStates = new Map(prevStates);
      const existingState = prevStates.get(nodeId);

      let mergedExecutionDetails = existingState?.executionDetails;
      if (state.status === 'error' || state.status === 'completed' || state.executionDetails) {
          mergedExecutionDetails = {
            ...(existingState?.executionDetails || {}),
            ...(state.executionDetails || {})
          };
      }
      
      const updatedNodeState: NodeExecutionState = {
        status: state.status,
        error: state.error,
        missingInputs: state.missingInputs,
        needsFlowSignal: state.needsFlowSignal,
        satisfiedInputPortIds: state.satisfiedInputPortIds,
        portSpecificErrors: state.portSpecificErrors,
        executionDetails: mergedExecutionDetails,
        activeExecutionContextId: state.activeExecutionContextId,
      };
      newStates.set(nodeId, updatedNodeState);
      return newStates;
    });
  }, []);

  const handleNodeStateChangeBulk = useCallback((statesToUpdate: Map<string, NodeExecutionState>) => {
    setNodeExecutionStates(prevStates => {
      const newStates = new Map(prevStates);
      statesToUpdate.forEach((state, nodeId) => {
        const existingState = prevStates.get(nodeId);
        let mergedExecutionDetails = existingState?.executionDetails;
         if (state.status === 'error' || state.status === 'completed' || state.executionDetails) {
            mergedExecutionDetails = {
                ...(existingState?.executionDetails || {}),
                ...(state.executionDetails || {})
            };
        }
        const updatedNodeState: NodeExecutionState = {
          status: state.status,
          error: state.error,
          missingInputs: state.missingInputs,
          needsFlowSignal: state.needsFlowSignal,
          satisfiedInputPortIds: state.satisfiedInputPortIds,
          portSpecificErrors: state.portSpecificErrors,
          executionDetails: mergedExecutionDetails,
          activeExecutionContextId: state.activeExecutionContextId,
        };
        newStates.set(nodeId, updatedNodeState);
      });
      return newStates;
    });
  }, []);


  const handleRunWorkflow = useCallback(async () => {
    if (isWorkflowRunning) return;
    setIsWorkflowRunning(true);

    // getNodes and getConnections are already functions returning live data
    const initialNodesForDisplay = getNodes(); 
    const initialExecutionStatesForDisplay = new Map<string, NodeExecutionState>();
    initialNodesForDisplay.forEach(node => {
      const existingDetails = nodeExecutionStates.get(node.id)?.executionDetails;
      initialExecutionStatesForDisplay.set(node.id, {
        status: 'idle',
        executionDetails: existingDetails, 
        activeExecutionContextId: undefined, 
      });
    });
    setNodeExecutionStates(initialExecutionStatesForDisplay);
    
    try {
      await executionManager.runWorkflow(
        getNodes, // Pass the getter function
        getConnections, // Pass the getter function
        getNodeDefinition,
        handleNodeStateChange,
        updateNodeData, 
        onConnectionUpdateCallback, 
        customTools 
      );
    } catch (error) {
      console.error("Workflow execution failed:", error);
       setNodeExecutionStates(prevStates => {
        const newStates = new Map(prevStates);
        newStates.forEach((state, id) => {
          if (state.status === 'running') { 
            newStates.set(id, { ...state, status: 'error', error: 'Workflow failed during execution.', activeExecutionContextId: undefined });
          }
        });
        return newStates;
      });
    } finally {
      setIsWorkflowRunning(false);
    }
  }, [
    isWorkflowRunning, executionManager, getNodes, getConnections,
    getNodeDefinition, handleNodeStateChange, updateNodeData, nodeExecutionStates, customTools, onConnectionUpdateCallback
  ]);

  const handleTerminateWorkflow = useCallback(() => {
    if (isWorkflowRunning) {
      executionManager.requestTermination();
      // isWorkflowRunning will be set to false in handleRunWorkflow's finally block
    }
  }, [isWorkflowRunning, executionManager]);

  const getQueuedInputsForDownstreamPort = useCallback((
    downstreamNodeId: string,
    downstreamInputPortId: string,
    dataType: PortDataType
  ): Array<PortDataCacheEntry | UpstreamSourceInfo> | undefined => {
    if (dataType === PortDataType.FLOW) {
      return executionManager.getQueuedFlowSignalsForInputPort(downstreamNodeId, downstreamInputPortId);
    } else {
      return executionManager.getQueuedDataForInputPort(downstreamNodeId, downstreamInputPortId);
    }
  }, [executionManager]);

  const getUpstreamNodeVisualStateManager = useCallback(
    () => executionManager.getUpstreamNodeVisualStateManager(),
    [executionManager]
  );
  
  const getLiveNodeExecutionStates = useCallback(() => nodeExecutionStates, [nodeExecutionStates]);
  
  const getConnectionsMethodForReturn = useCallback((_optionalArg?: any) => {
    return getConnections();
  }, [getConnections]);

  const handleClearAllNodeExecutionHighlights = useCallback(() => {
    const nodes = getNodes();
    executionManager.clearAllNodeExecutionHighlights(nodes, handleNodeStateChange);
  }, [executionManager, getNodes, handleNodeStateChange]);


  return {
    nodeExecutionStates,
    isWorkflowRunning,
    handleNodeStateChange,
    handleNodeStateChangeBulk, 
    handleRunWorkflow,
    handleTerminateWorkflow, // Added
    getQueuedInputsForDownstreamPort,
    getUpstreamNodeVisualStateManager,
    getLiveNodeExecutionStates,
    getConnections: getConnectionsMethodForReturn, 
    handleClearAllNodeExecutionHighlights, 
  };
};
