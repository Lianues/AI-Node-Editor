
import { useCallback } from 'react';
import { FileSystemItem, FolderItem, FileItem as ProjectFileItem } from '../types/fileSystemTypes';
import { CanvasSnapshot } from '../../../types';
import { Tab } from '../../tabs/types/tabTypes';
import { useProjectFilesClipboard } from './useProjectFilesClipboard';
import { useProjectFileState, captureOpenFolderStatesRecursive } from './useProjectFileState';
import { useProjectFileOperations } from './useProjectFileOperations';
import { useProjectItemManagement } from './useProjectItemManagement';
import * as filesystemService from '../services/filesystemService'; 
import { OpenFolderStateInfo } from '../hooks/useProjectFileState';

interface UseProjectFileManagerProps {
  onTabAdd: (options?: { snapshot?: CanvasSnapshot, title?: string, fileHandle?: FileSystemFileHandle, type?: Tab['type'], id?: string }) => Tab | void;
  onTabUpdate: (tabId: string, updates: Partial<Omit<Tab, 'id'>>) => void;
  getActiveTabId: () => string | null;
  getActiveTabTitle: () => string | null;
  getActiveTabFileHandle: () => FileSystemFileHandle | undefined;
  getTabs: () => Tab[];
  getCurrentCanvasSnapshot: () => CanvasSnapshot;
  defaultPan: { x: number; y: number };
  defaultScale: number;
}

