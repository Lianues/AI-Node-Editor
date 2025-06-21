
import { ContextMenuItem } from './contextMenuTypes';

// Type for the actions passed to buildContextMenuItems
interface ContextMenuActionHandlers {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void; // For canvas, paste takes worldX, worldY from Canvas.tsx
  onDelete?: () => void;
  onShowProperties?: (type: 'node' | 'connection' | 'canvas', id?: string, shiftKeyFromContextMenuOpen?: boolean) => void;
}

interface BuildContextMenuOptions {
  type: 'canvas' | 'node' | 'connection';
  targetId?: string; // Node ID or Connection ID
  canPaste: boolean;
  actions: ContextMenuActionHandlers;
}

export const buildContextMenuItems = (options: BuildContextMenuOptions): ContextMenuItem[] => {
  const { type, targetId, canPaste, actions } = options;
  const allItems: ContextMenuItem[] = [];

  // --- Common Action: Properties ---
  if (actions.onShowProperties) {
    allItems.push({
      id: `properties-${targetId || type}`,
      label: '属性',
      onClick: () => actions.onShowProperties!(type, targetId), // The actual shiftKey is handled by the actions object passed in
    });
  }


  // --- Node Specific Actions ---
  if (type === 'node' && targetId) {
    if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator) {
        allItems.push({ id: 'sep-before-node-actions', isSeparator: true, label: '', onClick: () => {} });
    }
    if (actions.onCut) {
      allItems.push({ id: `cut-${targetId}`, label: '剪切', onClick: actions.onCut });
    }
    if (actions.onCopy) {
      allItems.push({ id: `copy-${targetId}`, label: '复制', onClick: actions.onCopy });
    }
  }

  // --- Canvas Specific Actions ---
  if (type === 'canvas') {
    if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator) {
        allItems.push({ id: 'sep-before-canvas-actions', isSeparator: true, label: '', onClick: () => {} });
    }
    allItems.push({
      id: 'add-node-canvas',
      label: '添加节点 (占位)',
      onClick: () => console.log(`Placeholder Action: Add Node - Context: canvas`)
    });

    if (actions.onPaste) {
      allItems.push({
        id: 'paste-canvas',
        label: '粘贴',
        onClick: actions.onPaste,
        disabled: !canPaste
      });
    }
  }

  // --- Delete Action (Node or Connection) ---
  if ((type === 'node' || type === 'connection') && targetId && actions.onDelete) {
    if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator) {
      const lastRealAction = allItems.slice().reverse().find(item => !item.isSeparator);
      if(lastRealAction && !lastRealAction.id.startsWith('properties-')) { // Ensure separator if properties isn't the only preceding item
         allItems.push({ id: `sep-before-delete-${targetId}`, isSeparator: true, label: '', onClick: () => {} });
      } else if (allItems.length > 1 && allItems[0].id.startsWith('properties-')) { // If properties is first, and more items follow before delete
         allItems.push({ id: `sep-before-delete-${targetId}`, isSeparator: true, label: '', onClick: () => {} });
      }
    }
     // If properties is the only item, and we are adding delete, add a separator
    if (allItems.length === 1 && allItems[0].id.startsWith('properties-')) { // only for node/connection delete
        allItems.push({ id: `sep-prop-delete-${targetId}`, isSeparator: true, label: '', onClick: () => {} });
    }


    allItems.push({ id: `delete-${targetId}`, label: '删除', onClick: actions.onDelete });
  }

  // --- Final Cleanup of Separators ---
  const finalItems = allItems.reduce((acc, current, index, arr) => {
    if (current.isSeparator && (acc.length === 0 || acc[acc.length - 1].isSeparator)) {
      return acc;
    }
    acc.push(current);
    return acc;
  }, [] as ContextMenuItem[]);

  if (finalItems.length > 0 && finalItems[finalItems.length - 1].isSeparator) {
    finalItems.pop();
  }

  return finalItems;
};
