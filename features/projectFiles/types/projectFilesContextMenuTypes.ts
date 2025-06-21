import React from 'react';
import { FileSystemItem } from './fileSystemTypes';

export interface ProjectFileContextMenuItemActionPayload {
  targetItem: FileSystemItem;
  // Add other relevant context if needed
}

export interface ProjectFileContextMenuItem {
  id: string;
  label: string;
  onClick?: (payload: ProjectFileContextMenuItemActionPayload) => void;
  disabled?: boolean;
  isSeparator?: boolean;
  icon?: React.ElementType;
}

export interface ProjectFileContextMenuConfig {
  x: number;
  y: number;
  items: ProjectFileContextMenuItem[];
  targetItem: FileSystemItem; // The item that was right-clicked
}

// Props for the ProjectFilesContextMenu component itself
export interface ProjectFileContextMenuComponentProps {
  menuConfig: ProjectFileContextMenuConfig | null;
  onClose: () => void;
}
