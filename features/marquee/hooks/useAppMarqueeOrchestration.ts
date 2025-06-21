
import { useState, useCallback } from 'react';
import { NodeManagerAccess } from '../../../hooks/useWorkflowTabsManager';
import { WorkflowHistoryManagerOutput } from '../../history/useWorkflowHistoryManager';
import { HistoryActionType } from '../../history/historyTypes';

interface UseAppMarqueeOrchestrationProps {
  nodeManagerAccess: NodeManagerAccess;
  workflowHistoryManager: WorkflowHistoryManagerOutput;
  isMKeyPressed: boolean; // From global App state
  isDefiningAreaActive: boolean; // To avoid conflict
  deactivateDefiningAreaMode: () => void;
  deactivateNodeTypeToPlaceMode: () => void;
  deselectConnectionMode: () => void;
  deselectDefinedAreaMode: () => void;
}

export interface AppMarqueeOrchestrationOutput {
  isMarqueeSelectActiveForCanvas: boolean; // Combines one-shot and M-key
  appHandleStartMarqueeSelectInternal: () => void; // For menu one-shot activation
  appHandleSelectNodesByMarqueeInternal: (nodeIdsToSelect: string[]) => void;
  setIsMarqueeSelectModeActiveInternal: (isActive: boolean) => void; // To allow external deactivation
}

export const useAppMarqueeOrchestration = ({
  nodeManagerAccess,
  workflowHistoryManager,
  isMKeyPressed,
  isDefiningAreaActive,
  deactivateDefiningAreaMode,
  deactivateNodeTypeToPlaceMode,
  deselectConnectionMode,
  deselectDefinedAreaMode,
}: UseAppMarqueeOrchestrationProps): AppMarqueeOrchestrationOutput => {
  const [isMarqueeSelectModeActiveInternal, setIsMarqueeSelectModeActiveInternalState] = useState(false);

  const isMarqueeSelectActiveForCanvas = isMarqueeSelectModeActiveInternal || isMKeyPressed;

  const appHandleStartMarqueeSelectInternal = useCallback(() => {
    setIsMarqueeSelectModeActiveInternalState(true);
    // Deactivate other potentially conflicting modes
    nodeManagerAccess.selectNode(null, false);
    deactivateNodeTypeToPlaceMode();
    deselectConnectionMode();
    deselectDefinedAreaMode();
    if (isDefiningAreaActive) {
      deactivateDefiningAreaMode();
    }
  }, [
    nodeManagerAccess,
    deactivateNodeTypeToPlaceMode,
    deselectConnectionMode,
    deselectDefinedAreaMode,
    isDefiningAreaActive,
    deactivateDefiningAreaMode,
  ]);

  const appHandleSelectNodesByMarqueeInternal = useCallback((nodeIdsToSelect: string[]) => {
    const currentSelectedNodes = [...nodeManagerAccess.getSelectedNodeIds()];
    let selectionChanged = false;

    if (isMKeyPressed) { // Additive mode if M key is held
      const actuallyAdded = nodeIdsToSelect.filter(id => !currentSelectedNodes.includes(id));
      if (actuallyAdded.length > 0) {
        nodeManagerAccess.addNodesToSelection(actuallyAdded); // Use addNodesToSelection
        selectionChanged = true;
        workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_SELECT_MARQUEE, {
          selectedNodeIds: actuallyAdded, // Log only newly added nodes
          mode: 'additive',
        });
      }
    } else { // Replace mode if M key is not held (one-shot or M key released during drag)
      const newSelectionIsDifferent =
        nodeIdsToSelect.length !== currentSelectedNodes.length ||
        !nodeIdsToSelect.every(id => currentSelectedNodes.includes(id));

      if (newSelectionIsDifferent) {
        nodeManagerAccess.selectNode(null, false); // Clear existing selection
        nodeIdsToSelect.forEach((id, index) => {
          nodeManagerAccess.selectNode(id, index > 0); // Select first normally, others with shift
        });
        selectionChanged = true;
        workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_SELECT_MARQUEE, {
          selectedNodeIds: nodeIdsToSelect,
          mode: 'replace',
        });
      }
    }
    
    // If it was a one-shot mode (not M-key hold), deactivate it after selection.
    if (!isMKeyPressed && isMarqueeSelectModeActiveInternal) {
      setIsMarqueeSelectModeActiveInternalState(false);
    }
  }, [
    isMKeyPressed,
    isMarqueeSelectModeActiveInternal,
    nodeManagerAccess,
    workflowHistoryManager,
  ]);
  
  const setIsMarqueeSelectModeActiveInternal = useCallback((isActive: boolean) => {
    setIsMarqueeSelectModeActiveInternalState(isActive);
  }, []);

  return {
    isMarqueeSelectActiveForCanvas,
    appHandleStartMarqueeSelectInternal,
    appHandleSelectNodesByMarqueeInternal,
    setIsMarqueeSelectModeActiveInternal,
  };
};
