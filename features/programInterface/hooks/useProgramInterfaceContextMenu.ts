

import React, { useState, useCallback } from 'react';
import { ProgramInterfaceContextMenuItem, ProgramInterfaceContextMenuConfig } from '../types/programInterfaceContextMenuTypes';
import { ProgramInterfaceDisplayItem } from '../../../types'; 

export const useProgramInterfaceContextMenu = () => {
  const [menuConfig, setMenuConfig] = useState<ProgramInterfaceContextMenuConfig | null>(null);

  const openProgramInterfaceContextMenu = useCallback(
    (event: React.MouseEvent, targetItem: ProgramInterfaceDisplayItem, items: ProgramInterfaceContextMenuItem[]) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuConfig({
        x: event.clientX,
        y: event.clientY,
        items,
        targetItem,
      });
    },
    []
  );

  const closeProgramInterfaceContextMenu = useCallback(() => {
    setMenuConfig(null);
  }, []);

  return {
    menuConfig,
    openProgramInterfaceContextMenu,
    closeProgramInterfaceContextMenu,
  };
};
