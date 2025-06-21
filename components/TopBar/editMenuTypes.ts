export interface EditMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string; // e.g., "Ctrl+C"
  isSeparator?: boolean; // Added for visual separators
}