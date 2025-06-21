
export interface ViewMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  hasSubmenu?: boolean; // Added to indicate submenu presence
}
