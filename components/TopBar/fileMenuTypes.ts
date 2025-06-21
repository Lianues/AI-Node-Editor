export interface FileMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string; // Added shortcut property
  isSeparator?: boolean;
}