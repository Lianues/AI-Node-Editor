
import React, { useState, useCallback } from 'react';
import { ContextMenuItem, ContextMenuConfig } from './contextMenuTypes';

export const useContextMenu = () => {
  const [menuConfig, setMenuConfig] = useState<ContextMenuConfig | null>(null);

  const openContextMenu = useCallback((event: React.MouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuConfig({
      x: event.clientX,
      y: event.clientY,
      items,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setMenuConfig(null);
  }, []);

  return {
    menuConfig,
    openContextMenu,
    closeContextMenu,
  };
};
