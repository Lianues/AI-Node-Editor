
import React from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
  icon?: React.ElementType; // For future use
  isSeparator?: boolean; // For visual separators
}

export interface ContextMenuConfig {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

// Props for the ContextMenu component itself
export interface ContextMenuComponentProps {
  menuConfig: ContextMenuConfig | null;
  onClose: () => void;
}