export const useProjectFileManager = ({
  onTabAdd,
  onTabUpdate,
  getActiveTabId,
  getActiveTabTitle,
  getActiveTabFileHandle,
  getTabs,
  getCurrentCanvasSnapshot,
  defaultPan,
  defaultScale,
}: UseProjectFileManagerProps) => {
  const projectFileStateHook = useProjectFileState();
  const projectFilesClipboardHook = useProjectFilesClipboard();

  const itemManagementHook = useProjectItemManagement({
    projectFileState: projectFileStateHook,
    projectFileSetters: projectFileStateHook, 
    projectFilesClipboard: projectFilesClipboardHook,
    projectLoadInternalData: (openStates) => fileOperationsHook.projectLoadInternalData(openStates), 
    projectLoadLocalData: (handle, openStates) => fileOperationsHook.projectLoadLocalData(handle, openStates),
    handleToggleProjectFolder: (folderItem) => fileOperationsHook.handleToggleProjectFolder(folderItem),
  });

  const fileOperationsHook = useProjectFileOperations({
    projectFileState: projectFileStateHook,
    projectFileSetters: projectFileStateHook, 
    projectFilesClipboard: projectFilesClipboardHook,
    onTabAdd,
    onTabUpdate,
    getTabs,
    defaultPan,
    defaultScale,
    clearErrorForModal: itemManagementHook.clearErrorForModal,
  });
  
  const getItemParentPath = (itemPath: string): string => {
    if (!itemPath || itemPath === '/') return '/';
    const lastSlash = itemPath.lastIndexOf('/');
    if (lastSlash === -1) return '/';
    if (lastSlash === 0 && itemPath.length > 1) return '/'; 
    if (lastSlash === 0 && itemPath.length === 1) return '/'; 
    return itemPath.substring(0, lastSlash) || '/';
  };
  
  const findParentHandleRecursive = async (
    currentHandle: FileSystemDirectoryHandle,
    targetPathParts: string[]
  ): Promise<FileSystemDirectoryHandle | null> => {
    if (targetPathParts.length === 0) {
      return currentHandle;
    }
    const nextDirName = targetPathParts[0];
    try {
      const nextDirHandle = await currentHandle.getDirectoryHandle(nextDirName);
      return findParentHandleRecursive(nextDirHandle, targetPathParts.slice(1));
    } catch (e) {
      return null;
    }
  };


  const handleCutItem = useCallback((item: FileSystemItem) => {
    projectFilesClipboardHook.cutItemToClipboard(item);
    projectFileStateHook.setSelectedProjectItemId(item.id);
  }, [projectFilesClipboardHook, projectFileStateHook]);

  const handleCopyItem = useCallback((item: FileSystemItem) => {
    projectFilesClipboardHook.copyItemToClipboard(item);
    projectFileStateHook.setSelectedProjectItemId(item.id);
  }, [projectFilesClipboardHook, projectFileStateHook]);

  const handlePasteItem = useCallback(async (targetFolderItem: FileSystemItem) => {
    if (targetFolderItem.type !== 'folder') {
      projectFileStateHook.setProjectError("粘贴目标必须是一个文件夹。");
      return;
    }
    const clipboardData = projectFilesClipboardHook.getClipboardItem();
    if (!clipboardData) {
      projectFileStateHook.setProjectError("剪贴板中没有内容可粘贴。");
      return;
    }
    const openStates = new Map<string, OpenFolderStateInfo>();
    captureOpenFolderStatesRecursive(projectFileStateHook.projectRootItems, openStates);
    openStates.set(targetFolderItem.path, {isOpen: true, childrenLoaded: true}); // Ensure target folder is marked to be open after reload

    projectFileStateHook.setIsProjectLoading(true);
    projectFileStateHook.setProjectError(null);
    itemManagementHook.clearErrorForModal(); 
    try {
      if (projectFileStateHook.projectSourceType === 'internal') {
        const itemToPasteInternal: FileSystemItem = {
            ...clipboardData.itemMetadata,
             ...(clipboardData.itemMetadata.type === 'folder' && { children: [], isOpen: false, childrenLoaded: false }) 
        };

        const pastedItem = await filesystemService.pasteInternalFileSystemItem(
          itemToPasteInternal, 
          targetFolderItem.path,
          clipboardData.operation
        );
        if (pastedItem && clipboardData.operation === 'cut') {
          await filesystemService.deleteInternalFileSystemItem(clipboardData.itemMetadata.path, clipboardData.itemMetadata.type as 'file' | 'folder');
          projectFilesClipboardHook.clearClipboard();
        }
        await fileOperationsHook.projectLoadInternalData(openStates);
      } else if (projectFileStateHook.projectSourceType === 'local') {
        const sourceItemHandle = clipboardData.itemHandle; 
        const targetDirHandle = (targetFolderItem as FolderItem).handle || projectFileStateHook.projectRootDirectoryHandle;

        if (!sourceItemHandle || !targetDirHandle) {
          throw new Error("源项目句柄或目标文件夹句柄无效 (本地)。");
        }

        await filesystemService.pasteLocalFileSystemItem(sourceItemHandle, targetDirHandle);
        
        if (clipboardData.operation === 'cut') {
          const originalItemMetadata = clipboardData.itemMetadata;
          const originalParentPath = getItemParentPath(originalItemMetadata.path);
          let originalParentHandle: FileSystemDirectoryHandle | null = null;
          if (originalParentPath === '/') {
            originalParentHandle = projectFileStateHook.projectRootDirectoryHandle;
          } else if (projectFileStateHook.projectRootDirectoryHandle) {
            const pathParts = originalParentPath.split('/').filter(p => p);
            originalParentHandle = await findParentHandleRecursive(projectFileStateHook.projectRootDirectoryHandle, pathParts);
          }

          if (originalParentHandle) {
            await filesystemService.deleteLocalFileSystemItem(originalParentHandle, originalItemMetadata.name, originalItemMetadata.type as 'file' | 'folder');
          } else {
            console.warn("Could not find original parent handle to delete after cut-paste (local).");
          }
          projectFilesClipboardHook.clearClipboard();
        }
        if (projectFileStateHook.projectRootDirectoryHandle) {
           await fileOperationsHook.projectLoadLocalData(projectFileStateHook.projectRootDirectoryHandle, openStates);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "粘贴操作失败。";
      projectFileStateHook.setProjectError(errorMsg);
    } finally {
      projectFileStateHook.setIsProjectLoading(false);
    }
  }, [
      projectFilesClipboardHook, 
      projectFileStateHook, 
      fileOperationsHook, 
      itemManagementHook.clearErrorForModal
  ]);

  return {
    // From projectFileStateHook (state values)
    projectSourceType: projectFileStateHook.projectSourceType,
    projectRootDirectoryHandle: projectFileStateHook.projectRootDirectoryHandle,
    projectRootItems: projectFileStateHook.projectRootItems,
    projectRootName: projectFileStateHook.projectRootName,
    isProjectLoading: projectFileStateHook.isProjectLoading,
    projectError: projectFileStateHook.projectError,
    selectedProjectItemId: projectFileStateHook.selectedProjectItemId,
    
    // From fileOperationsHook
    projectLoadInternalData: fileOperationsHook.projectLoadInternalData,
    projectLoadLocalData: fileOperationsHook.projectLoadLocalData, // Added this
    handleProjectSourceTypeSelected: fileOperationsHook.handleProjectSourceTypeSelected,
    handleClearProjectSource: fileOperationsHook.handleClearProjectSource,
    handleToggleProjectFolder: fileOperationsHook.handleToggleProjectFolder,
    appHandleOpenFileFromProject: fileOperationsHook.appHandleOpenFileFromProject,
    appHandleNewPageFile: fileOperationsHook.appHandleNewPageFile,
    appHandleOpenPageFileGlobal: fileOperationsHook.appHandleOpenPageFileGlobal,

    // Explicitly return properties from itemManagementHook
    renamingItemInfo: itemManagementHook.renamingItemInfo,
    isDeleteModalOpen: itemManagementHook.isDeleteModalOpen,
    itemToDelete: itemManagementHook.itemToDelete,
    errorForModal: itemManagementHook.errorForModal,
    clearErrorForModal: itemManagementHook.clearErrorForModal,
    handleRequestNewItem: itemManagementHook.handleRequestNewItem,
    startRenamingItem: itemManagementHook.startRenamingItem,
    submitProjectItemRename: itemManagementHook.submitRenameItem,
    cancelProjectItemRename: itemManagementHook.cancelRenamingItem,
    validateNewItemName: itemManagementHook.validateNewItemName,
    requestDeleteItem: itemManagementHook.requestDeleteItem,
    confirmProjectItemDelete: itemManagementHook.confirmProjectItemDelete,
    cancelDeleteItem: itemManagementHook.cancelDeleteItem,

    // Other explicitly returned/aliased properties
    projectFilesClipboardItem: projectFilesClipboardHook.clipboardItem,
    setIsProjectLoading: projectFileStateHook.setIsProjectLoading,
    setProjectError: projectFileStateHook.setProjectError,
    handleSelectProjectItem: projectFileStateHook.setSelectedProjectItemId,
    handleCutItem,
    handleCopyItem,
    handlePasteItem,
  };
};