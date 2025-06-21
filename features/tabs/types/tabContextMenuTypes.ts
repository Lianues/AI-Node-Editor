
export interface TabContextMenuItemActionPayload {
  tabId: string;
  // Add other relevant context if needed, e.g., allTabs, activeTabId
}

export interface TabContextMenuItem {
  id: string;
  label: string;
  onClick?: (payload: TabContextMenuItemActionPayload) => void;
  disabled?: boolean;
  isSeparator?: boolean;
  icon?: React.ElementType;
}

export interface TabContextMenuConfig {
  x: number;
  y: number;
  items: TabContextMenuItem[];
  targetTabId: string; // The ID of the tab that was right-clicked
}

// Props for the TabContextMenu component itself
export interface TabContextMenuComponentProps {
  menuConfig: TabContextMenuConfig | null;
  onClose: () => void;
}
