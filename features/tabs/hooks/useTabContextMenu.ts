
import React, { useState, useCallback } from 'react';
import { TabContextMenuItem, TabContextMenuConfig } from '../types/tabContextMenuTypes';

export const useTabContextMenu = () => {
  const [menuConfig, setMenuConfig] = useState<TabContextMenuConfig | null>(null);

  const openTabContextMenu = useCallback(
    (event: React.MouseEvent, targetTabId: string, items: TabContextMenuItem[]) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuConfig({
        x: event.clientX,
        y: event.clientY,
        items,
        targetTabId,
      });
    },
    []
  );

  const closeTabContextMenu = useCallback(() => {
    setMenuConfig(null);
  }, []);

  return {
    menuConfig,
    openTabContextMenu,
    closeTabContextMenu,
  };
};
