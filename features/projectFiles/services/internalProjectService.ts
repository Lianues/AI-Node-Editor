
// features/projectFiles/services/internalProjectService.ts
import { FileSystemItem, FolderItem, FileItem } from '../types/fileSystemTypes';
import { SIMULATED_DELAY, TEMP_ITEM_PLACEHOLDER_PREFIX, generateUniqueFileName } from './filesystemUtils';
import { OpenFolderStateInfo } from '../hooks/useProjectFileState'; // Import OpenFolderStateInfo

const internalDemoProjectName = "内部演示项目";
const initialInternalDemoFileSystemData: FolderItem = {
  id: 'internal-root',
  name: internalDemoProjectName,
  type: 'folder',
  path: '/',
  childrenLoaded: true,
  isOpen: true,
  children: [
    {
      id: 'internal-folder-workspace',
      name: '工作项目',
      type: 'folder',
      path: '/工作项目',
      children: [],
      isOpen: true,
      childrenLoaded: true,
    },
  ],
};

let mutableInternalDemoFileSystemData: FolderItem = JSON.parse(JSON.stringify(initialInternalDemoFileSystemData));

// Recursive helper for finding a folder by path for mutation (write operations)
const findFolderByPathForMutation = (rootNode: FolderItem, folderPath: string): FolderItem | null => {
    if (folderPath === '/') return rootNode;
    const pathParts = folderPath.split('/').filter(p => p && p !== '');
    
    let currentFolderNode: FolderItem = rootNode;

    for (const part of pathParts) {
        const found = currentFolderNode.children?.find(item => item.name === part && item.type === 'folder') as FolderItem | undefined;
        if (!found) return null;
        currentFolderNode = found;
    }
    return currentFolderNode;
};


// New recursive helper to apply open states throughout the tree for read operations
const applyOpenStatesToTreeRecursive = (
  items: FileSystemItem[],
  openStatesMap?: Map<string, OpenFolderStateInfo>
): FileSystemItem[] => {
  if (!openStatesMap || openStatesMap.size === 0) {
    return items.map(item => JSON.parse(JSON.stringify(item))).sort((a, b) => { // Ensure sort even if no map
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return items.map(item => {
    const clonedItem = JSON.parse(JSON.stringify(item)); 
    if (clonedItem.type === 'folder') {
      const folder = clonedItem as FolderItem;
      
      const preservedState = openStatesMap.get(folder.path);
      
      if (preservedState) {
        folder.isOpen = preservedState.isOpen;
        folder.childrenLoaded = preservedState.childrenLoaded;
      }

      if (folder.isOpen && folder.childrenLoaded) {
        if (folder.children && folder.children.length > 0) {
          folder.children = applyOpenStatesToTreeRecursive(folder.children, openStatesMap);
        }
      } else if (folder.isOpen && !folder.childrenLoaded) {
        folder.children = [];
      }
      
      if (folder.children) {
        folder.children.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
      }
    }
    return clonedItem;
  }).sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
};


export const getInternalProjectRootName = async (): Promise<string> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(mutableInternalDemoFileSystemData.name), SIMULATED_DELAY / 2);
  });
};

export const getInternalRootDirectoryItems = async (
  openStatesMap?: Map<string, OpenFolderStateInfo>
): Promise<FileSystemItem[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const rootChildrenCopy: FileSystemItem[] = JSON.parse(JSON.stringify(mutableInternalDemoFileSystemData.children || []));
      const itemsWithState = applyOpenStatesToTreeRecursive(rootChildrenCopy, openStatesMap);
      
      // Example of how to check a specific folder for debugging after processing
      // const targetDebugPath = '/工作项目/222'; 
      // const rootFolderForDebug = itemsWithState.find(item => item.path === '/工作项目' && item.type === 'folder') as FolderItem | undefined;
      // if (rootFolderForDebug && rootFolderForDebug.children) {
      //   const targetChildDebug = rootFolderForDebug.children.find(child => child.path === targetDebugPath && child.type === 'folder') as FolderItem | undefined;
      //   if (targetChildDebug) {
      //       console.log(`[项目文件服务 internal GET_ROOT DEBUG FOLDER] 文件夹 '${targetDebugPath}' 在返回前: isOpen=${targetChildDebug.isOpen}, childrenLoaded=${targetChildDebug.childrenLoaded}, children: ${targetChildDebug.children?.map(c => c.name).join(', ')}`);
      //   }
      // }
      
      resolve(itemsWithState);
    }, SIMULATED_DELAY);
  });
};

