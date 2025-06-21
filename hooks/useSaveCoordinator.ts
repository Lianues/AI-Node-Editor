
import { useCallback } from 'react';
import { Tab, NodeExecutionState } from '../types';

interface UseSaveCoordinatorProps {
  getActiveTabId: () => string | null;
  getActiveTab: () => Tab | null;
  handleSubWorkflowPostTabSave: (tabId: string) => void;
  getLiveNodeExecutionStates: () => Map<string, NodeExecutionState>;
  persistCurrentlyActiveTabStateAsSaved: (liveStates: Map<string, NodeExecutionState>) => void;
  updateTabUnsavedState: (tabId: string, isUnsaved: boolean) => void;
  performFileSave: () => Promise<void>;
}

export const useSaveCoordinator = ({
  getActiveTabId,
  getActiveTab,
  handleSubWorkflowPostTabSave,
  getLiveNodeExecutionStates,
  persistCurrentlyActiveTabStateAsSaved,
  updateTabUnsavedState,
  performFileSave,
}: UseSaveCoordinatorProps) => {
  const saveActivePage = useCallback(async () => {
    const activeTabId = getActiveTabId();
    if (!activeTabId) {
      console.warn("[SaveCoordinator] saveActivePage: No active tab ID.");
      return;
    }
    const activeTab = getActiveTab();

    if (!activeTab) {
      console.warn("[SaveCoordinator] saveActivePage: Active tab not found for ID:", activeTabId);
      return;
    }

    if (activeTab.type === 'subworkflow') {
      handleSubWorkflowPostTabSave(activeTabId);
      const liveStates = getLiveNodeExecutionStates();
      persistCurrentlyActiveTabStateAsSaved(liveStates);
      updateTabUnsavedState(activeTabId, false);
    } else {
      // For 'workflow' or other types that use the project file system
      await performFileSave();
      // The performFileSave (handleSaveActivePageFile from AppProjectFileOrchestration)
      // is expected to handle persisting state and updating unsaved status for its file types.
    }
  }, [
    getActiveTabId,
    getActiveTab,
    handleSubWorkflowPostTabSave,
    getLiveNodeExecutionStates,
    persistCurrentlyActiveTabStateAsSaved,
    updateTabUnsavedState,
    performFileSave,
  ]);

  return {
    saveActivePage,
  };
};
