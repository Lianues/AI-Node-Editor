
import { useState, useCallback, useRef, useEffect } from 'react';
import { FileSystemItem, FolderItem } from '../types/fileSystemTypes';
import * as filesystemService from '../services/filesystemService';
import { ProjectFileState, ProjectFileStateSetters, captureOpenFolderStatesRecursive, updateFolderStateRecursive as updateFolderStateRecursiveUtil, OpenFolderStateInfo } from './useProjectFileState';
import { UseProjectFilesClipboardOutput } from './useProjectFilesClipboard';


interface ItemPendingCreationInfo {
  id: string;
  parentPath: string;
  type: 'file' | 'folder';
  tempName: string;
  parentHandle?: FileSystemDirectoryHandle; // For local FS
}

interface RenamingItemInfo {
  id: string | null;
  currentName: string;
  validationMessage: string | null;
}

interface UseProjectItemManagementProps {
  projectFileState: ProjectFileState;
  projectFileSetters: ProjectFileStateSetters;
  projectFilesClipboard: UseProjectFilesClipboardOutput;
  projectLoadInternalData: (openStatesToPreserve?: Map<string, OpenFolderStateInfo>) => Promise<void>;
  projectLoadLocalData: (dirHandle: FileSystemDirectoryHandle, openStatesToPreserve?: Map<string, OpenFolderStateInfo>) => Promise<void>;
  handleToggleProjectFolder: (folderItem: FileSystemItem) => Promise<void>;
}

const findItemRecursiveFromRoot = (items: FileSystemItem[], itemIdOrPath: string): FileSystemItem | undefined => {
    for (const item of items) {
        if (item.id === itemIdOrPath || item.path === itemIdOrPath) return item;
        if (item.type === 'folder' && (item as FolderItem).children) {
            const found = findItemRecursiveFromRoot((item as FolderItem).children, itemIdOrPath);
            if (found) return found;
        }
    }
    return undefined;
};