export const getInternalFolderContents = async (
  folderPath: string,
  openStatesMap?: Map<string, OpenFolderStateInfo>
): Promise<FileSystemItem[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const targetFolder = findFolderByPathForMutation(mutableInternalDemoFileSystemData, folderPath);

      if (targetFolder && targetFolder.children) {
        const childrenCopy: FileSystemItem[] = JSON.parse(JSON.stringify(targetFolder.children));
        const itemsWithState = applyOpenStatesToTreeRecursive(childrenCopy, openStatesMap);
        resolve(itemsWithState);
      } else if (targetFolder && !targetFolder.children) {
        resolve([]);
      }
      else {
        reject(new Error(`Could not retrieve contents for internal folder: ${folderPath}`));
      }
    }, SIMULATED_DELAY);
  });
};

export const createInternalFile = async (parentFolderPath: string, fileName: string): Promise<FileItem> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const parentFolder = findFolderByPathForMutation(mutableInternalDemoFileSystemData, parentFolderPath);
      if (!parentFolder) {
        reject(new Error(`Parent folder not found: ${parentFolderPath}`));
        return;
      }
      if (!parentFolder.children) {
        parentFolder.children = [];
      }
      const trimmedFileName = fileName.trim();
      if (!trimmedFileName || trimmedFileName.includes('/')) {
        reject(new Error("文件名无效。文件名不能为空且不能包含 '/'。"));
        return;
      }

      if (parentFolder.children.some(item => item.name.toLowerCase() === trimmedFileName.toLowerCase() && item.type === 'file')) {
        reject(new Error(`类型为 "文件" 且名称为 "${trimmedFileName}" 的项目已在文件夹 "${parentFolder.name}" 中存在。`));
        return;
      }

      const newFilePath = parentFolderPath === '/' ? `/${trimmedFileName}` : `${parentFolderPath}/${trimmedFileName}`;
      const newFileItem: FileItem = {
        id: `internal-${newFilePath.replace(/[/\s.]/g, '_').toLowerCase()}-file-${Date.now()}`,
        name: trimmedFileName,
        type: 'file',
        path: newFilePath,
      };

      parentFolder.children.push(newFileItem);
      parentFolder.children.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      parentFolder.childrenLoaded = true;

      resolve(JSON.parse(JSON.stringify(newFileItem)));
    }, SIMULATED_DELAY / 2);
  });
};

export const createInternalFolder = async (parentFolderPath: string, folderName: string): Promise<FolderItem> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const parentFolder = findFolderByPathForMutation(mutableInternalDemoFileSystemData, parentFolderPath);
      if (!parentFolder) {
        reject(new Error(`Parent folder not found: ${parentFolderPath}`));
        return;
      }
      if (!parentFolder.children) {
        parentFolder.children = [];
      }
      const trimmedFolderName = folderName.trim();
      if (!trimmedFolderName || trimmedFolderName.includes('/')) {
        reject(new Error("文件夹名称无效。名称不能为空且不能包含 '/'。"));
        return;
      }
      
      if (parentFolder.children.some(item => item.name.toLowerCase() === trimmedFolderName.toLowerCase() && item.type === 'folder')) {
        reject(new Error(`类型为 "文件夹" 且名称为 "${trimmedFolderName}" 的项目已在文件夹 "${parentFolder.name}" 中存在。`));
        return;
      }
      
      const newFolderPath = parentFolderPath === '/' ? `/${trimmedFolderName}` : `${parentFolderPath}/${trimmedFolderName}`;
      const newFolderItem: FolderItem = {
        id: `internal-${newFolderPath.replace(/[/\s.]/g, '_').toLowerCase()}-folder-${Date.now()}`,
        name: trimmedFolderName,
        type: 'folder',
        path: newFolderPath,
        children: [],
        isOpen: false,
        childrenLoaded: true, 
      };

      parentFolder.children.push(newFolderItem);
      parentFolder.children.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      parentFolder.childrenLoaded = true;
      
      resolve(JSON.parse(JSON.stringify(newFolderItem)));
    }, SIMULATED_DELAY / 2);
  });
};


