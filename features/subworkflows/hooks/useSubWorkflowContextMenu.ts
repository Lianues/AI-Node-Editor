// features/subworkflows/hooks/useSubWorkflowContextMenu.ts
import React, { useState, useCallback } from 'react';
import { SubWorkflowContextMenuItem, SubWorkflowContextMenuConfig } from '../types/subWorkflowContextMenuTypes';
import { SubWorkflowItem } from '../types/subWorkflowTypes'; // Not directly used here, but good for context

export const useSubWorkflowContextMenu = () => {
  const [menuConfig, setMenuConfig] = useState<SubWorkflowContextMenuConfig | null>(null);

  const openSubWorkflowContextMenu = useCallback(
    (event: React.MouseEvent, targetSubWorkflowId: string, items: SubWorkflowContextMenuItem[]) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuConfig({
        x: event.clientX,
        y: event.clientY,
        items,
        targetSubWorkflowId,
      });
    },
    []
  );

  const closeSubWorkflowContextMenu = useCallback(() => {
    setMenuConfig(null);
  }, []);

  return {
    menuConfig,
    openSubWorkflowContextMenu,
    closeSubWorkflowContextMenu,
  };
};
