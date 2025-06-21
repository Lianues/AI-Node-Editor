export interface CanvasMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  isSeparator?: boolean;
}
