
import { useState, useCallback } from 'react';
import { SidebarItemId } from '../types';

export interface AppUIManagerOutput {
  activeSidebarItem: SidebarItemId | null;
  setActiveSidebarItemOptimized: (id: SidebarItemId | null | ((current: SidebarItemId | null) => SidebarItemId | null)) => void;
}

export const useAppUIManager = (): AppUIManagerOutput => {
  const [activeSidebarItem, setActiveSidebarItem] = useState<SidebarItemId | null>(SidebarItemId.NodeList);

  const setActiveSidebarItemOptimized = useCallback((
    idOrUpdater: SidebarItemId | null | ((current: SidebarItemId | null) => SidebarItemId | null)
  ) => {
    if (typeof idOrUpdater === 'function') {
      // If a function is passed, let it determine the new state.
      // This is used by handleSelectSidebarItem in useAppOrchestration for standard toggle.
      setActiveSidebarItem(idOrUpdater);
    } else {
      // If a direct ID is passed (like from handleShowProperties)
      setActiveSidebarItem(currentActiveId => {
        if (idOrUpdater === SidebarItemId.PropertyInspector) {
          // If property inspector is requested, ensure it's active.
          // If it's already active, it remains active. If not, it becomes active.
          return SidebarItemId.PropertyInspector;
        } else if (idOrUpdater === SidebarItemId.NodeList || idOrUpdater === SidebarItemId.ProjectFiles) {
          // Original toggle behavior for NodeList and ProjectFiles when their icon is clicked
          // or when they are set directly.
          return currentActiveId === idOrUpdater ? null : idOrUpdater;
        }
        // For other direct ID sets (e.g., NodeGroupLibrary, SubWorkflowLibrary, or null to close)
        return idOrUpdater;
      });
    }
  }, []);


  return {
    activeSidebarItem,
    setActiveSidebarItemOptimized,
  };
};
