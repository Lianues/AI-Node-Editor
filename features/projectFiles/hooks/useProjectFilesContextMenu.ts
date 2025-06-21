import React, { useState, useCallback } from 'react';
import { ProjectFileContextMenuItem, ProjectFileContextMenuConfig } from '../types/projectFilesContextMenuTypes';
import { FileSystemItem } from '../types/fileSystemTypes';

export const useProjectFilesContextMenu = () => {
  const [menuConfig, setMenuConfig] = useState<ProjectFileContextMenuConfig | null>(null);

  const openProjectFilesContextMenu = useCallback(
    (event: React.MouseEvent, targetItem: FileSystemItem, items: ProjectFileContextMenuItem[]) => {
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

  const closeProjectFilesContextMenu = useCallback(() => {
    setMenuConfig(null);
  }, []);

  return {
    menuConfig,
    openProjectFilesContextMenu,
    closeProjectFilesContextMenu,
  };
};
