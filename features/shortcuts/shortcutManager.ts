

import { Node } from '../../types';
import { Connection } from '../connections/types/connectionTypes'; 

export interface ShortcutActionDependencies {
  primarySelectedNodeId: string | null; 
  selectedNodeIds: string[]; 
  selectedConnectionId: string | null;
  appHandleCopyNode: (nodeId?: string) => void; 
  appHandleCutNode: (nodeId?: string) => void;   
  appHandleDelete: (ids?: { nodeId?: string; connectionId?: string }, menuTargetId?: string) => void; 
  appHandlePasteNode: (worldX?: number, worldY?: number) => void; 
  canPaste: boolean; 
  mouseWorldPosOnCanvas: { x: number, y: number } | null; 
  canUndo: boolean; 
  appHandleUndo: () => void; 
  canRedo: boolean; 
  appHandleRedo: () => void; 
  appHandleSaveFile: () => void; // Added for saving
  // appHandleCreateNodeGroup: () => void; // Commented out as it's not a direct shortcut
  // appTogglePersistentMarqueeMode and isPersistentMarqueeModeActive are removed
  // M key handling is now managed in App.tsx directly
}


export const handleCopyShortcut = (dependencies: Pick<ShortcutActionDependencies, 'primarySelectedNodeId' | 'appHandleCopyNode'>) => {
  // appHandleCopyNode will use selectedNodeIds if primarySelectedNodeId is not its main concern for multi-select
  dependencies.appHandleCopyNode(); 
};

export const handleCutShortcut = (dependencies: Pick<ShortcutActionDependencies, 'primarySelectedNodeId' | 'appHandleCutNode'>) => {
  // appHandleCutNode will use selectedNodeIds
  dependencies.appHandleCutNode(); 
};

export const handleDeleteShortcut = (dependencies: Pick<ShortcutActionDependencies, 'appHandleDelete'>) => {
  // appHandleDelete will determine what to delete based on selection state
  dependencies.appHandleDelete();
};

export const handlePasteShortcut = (
  dependencies: Pick<ShortcutActionDependencies, 'appHandlePasteNode' | 'mouseWorldPosOnCanvas' | 'canPaste'>
) => {
  if (!dependencies.canPaste) {
    return;
  }
  if (dependencies.mouseWorldPosOnCanvas) { // If mouse is on canvas, paste at mouse position
    dependencies.appHandlePasteNode(dependencies.mouseWorldPosOnCanvas.x, dependencies.mouseWorldPosOnCanvas.y);
  } else { // If mouse is NOT on canvas (or mouseWorldPosOnCanvas is null), paste at view center
    dependencies.appHandlePasteNode(); // Call without worldX, worldY
  }
};

export const handleUndoShortcut = (dependencies: Pick<ShortcutActionDependencies, 'canUndo' | 'appHandleUndo'>) => {
  if (dependencies.canUndo) {
    dependencies.appHandleUndo();
  }
};

export const handleRedoShortcut = (dependencies: Pick<ShortcutActionDependencies, 'canRedo' | 'appHandleRedo'>) => {
  if (dependencies.canRedo) {
    dependencies.appHandleRedo();
  }
};

export const handleSaveShortcut = (dependencies: Pick<ShortcutActionDependencies, 'appHandleSaveFile'>) => {
  dependencies.appHandleSaveFile();
};

// handleTogglePersistentMarqueeModeShortcut is removed