export const useProjectItemManagement = ({
  projectFileState,
  projectFileSetters,
  projectFilesClipboard,
  projectLoadInternalData,
  projectLoadLocalData,
  handleToggleProjectFolder,
}: UseProjectItemManagementProps) => {
  const { projectSourceType, projectRootItems, selectedProjectItemId, projectRootDirectoryHandle } = projectFileState;
  const { setProjectError, setIsProjectLoading, setProjectRootItems, setSelectedProjectItemId } = projectFileSetters;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FileSystemItem | null>(null);
  const [errorForModal, setErrorForModal] = useState<string | null>(null);
  
  const [renamingItemInfo, setRenamingItemInfo] = useState<RenamingItemInfo | null>(null);
  const [itemPendingCreation, setItemPendingCreation] = useState<ItemPendingCreationInfo | null>(null);
  
  type ValidateNewItemNameFn = (newName: string, parentPath: string, itemType: 'file' | 'folder', itemIdToExclude: string | null) => { isValid: boolean; isDuplicate: boolean, message?: string };
  const onValidateNewItemNameRef = useRef<ValidateNewItemNameFn | null>(null);


  const getItemParentPath = (itemPath: string): string => {
    if (!itemPath || itemPath === '/') return '/';
    const lastSlash = itemPath.lastIndexOf('/');
    if (lastSlash === -1 || lastSlash === 0 && itemPath.length === 1) return '/';
    if (lastSlash === 0 && itemPath.length > 1) return '/'; 
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


  const validateNewItemName = useCallback((
    newName: string,
    parentPath: string,
    itemType: 'file' | 'folder',
    itemIdToExclude: string | null 
  ): { isValid: boolean; isDuplicate: boolean, message?: string } => {
    const trimmedName = newName.trim();
    if (trimmedName === "") {
      return { isValid: false, isDuplicate: false, message: "名称不能为空。" };
    }
    if (trimmedName.includes('/')) {
      return { isValid: false, isDuplicate: false, message: "名称不能包含 '/'。" };
    }
    if (trimmedName.startsWith(filesystemService.TEMP_ITEM_PLACEHOLDER_PREFIX)) {
      return { isValid: false, isDuplicate: false, message: "名称不能以保留前缀开头。" };
    }

    const findFolderInCurrentState = (itemsToSearch: FileSystemItem[], pathToFind: string): FolderItem | null => {
        if (pathToFind === '/') {
            return { id: 'virtual_root_for_validation', name: '/', type: 'folder', path: '/', children: itemsToSearch, childrenLoaded: true, isOpen: true } as FolderItem;
        }
        const pathPartsToSearch = pathToFind.split('/').filter(p => p);
        let currentLevelItems: FileSystemItem[] = itemsToSearch;
        let currentFolder: FolderItem | null = null;

        for (const part of pathPartsToSearch) {
            const nextFolder = currentLevelItems.find(it => it.name === part && it.type === 'folder') as FolderItem | undefined;
            if (nextFolder) {
                currentFolder = nextFolder;
                currentLevelItems = nextFolder.children || [];
            } else { return null; } 
        }
        return currentFolder;
    };

    const parentFolder = findFolderInCurrentState(projectRootItems, parentPath);
    const siblingItems = parentFolder ? (parentFolder.children || []) : []; 
    
    const isSameNameSameTypeDuplicate = siblingItems.some(
      item => item.id !== itemIdToExclude && item.name.toLowerCase() === trimmedName.toLowerCase() && item.type === itemType
    );

    if (isSameNameSameTypeDuplicate) {
      return { isValid: false, isDuplicate: true, message: `类型为 "${itemType === 'file' ? '文件' : '文件夹'}" 且名称为 "${trimmedName}" 的项目已存在。` };
    }

    // For internal projects, allow file and folder to have the same name.
    // For local projects, disallow it.
    if (projectFileState.projectSourceType === 'local') {
      const isCrossTypeDuplicate = siblingItems.some(
        item => item.id !== itemIdToExclude && item.name.toLowerCase() === trimmedName.toLowerCase() && item.type !== itemType
      );
      if (isCrossTypeDuplicate) {
        const conflictingItemTypeDisplay = itemType === 'file' ? '文件夹' : '文件';
        return { isValid: false, isDuplicate: true, message: `已存在一个同名的${conflictingItemTypeDisplay}。请使用其他名称。` };
      }
    }

    return { isValid: true, isDuplicate: false };
  }, [projectRootItems, projectFileState.projectSourceType]);

  useEffect(() => {
    onValidateNewItemNameRef.current = validateNewItemName;
  }, [validateNewItemName]);


  const handleRequestNewItem = useCallback(async (parentFolderItemInput: FileSystemItem, type: 'file' | 'folder') => {
    if (parentFolderItemInput.type !== 'folder') {
      setProjectError("新项目只能在文件夹内创建。");
      return;
    }
    
    setIsProjectLoading(true);
    setProjectError(null);
    let tempItem: FileSystemItem | null = null;
    let parentHandleForLocal: FileSystemDirectoryHandle | undefined = undefined;
    let currentProjectRootItems = projectFileState.projectRootItems; 

    try {
      const parentInUI = findItemRecursiveFromRoot(currentProjectRootItems, parentFolderItemInput.path) as FolderItem | undefined;

      if (parentInUI && (!parentInUI.isOpen || (projectSourceType === 'local' && !parentInUI.childrenLoaded))) {
        const updatedItemsForUI = updateFolderStateRecursiveUtil(
            currentProjectRootItems,
            parentFolderItemInput.id,
            { isOpen: true, childrenLoaded: projectSourceType !== 'local' } 
        );
        setProjectRootItems(updatedItemsForUI);
        currentProjectRootItems = updatedItemsForUI; 


        if (projectSourceType === 'local' && parentFolderItemInput.handle && !(parentInUI.childrenLoaded)) {
            await handleToggleProjectFolder(parentFolderItemInput); 
            currentProjectRootItems = projectFileState.projectRootItems; 
        }
      }


      if (projectSourceType === 'internal') {
        tempItem = await filesystemService.createTemporaryInternalItem(parentFolderItemInput.path, type);
      } else if (projectSourceType === 'local') {
        parentHandleForLocal = (parentFolderItemInput as FolderItem).handle || projectRootDirectoryHandle;
        if (!parentHandleForLocal) throw new Error("无法获取父文件夹的句柄 (本地)。");
        tempItem = await filesystemService.createTemporaryInternalItem(parentFolderItemInput.path, type);
      } else {
        throw new Error("不支持的项目源类型。");
      }
      
      if (tempItem) {
        const finalTempItem = tempItem; 
        setProjectRootItems(latestRootItems => {
            const addTempItemRecursive = (items: FileSystemItem[], targetParentPath: string): FileSystemItem[] => {
                return items.map(it => {
                    if (it.path === targetParentPath && it.type === 'folder') {
                        const currentFolder = it as FolderItem;
                        const newChildren = [finalTempItem, ...(currentFolder.children || [])].sort((a, b) => { 
                            if (a.name.startsWith(filesystemService.TEMP_ITEM_PLACEHOLDER_PREFIX)) return -1;
                            if (b.name.startsWith(filesystemService.TEMP_ITEM_PLACEHOLDER_PREFIX)) return 1;
                            if (a.type === 'folder' && b.type === 'file') return -1;
                            if (a.type === 'file' && b.type === 'folder') return 1;
                            return a.name.localeCompare(b.name);
                        });
                        return { ...currentFolder, children: newChildren, isOpen: true, childrenLoaded: true };
                    }
                    if (it.type === 'folder' && (it as FolderItem).children) {
                        return {...it, children: addTempItemRecursive((it as FolderItem).children, targetParentPath)};
                    }
                    return it;
                });
            };
            if (parentFolderItemInput.path === '/') { 
                return [finalTempItem, ...latestRootItems].sort((a,b) => { 
                    if (a.name.startsWith(filesystemService.TEMP_ITEM_PLACEHOLDER_PREFIX)) return -1;
                    if (b.name.startsWith(filesystemService.TEMP_ITEM_PLACEHOLDER_PREFIX)) return 1;
                    if (a.type === 'folder' && b.type === 'file') return -1;
                    if (a.type === 'file' && b.type === 'folder') return 1;
                    return a.name.localeCompare(b.name);
                });
            }
            return addTempItemRecursive(latestRootItems, parentFolderItemInput.path);
        });

        setItemPendingCreation({ 
          id: tempItem.id, 
          parentPath: parentFolderItemInput.path, 
          type, 
          tempName: tempItem.name,
          parentHandle: parentHandleForLocal 
        });
        setRenamingItemInfo({ id: tempItem.id, currentName: "", validationMessage: null });
        setSelectedProjectItemId(tempItem.id);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `创建临时 ${type === 'file' ? '文件' : '文件夹'} 失败。`;
      setProjectError(errorMsg);
      
    } finally {
      setIsProjectLoading(false);
    }
  }, [
      projectSourceType, projectRootDirectoryHandle, projectFileState.projectRootItems, 
      handleToggleProjectFolder, setIsProjectLoading, setSelectedProjectItemId, 
      setProjectRootItems, setProjectError
    ]);


  const startRenamingItem = useCallback((item: FileSystemItem) => {
    setRenamingItemInfo({ id: item.id, currentName: item.name, validationMessage: null });
    setSelectedProjectItemId(item.id);
    setItemPendingCreation(null); 
  }, [setSelectedProjectItemId]);

  const cancelRenamingItem = useCallback(async (itemId: string) => {
    const pendingItem = itemPendingCreation;
    if (pendingItem && pendingItem.id === itemId) { 
      setProjectRootItems(prevItems => {
          const removeTempItemRecursive = (items: FileSystemItem[], idToRemove: string): FileSystemItem[] => {
              return items.filter(it => it.id !== idToRemove).map(it => {
                  if (it.type === 'folder' && (it as FolderItem).children) {
                      return {...it, children: removeTempItemRecursive((it as FolderItem).children, idToRemove)};
                  }
                  return it;
              });
          };
          return removeTempItemRecursive(prevItems, itemId);
      });
      setItemPendingCreation(null); 
    }
    setRenamingItemInfo(null);
  }, [itemPendingCreation, setProjectRootItems]);

  const submitRenameItem = useCallback(async (itemId: string, newNameFromInput: string) => {
    const currentPFRootItems = projectFileState.projectRootItems; 
    const openStatesBeforeOp = new Map<string, OpenFolderStateInfo>();
    captureOpenFolderStatesRecursive(currentPFRootItems, openStatesBeforeOp);

    const isFinalizingNewItem = itemPendingCreation && itemPendingCreation.id === itemId;
    
    let parentPathForValidation: string;
    let itemTypeForValidation: 'file' | 'folder';
    let originalItemPathForRename: string | undefined = undefined;
    let originalItemNameForRename: string | undefined = undefined;
    
    const itemBeingRenamedOrFinalized = findItemRecursiveFromRoot(currentPFRootItems, itemId);

    if (!itemBeingRenamedOrFinalized && !isFinalizingNewItem) {
        setProjectError("找不到要重命名的项目。");
        setRenamingItemInfo(null);
        return;
    }
    
    if (isFinalizingNewItem) {
        parentPathForValidation = itemPendingCreation!.parentPath;
        itemTypeForValidation = itemPendingCreation!.type;
        openStatesBeforeOp.set(parentPathForValidation, { isOpen: true, childrenLoaded: true });
    } else if (itemBeingRenamedOrFinalized) {
        originalItemPathForRename = itemBeingRenamedOrFinalized.path;
        originalItemNameForRename = itemBeingRenamedOrFinalized.name;
        parentPathForValidation = getItemParentPath(originalItemPathForRename);
        itemTypeForValidation = itemBeingRenamedOrFinalized.type as 'file' | 'folder';
        const parentItem = findItemRecursiveFromRoot(currentPFRootItems, parentPathForValidation);
        if(parentItem && parentItem.type === 'folder' && (parentItem as FolderItem).isOpen) {
            openStatesBeforeOp.set(parentPathForValidation, { isOpen: true, childrenLoaded: (parentItem as FolderItem).childrenLoaded || false });
        }
    } else { 
        setProjectError("项目状态不一致。");
        setRenamingItemInfo(null);
        return;
    }
    
    const trimmedNewName = newNameFromInput.trim();
    
    let chosenValidationFunction: ValidateNewItemNameFn;
    const funcFromRef = onValidateNewItemNameRef.current;

    if (typeof funcFromRef === 'function') {
      chosenValidationFunction = funcFromRef;
    } else {
      // Fallback to the function defined in the hook's scope.
      // This ensures 'validateNewItemName' is always the hook's own 'validateNewItemName'.
      chosenValidationFunction = validateNewItemName;
    }
    
    if (typeof chosenValidationFunction !== 'function') {
      
      setRenamingItemInfo(prev => prev ? {...prev, validationMessage: "Internal validation error."} : null);
      if (isFinalizingNewItem && itemPendingCreation) { 
        setProjectRootItems(prevItems => {
            const removeTempItemRecursive = (items: FileSystemItem[], idToRemove: string): FileSystemItem[] => {
                return items.filter(it => it.id !== idToRemove).map(it => {
                    if (it.type === 'folder' && (it as FolderItem).children) {
                        return {...it, children: removeTempItemRecursive((it as FolderItem).children, idToRemove)};
                    }
                    return it;
                });
            };
            return removeTempItemRecursive(prevItems, itemPendingCreation.id);
        });
        setItemPendingCreation(null); 
      }
      return;
    }

    const validation = chosenValidationFunction(trimmedNewName, parentPathForValidation, itemTypeForValidation, isFinalizingNewItem ? null : itemId);
    
    if (!validation.isValid) {
        const alertMessage = validation.message || "名称无效。";
        setRenamingItemInfo(prev => prev ? {...prev, currentName: trimmedNewName, validationMessage: alertMessage} : null);
        
        if (isFinalizingNewItem && itemPendingCreation) { 
            setProjectRootItems(prevItems => {
                const removeTempItemRecursive = (items: FileSystemItem[], idToRemove: string): FileSystemItem[] => {
                    return items.filter(it => it.id !== idToRemove).map(it => {
                        if (it.type === 'folder' && (it as FolderItem).children) {
                            return {...it, children: removeTempItemRecursive((it as FolderItem).children, idToRemove)};
                        }
                        return it;
                    });
                };
                return removeTempItemRecursive(prevItems, itemPendingCreation.id);
            });
            setItemPendingCreation(null); 
        }
        return; 
    }

    setIsProjectLoading(true);
    setProjectError(null);
    setErrorForModal(null);
    let caughtError: Error | null = null;
    let createdOrRenamedItem: FileSystemItem | null = null;
    
    let parentHandle: FileSystemDirectoryHandle | null = null;
    if (projectFileState.projectSourceType === 'local') {
        if (parentPathForValidation === '/') {
            parentHandle = projectFileState.projectRootDirectoryHandle;
        } else if (itemPendingCreation?.parentHandle && isFinalizingNewItem) {
            parentHandle = itemPendingCreation.parentHandle;
        } else if (itemBeingRenamedOrFinalized){ 
            const pathParts = parentPathForValidation.split('/').filter(p => p);
            if(projectFileState.projectRootDirectoryHandle) {
                 parentHandle = await findParentHandleRecursive(projectFileState.projectRootDirectoryHandle, pathParts);
            }
        }
        if (!parentHandle) {
            const errorMsg = `无法找到本地父文件夹句柄: ${parentPathForValidation}`;
            setProjectError(errorMsg);
            setIsProjectLoading(false);
            return;
        }
    }

    try {
      if (isFinalizingNewItem) { 
        const tempItemIdBeingFinalized = itemPendingCreation!.id; 
        if (projectFileState.projectSourceType === 'internal') {
          if (itemTypeForValidation === 'file') {
            createdOrRenamedItem = await filesystemService.createInternalFile(parentPathForValidation, trimmedNewName);
          } else {
            createdOrRenamedItem = await filesystemService.createInternalFolder(parentPathForValidation, trimmedNewName);
          }
          
          const newFinalItem = createdOrRenamedItem;
          if (newFinalItem) {
            setProjectRootItems(prevItems => {
              const updateItemsRecursive = (items: FileSystemItem[], parentP: string, tempId: string, finalItem: FileSystemItem): FileSystemItem[] => {
                return items.map(it => {
                  if (it.path === parentP && it.type === 'folder') {
                    const currentFolder = it as FolderItem;
                    const childrenWithoutTemp = (currentFolder.children || []).filter(child => child.id !== tempId);
                    const newChildren = [...childrenWithoutTemp, finalItem].sort((a, b) => {
                      if (a.type === 'folder' && b.type === 'file') return -1;
                      if (a.type === 'file' && b.type === 'folder') return 1;
                      return a.name.localeCompare(b.name);
                    });
                    return { ...currentFolder, children: newChildren, isOpen: true, childrenLoaded: true };
                  }
                  if (it.type === 'folder' && (it as FolderItem).children) {
                    return { ...it, children: updateItemsRecursive((it as FolderItem).children, parentP, tempId, finalItem) };
                  }
                  return it;
                });
              };
              if (parentPathForValidation === '/') {
                  const itemsWithoutTemp = prevItems.filter(child => child.id !== tempItemIdBeingFinalized);
                  return [...itemsWithoutTemp, newFinalItem].sort((a,b) => {
                      if (a.type === 'folder' && b.type === 'file') return -1;
                      if (a.type === 'file' && b.type === 'folder') return 1;
                      return a.name.localeCompare(b.name);
                  });
              }
              return updateItemsRecursive(prevItems, parentPathForValidation, tempItemIdBeingFinalized, newFinalItem);
            });
          }
        } else if (projectFileState.projectSourceType === 'local' && parentHandle) {
          if (itemTypeForValidation === 'file') {
            await filesystemService.createLocalFile(parentHandle, trimmedNewName, "");
          } else {
            await filesystemService.createLocalFolder(parentHandle, trimmedNewName);
          }
        }
        setItemPendingCreation(null); 

      } else { 
        if (originalItemNameForRename === trimmedNewName) { 
            setRenamingItemInfo(null);
            setIsProjectLoading(false);
            return; 
        }
        if (projectFileState.projectSourceType === 'internal') {
          createdOrRenamedItem = await filesystemService.renameInternalFileSystemItem(originalItemPathForRename!, trimmedNewName, itemTypeForValidation);
        } else if (projectFileState.projectSourceType === 'local' && parentHandle && originalItemNameForRename) {
          await filesystemService.renameLocalFileSystemItem(parentHandle, originalItemNameForRename, trimmedNewName, itemTypeForValidation);
        }
      }
      
      if (projectFileState.projectSourceType === 'internal') {
        await projectLoadInternalData(openStatesBeforeOp);
      } else if (projectFileState.projectSourceType === 'local' && projectFileState.projectRootDirectoryHandle) {
        await projectLoadLocalData(projectFileState.projectRootDirectoryHandle, openStatesBeforeOp);
      }

      if (createdOrRenamedItem && !isFinalizingNewItem) { 
        setSelectedProjectItemId(createdOrRenamedItem.id);
      } else if (isFinalizingNewItem && createdOrRenamedItem) {
         setSelectedProjectItemId(createdOrRenamedItem.id); 
      }


    } catch (error) {
      caughtError = error instanceof Error ? error : new Error(String(error));
      setProjectError(caughtError.message);
      if (isFinalizingNewItem && itemPendingCreation) { 
        
        const tempItemIdToRemove = itemPendingCreation.id;
        setProjectRootItems(prevItems => {
            const removeTempItemRecursive = (items: FileSystemItem[], idToRemove: string): FileSystemItem[] => {
                return items.filter(it => it.id !== idToRemove).map(it => {
                    if (it.type === 'folder' && (it as FolderItem).children) {
                        return {...it, children: removeTempItemRecursive((it as FolderItem).children, idToRemove)};
                    }
                    return it;
                });
            };
            
            if (findItemRecursiveFromRoot(prevItems, tempItemIdToRemove)) {
                return removeTempItemRecursive(prevItems, tempItemIdToRemove);
            }
            return prevItems;
        });
        setItemPendingCreation(null); 
        setRenamingItemInfo(prev => prev ? {...prev, currentName: trimmedNewName, validationMessage: caughtError?.message || "创建失败。"} : null);
      } else if (!isFinalizingNewItem) { 
        setRenamingItemInfo(prev => prev ? {...prev, validationMessage: caughtError?.message || "重命名失败"} : null);
      }
    } finally {
      setIsProjectLoading(false);
      if (!caughtError) { 
        setRenamingItemInfo(null); 
      }
    }
  }, [
      projectFileState.projectRootItems, projectFileState.projectSourceType, projectFileState.projectRootDirectoryHandle, 
      projectLoadInternalData, projectLoadLocalData, 
      itemPendingCreation, validateNewItemName, // Use the useCallback version here
      setIsProjectLoading, setProjectError, setRenamingItemInfo, setProjectRootItems, setItemPendingCreation, setSelectedProjectItemId
  ]);

  const requestDeleteItem = useCallback((item: FileSystemItem) => {
    setItemToDelete(item);
    setErrorForModal(null);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmProjectItemDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const openStates = new Map<string, OpenFolderStateInfo>();
    captureOpenFolderStatesRecursive(projectFileState.projectRootItems, openStates);

    setIsProjectLoading(true);
    setProjectError(null);
    setErrorForModal(null);
    try {
      if (projectFileState.projectSourceType === 'internal') {
        const success = await filesystemService.deleteInternalFileSystemItem(itemToDelete.path, itemToDelete.type as 'file' | 'folder');
        if (!success) {
          throw new Error("Failed to delete item from internal project.");
        }
      } else if (projectFileState.projectSourceType === 'local') {
        const parentPath = getItemParentPath(itemToDelete.path);
        let parentHandle: FileSystemDirectoryHandle | null = null;
        if (parentPath === '/') {
            parentHandle = projectFileState.projectRootDirectoryHandle;
        } else if (projectFileState.projectRootDirectoryHandle) {
            const pathParts = parentPath.split('/').filter(p => p);
            parentHandle = await findParentHandleRecursive(projectFileState.projectRootDirectoryHandle, pathParts);
        }
        if (!parentHandle) throw new Error(`Could not find parent directory handle for ${itemToDelete.path}`);
        await filesystemService.deleteLocalFileSystemItem(parentHandle, itemToDelete.name, itemToDelete.type as 'file' | 'folder');
      }
      
      if (projectFileState.projectSourceType === 'internal') {
        await projectLoadInternalData(openStates);
      } else if (projectFileState.projectSourceType === 'local' && projectFileState.projectRootDirectoryHandle) {
        await projectLoadLocalData(projectFileState.projectRootDirectoryHandle, openStates);
      }

      if (projectFileState.selectedProjectItemId === itemToDelete.id) {
        setSelectedProjectItemId(null);
      }
      if (projectFilesClipboard.clipboardItem?.itemMetadata.id === itemToDelete.id) {
        projectFilesClipboard.clearClipboard();
      }
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "删除操作失败。";
      setErrorForModal(errorMsg); 
    } finally {
      setIsProjectLoading(false);
    }
  }, [
      itemToDelete, projectFileState.projectSourceType, projectFileState.projectRootDirectoryHandle, projectFileState.projectRootItems, 
      projectLoadInternalData, projectLoadLocalData, 
      projectFileState.selectedProjectItemId, projectFilesClipboard, 
      setIsProjectLoading, setProjectError, setErrorForModal, setIsDeleteModalOpen, setItemToDelete, setSelectedProjectItemId
  ]);

  const cancelDeleteItem = useCallback(() => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    setErrorForModal(null);
  }, []);
  
  const clearErrorForModalProp = useCallback(() => setErrorForModal(null), []);


  return {
    renamingItemInfo,
    itemPendingCreation,
    isDeleteModalOpen,
    itemToDelete,
    errorForModal,
    clearErrorForModal: clearErrorForModalProp,

    handleRequestNewItem,
    startRenamingItem,
    submitRenameItem,
    cancelRenamingItem,
    validateNewItemName,
    requestDeleteItem,
    confirmProjectItemDelete,
    cancelDeleteItem,
  };
};
