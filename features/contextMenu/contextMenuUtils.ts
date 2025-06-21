
import { ContextMenuItem } from '../../components/ContextMenu/contextMenuTypes'; // Corrected import path

// Type for the actions passed to buildContextMenuItems
interface ContextMenuActionHandlers {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void; 
  onDelete?: () => void;
  onShowProperties?: (type: 'node' | 'connection' | 'canvas' | 'defined-area', id?: string, shiftKeyFromContextMenuOpen?: boolean) => void;
  onDeleteDefinedArea?: () => void; 
  onCreateAreaFromSelection?: () => void; // For creating area from selected nodes
  onStartDefiningArea?: () => void; // For starting general area definition (canvas context)
  onCreateNodeGroup?: (_event?: any, effectiveSelectedIdsOverride?: string[]) => void; 
}

interface BuildContextMenuOptions {
  type: 'canvas' | 'node' | 'connection' | 'defined-area'; 
  targetId?: string;
  canPaste: boolean;
  actions: ContextMenuActionHandlers;
  currentSelectedNodeIdsCount?: number; 
}

export const buildContextMenuItems = (options: BuildContextMenuOptions): ContextMenuItem[] => {
  const { type, targetId, canPaste, actions, currentSelectedNodeIdsCount = 0 } = options;
  const allItems: ContextMenuItem[] = [];

  const isMultiNodeContext = type === 'node' && currentSelectedNodeIdsCount > 1;

  // --- Common Action: Properties ---
  if (actions.onShowProperties) {
    if (type === 'canvas') {
      allItems.push({
        id: 'properties-canvas',
        label: '画布属性',
        onClick: () => actions.onShowProperties!('canvas', undefined),
      });
    } else if (type === 'defined-area' && targetId) {
      allItems.push({
        id: `properties-defined-area-${targetId}`,
        label: '区域属性',
        onClick: () => actions.onShowProperties!('defined-area', targetId),
      });
    } else if (type === 'node' && targetId) {
        allItems.push({
        id: `properties-node-${targetId}`,
        label: '属性',
        onClick: () => actions.onShowProperties!('node', targetId),
        disabled: isMultiNodeContext, 
        });
    } else if (type === 'connection' && targetId) {
        allItems.push({
        id: `properties-connection-${targetId}`,
        label: '属性',
        onClick: () => actions.onShowProperties!('connection', targetId),
        });
    }
  }


  // --- Node Specific Actions ---
  if (type === 'node' && targetId) {
    if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator) {
        allItems.push({ id: 'sep-before-node-actions', isSeparator: true, label: '', onClick: () => {} });
    }
    if (actions.onCut) {
      allItems.push({ 
        id: `cut-${targetId}`, 
        label: isMultiNodeContext ? '剪切选定项' : '剪切', 
        onClick: actions.onCut 
      });
    }
    if (actions.onCopy) {
      allItems.push({ 
        id: `copy-${targetId}`, 
        label: isMultiNodeContext ? '复制选定项' : '复制', 
        onClick: actions.onCopy 
      });
    }
    if (actions.onCreateAreaFromSelection && currentSelectedNodeIdsCount > 0) {
      allItems.push({
        id: `create-area-from-node-${targetId}`,
        label: '从此选区创建区域', 
        onClick: actions.onCreateAreaFromSelection,
      });
    }
    // Add "Create Node Group" for node context menu
    if (actions.onCreateNodeGroup) {
      if (allItems.length > 0 && !allItems[allItems.length - 1].isSeparator && 
          (actions.onCut || actions.onCopy || actions.onCreateAreaFromSelection)) { 
        allItems.push({ id: `sep-node-actions-before-group-${targetId}`, isSeparator: true, label: '', onClick: () => {} });
      }
      allItems.push({
        id: `create-node-group-from-node-${targetId}`,
        label: '创建节点组',
        onClick: (event) => actions.onCreateNodeGroup!(event, undefined), // Corrected: Pass event and undefined for override
        disabled: currentSelectedNodeIdsCount === 0,
      });
    }
  }

  // --- Canvas Specific Actions (excluding properties, handled above) ---
  if (type === 'canvas') {
    if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator) {
        allItems.push({ id: 'sep-before-canvas-main-actions', isSeparator: true, label: '', onClick: () => {} });
    }
    
    if (actions.onStartDefiningArea) {
      allItems.push({
        id: 'create-area-canvas', 
        label: '创建区域', 
        onClick: actions.onStartDefiningArea,
      });
    }
    
    if (actions.onCreateNodeGroup) {
       allItems.push({
        id: 'create-node-group-canvas',
        label: '创建节点组',
        onClick: () => actions.onCreateNodeGroup!(undefined, []), 
        disabled: currentSelectedNodeIdsCount === 0, 
      });
    }
    
    if (actions.onPaste) {
      
      if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator && (actions.onStartDefiningArea || actions.onCreateNodeGroup)) {
          allItems.push({ id: 'sep-before-paste-canvas', isSeparator: true, label: '', onClick: () => {} });
      }
      allItems.push({
        id: 'paste-canvas',
        label: '粘贴',
        onClick: actions.onPaste,
        disabled: !canPaste
      });
    }
  }

  // --- Defined Area Specific Actions ---
  if (type === 'defined-area' && targetId) {
    if (actions.onDeleteDefinedArea) {
      if (allItems.length > 0 && !allItems[allItems.length -1].isSeparator) {
        allItems.push({ id: `sep-before-delete-area-${targetId}`, isSeparator: true, label: '', onClick: () => {} });
      }
      allItems.push({
        id: `delete-defined-area-${targetId}`,
        label: '删除区域',
        onClick: actions.onDeleteDefinedArea,
      });
    }
  }

  // --- Delete Action (Node or Connection) ---
  if ((type === 'node' || type === 'connection') && targetId && actions.onDelete) {
    let needsSeparatorBeforeDelete = false;
    if (allItems.length > 0 && !allItems[allItems.length - 1].isSeparator) {
      const lastNonSeparatorItem = allItems.slice().reverse().find(item => !item.isSeparator);
      
      if (lastNonSeparatorItem && 
          (lastNonSeparatorItem.id.startsWith('cut-') || 
           lastNonSeparatorItem.id.startsWith('copy-') ||
           lastNonSeparatorItem.id.startsWith('create-area-from-node-') ||
           lastNonSeparatorItem.id.startsWith('create-node-group-from-node-'))) { 
        needsSeparatorBeforeDelete = true;
      } else if (lastNonSeparatorItem && lastNonSeparatorItem.id.startsWith('properties-') && allItems.filter(it => !it.isSeparator).length > 1) {
        
        needsSeparatorBeforeDelete = true;
      }
    }
    
    if (allItems.filter(it => !it.isSeparator).length === 1 && allItems[0].id.startsWith('properties-')) {
        needsSeparatorBeforeDelete = true;
    }

    if (needsSeparatorBeforeDelete) {
       allItems.push({ id: `sep-before-delete-${targetId}`, isSeparator: true, label: '', onClick: () => {} });
    }
    
    const deleteLabel = (type === 'node' && isMultiNodeContext) ? '删除选定项' : '删除';
    allItems.push({ 
        id: `delete-${targetId}`, 
        label: deleteLabel, 
        onClick: actions.onDelete 
    });
  }

  // --- Final Cleanup of Separators ---
  const finalItems = allItems.reduce((acc, current) => {
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
