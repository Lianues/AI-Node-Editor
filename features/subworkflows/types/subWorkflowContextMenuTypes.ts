// features/subworkflows/types/subWorkflowContextMenuTypes.ts
import React from 'react';
import { SubWorkflowItem } from './subWorkflowTypes';

export interface SubWorkflowContextMenuItemActionPayload {
  targetSubWorkflowId: string;
  // Add other relevant context if needed
}

export interface SubWorkflowContextMenuItem {
  id: string;
  label: string;
  onClick?: (payload: SubWorkflowContextMenuItemActionPayload) => void;
  disabled?: boolean;
  isSeparator?: boolean;
  icon?: React.ElementType;
}

export interface SubWorkflowContextMenuConfig {
  x: number;
  y: number;
  items: SubWorkflowContextMenuItem[];
  targetSubWorkflowId: string; 
}

// Props for the SubWorkflowContextMenu component itself
export interface SubWorkflowContextMenuComponentProps {
  menuConfig: SubWorkflowContextMenuConfig | null;
  onClose: () => void;
}
