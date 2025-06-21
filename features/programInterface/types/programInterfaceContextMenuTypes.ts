
// features/programInterface/types/programInterfaceContextMenuTypes.ts
import React from 'react';
import { ProgramInterfaceDisplayItem } from '../../../types'; 

export interface ProgramInterfaceContextMenuItemActionPayload {
  targetItem: ProgramInterfaceDisplayItem;
  // Add other relevant context if needed
}

export interface ProgramInterfaceContextMenuActions {
  onUpdateName?: (payload: ProgramInterfaceContextMenuItemActionPayload & { newName: string }) => void; // Example
  onDeleteItem?: (payload: ProgramInterfaceContextMenuItemActionPayload) => void; // Added
  // Add other actions like onEditProperties, etc.
}

export interface ProgramInterfaceContextMenuItem {
  id: string;
  label: string;
  onClick?: (payload: ProgramInterfaceContextMenuItemActionPayload) => void;
  disabled?: boolean;
  isSeparator?: boolean;
  icon?: React.ElementType;
}

export interface ProgramInterfaceContextMenuConfig {
  x: number;
  y: number;
  items: ProgramInterfaceContextMenuItem[];
  targetItem: ProgramInterfaceDisplayItem; 
}

// Props for the ProgramInterfaceContextMenu component itself
export interface ProgramInterfaceContextMenuComponentProps {
  menuConfig: ProgramInterfaceContextMenuConfig | null;
  onClose: () => void;
}
