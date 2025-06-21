import { ProjectFileContextMenuItem, ProjectFileContextMenuItemActionPayload } from '../types/projectFilesContextMenuTypes';
import { FileSystemItem } from '../types/fileSystemTypes';
import { ProjectFileClipboardItem } from '../types/projectFilesClipboardTypes'; // Import clipboard type

export interface ProjectFilesContextMenuActions {
  onCutItem: (payload: { item: FileSystemItem }) => void;
  onCopyItem: (payload: { item: FileSystemItem }) => void;
  onPasteItem: (payload: { targetFolderItem: FileSystemItem }) => void; 
  onRenameItem: (payload: { item: FileSystemItem }) => void; 
  onRequestDeleteItem: (payload: { item: FileSystemItem }) => void; 
  onNewFileInFolder: (payload: { targetFolderItem: FileSystemItem }) => void;
  onNewFolderInFolder: (payload: { targetFolderItem: FileSystemItem }) => void;
  
  projectFilesClipboardItem: ProjectFileClipboardItem | null; 
}

export const buildProjectFilesContextMenuItems = (
  targetItem: FileSystemItem,
  actions: ProjectFilesContextMenuActions
): ProjectFileContextMenuItem[] => {
  const items: ProjectFileContextMenuItem[] = [];
  const { projectFilesClipboardItem } = actions;

  const canPaste = !!projectFilesClipboardItem && targetItem.type === 'folder';
  const isRootItem = targetItem.path === '/'; 
  const isTempItem = targetItem.name.startsWith("__TEMP_ITEM_PENDING_RENAME__");


  if (!isRootItem && !isTempItem) { 
    items.push(
      {
        id: `cut-${targetItem.type}`,
        label: '剪切',
        onClick: () => actions.onCutItem({ item: targetItem }),
      },
      {
        id: `copy-${targetItem.type}`,
        label: '复制',
        onClick: () => actions.onCopyItem({ item: targetItem }),
      }
    );
  }

  if (targetItem.type === 'folder' && !isTempItem) {
    items.push(
      {
        id: 'paste-in-folder',
        label: '粘贴',
        onClick: () => actions.onPasteItem({ targetFolderItem: targetItem }),
        disabled: !canPaste,
      }
    );
  }
  
  if (targetItem.type === 'folder' && !isTempItem) {
      if (items.length > 0 && !items[items.length -1].isSeparator) {
          items.push({ id: `sep-folder-actions-${targetItem.id}`, isSeparator: true, label: '' });
      }
      items.push(
        {
            id: 'new-file-in-folder',
            label: '新建文件...',
            onClick: () => actions.onNewFileInFolder({ targetFolderItem: targetItem }),
        },
        {
            id: 'new-folder-in-folder',
            label: '新建文件夹...',
            onClick: () => actions.onNewFolderInFolder({ targetFolderItem: targetItem }),
        }
      );
  }
  
  if (!isRootItem && !isTempItem) {
    if (items.length > 0 && !items[items.length -1].isSeparator) {
        items.push({ id: `sep-before-modify-${targetItem.type}`, isSeparator: true, label: '' });
    }
    items.push(
      {
        id: `rename-${targetItem.type}`,
        label: '重命名',
        onClick: () => actions.onRenameItem({ item: targetItem }),
      },
      {
        id: `delete-${targetItem.type}`,
        label: '删除',
        onClick: () => actions.onRequestDeleteItem({ item: targetItem }),
      }
    );
  }
  
  const finalItems: ProjectFileContextMenuItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    if (current.isSeparator) {
      if (finalItems.length > 0 && !finalItems[finalItems.length - 1].isSeparator) {
        finalItems.push(current);
      }
    } else {
      finalItems.push(current);
    }
  }
  if (finalItems.length > 0 && finalItems[finalItems.length - 1].isSeparator) {
    finalItems.pop();
  }

  return finalItems;
};