export const ensureInternalFileEntryExists = async (fileName: string): Promise<FileItem> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rootFolder = mutableInternalDemoFileSystemData; 
      let fileItem = rootFolder.children.find(
        (item): item is FileItem => item.name.toLowerCase() === fileName.toLowerCase() && item.type === 'file'
      );

      if (fileItem) {
        resolve(JSON.parse(JSON.stringify(fileItem)));
      } else {
        const newFilePath = `/${fileName}`;
        const newFile: FileItem = {
          id: `internal-root-${fileName.replace(/[/\s.]/g, '_').toLowerCase()}-file-${Date.now()}`,
          name: fileName,
          type: 'file',
          path: newFilePath,
        };
        rootFolder.children.push(newFile);
        rootFolder.children.sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
        rootFolder.childrenLoaded = true;
        resolve(JSON.parse(JSON.stringify(newFile)));
      }
    }, SIMULATED_DELAY / 3);
  });
};


export const deleteInternalFileSystemItem = async (itemPath: string, itemType: 'file' | 'folder'): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const pathParts = itemPath.split('/').filter(p => p && p !== '');
       if (pathParts.length === 0 && itemPath !== '/') {
        resolve(false);
        return;
      }

      const parentPathString = pathParts.slice(0, -1).join('/');
      const oldItemName = pathParts.pop();

      if (!oldItemName && itemPath !== '/') {
        resolve(false);
        return;
      }
      
      const parentFolder = findFolderByPathForMutation(mutableInternalDemoFileSystemData, itemPath === '/' ? '/' : `/${parentPathString}`);

      if (parentFolder && parentFolder.children) {
        const itemIndex = parentFolder.children.findIndex(i => i.name === oldItemName && i.path === itemPath && i.type === itemType);
        if (itemIndex > -1) {
          parentFolder.children.splice(itemIndex, 1);
          resolve(true);
          return;
        }
      }
      resolve(false);
    }, SIMULATED_DELAY / 2);
  });
};


export const renameInternalFileSystemItem = async (itemPath: string, newName: string, itemType: 'file' | 'folder'): Promise<FileSystemItem | null> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!newName || newName.trim() === "" || newName.includes('/')) {
        reject(new Error("新名称无效。名称不能为空且不能包含 '/'。"));
        return;
      }

      const pathParts = itemPath.split('/').filter(p => p && p !== '');
      if (pathParts.length === 0 && itemPath !== '/') {
        reject(new Error("无效的项目路径。"));
        return;
      }

      const parentPathString = pathParts.slice(0, -1).join('/');
      const parentFullPath = parentPathString === '' ? '/' : `/${parentPathString}`;
      const oldItemName = pathParts.pop();

      if (!oldItemName) {
        reject(new Error("无法从路径中提取项目名称。"));
        return;
      }

      const parentFolder = findFolderByPathForMutation(mutableInternalDemoFileSystemData, parentFullPath);
      if (!parentFolder || !parentFolder.children) {
        reject(new Error("找不到父文件夹。"));
        return;
      }

      const itemToRename = parentFolder.children.find(i => i.name === oldItemName && i.path === itemPath && i.type === itemType);
      if (!itemToRename) {
        reject(new Error(`找不到类型为 "${itemType}" 的项目: ${itemPath}`));
        return;
      }

      if (parentFolder.children.some(i => i.id !== itemToRename.id && i.name.toLowerCase() === newName.toLowerCase() && i.type === itemType)) {
        reject(new Error(`类型为 "${itemType}" 且名称为 "${newName}" 的项目已在文件夹 "${parentFolder.name}" 中存在。`));
        return;
      }


      itemToRename.name = newName;
      itemToRename.path = parentFullPath === '/' ? `/${newName}` : `${parentFullPath}/${newName}`;
      itemToRename.id = `internal-${itemToRename.path.replace(/[/\s.]/g, '_').toLowerCase()}-${itemToRename.type}-${Date.now()}`;

      if (itemToRename.type === 'folder') {
        const updateChildrenPathsRecursive = (folder: FolderItem, currentParentPath: string) => {
          folder.children.forEach(child => {
            child.path = `${currentParentPath}/${child.name}`;
            child.id = `internal-${child.path.replace(/[/\s.]/g, '_').toLowerCase()}-${child.type}-${Date.now()}`;
            if (child.type === 'folder') {
              updateChildrenPathsRecursive(child as FolderItem, child.path);
            }
          });
        };
        updateChildrenPathsRecursive(itemToRename as FolderItem, itemToRename.path);
      }

      parentFolder.children.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });

      resolve(JSON.parse(JSON.stringify(itemToRename)));
    }, SIMULATED_DELAY / 2);
  });
};

export const pasteInternalFileSystemItem = async (
  itemToPaste: FileSystemItem, 
  targetFolderPath: string,
  operation: 'copy' | 'cut'
): Promise<FileSystemItem | null> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const targetFolder = findFolderByPathForMutation(mutableInternalDemoFileSystemData, targetFolderPath);
      if (!targetFolder) {
        reject(new Error(`Target folder not found: ${targetFolderPath}`));
        return;
      }
      if (!targetFolder.children) {
        targetFolder.children = [];
      }
      
      const pastedItemCopy: FileSystemItem = JSON.parse(JSON.stringify({
          id: itemToPaste.id, 
          name: itemToPaste.name,
          type: itemToPaste.type,
          path: itemToPaste.path, 
          handle: undefined, 
          ...(itemToPaste.type === 'folder' && { children: (itemToPaste as FolderItem).children || [], isOpen: false, childrenLoaded: false })
      }));


      const baseName = pastedItemCopy.type === 'file' && pastedItemCopy.name.includes('.')
        ? pastedItemCopy.name.substring(0, pastedItemCopy.name.lastIndexOf('.'))
        : pastedItemCopy.name;
      const extension = pastedItemCopy.type === 'file' && pastedItemCopy.name.includes('.')
        ? pastedItemCopy.name.substring(pastedItemCopy.name.lastIndexOf('.'))
        : '';

      const existingNamesAndTypesInTarget = targetFolder.children.map(c => ({ name: c.name, type: c.type as 'file' | 'folder' }));
      pastedItemCopy.name = generateUniqueFileName(baseName, extension, pastedItemCopy.type as 'file' | 'folder', existingNamesAndTypesInTarget);
      pastedItemCopy.path = targetFolderPath === '/' ? `/${pastedItemCopy.name}` : `${targetFolderPath}/${pastedItemCopy.name}`;
      pastedItemCopy.id = `internal-${pastedItemCopy.path.replace(/[/\s.]/g, '_').toLowerCase()}-${pastedItemCopy.type}-${Date.now()}`;

      if (pastedItemCopy.type === 'folder') {
        const updateChildrenPaths = (currentItems: FileSystemItem[], parentPath: string) => {
          currentItems.forEach(child => {
            child.path = `${parentPath}/${child.name}`;
            child.id = `internal-${child.path.replace(/[/\s.]/g, '_').toLowerCase()}-${child.type}-${Date.now()}`;
            if (child.type === 'folder' && (child as FolderItem).children) {
              updateChildrenPaths((child as FolderItem).children, child.path);
            }
          });
        };
        if ((pastedItemCopy as FolderItem).children) {
            updateChildrenPaths((pastedItemCopy as FolderItem).children, pastedItemCopy.path);
        }
      }

      targetFolder.children.push(pastedItemCopy);
      targetFolder.children.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      targetFolder.childrenLoaded = true;

      resolve(pastedItemCopy);
    }, SIMULATED_DELAY);
  });
};

export const createTemporaryInternalItem = async (
  parentFolderPath: string,
  type: 'file' | 'folder'
): Promise<FileSystemItem> => {
  return new Promise((resolve) => { 
    setTimeout(() => {
      const tempName = `${TEMP_ITEM_PLACEHOLDER_PREFIX}${Date.now()}`;
      const tempPath = parentFolderPath === '/' ? `/${tempName}` : `${parentFolderPath}/${tempName}`;
      const tempId = `temp-internal-${tempPath.replace(/[/\s.]/g, '_').toLowerCase()}-${type}-${Date.now()}`;

      let newItem: FileSystemItem;
      if (type === 'file') {
        newItem = {
          id: tempId,
          name: tempName,
          type: 'file',
          path: tempPath,
        };
      } else {
        newItem = {
          id: tempId,
          name: tempName,
          type: 'folder',
          path: tempPath,
          children: [],
          isOpen: false, 
          childrenLoaded: true, 
        } as FolderItem;
      }
      resolve(newItem); 
    }, SIMULATED_DELAY / 4); 
  });
};

export const resetInternalDemoProject = () => {
  mutableInternalDemoFileSystemData = JSON.parse(JSON.stringify(initialInternalDemoFileSystemData));
};
