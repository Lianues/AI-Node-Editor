
// features/projectFiles/services/localFilesystemService.ts
import { FileSystemItem, FolderItem, FileItem } from '../types/fileSystemTypes';
import { SIMULATED_DELAY, generateUniqueFileName } from './filesystemUtils';
import { OpenFolderStateInfo } from '../hooks/useProjectFileState'; // Import OpenFolderStateInfo

async function handleToFileSystemItem(
  entryHandle: FileSystemHandle,
  currentRelativePath: string,
  openStatesMap?: Map<string, OpenFolderStateInfo> 
): Promise<FileSystemItem> {
  const name = entryHandle.name;
  let itemPath: string;
  if (currentRelativePath === '/' || currentRelativePath === '') {
    itemPath = `/${name}`;
  } else {
    itemPath = `${currentRelativePath === '/' ? '' : currentRelativePath}/${name}`;
  }

  const id = `local-${itemPath.replace(/[/\s.]/g, '_').toLowerCase()}-${entryHandle.kind}-${Date.now()}`;
  const preservedState = openStatesMap?.get(itemPath);


  if (entryHandle.kind === 'directory') {
    const dirHandle = entryHandle as FileSystemDirectoryHandle;
    let children: FileSystemItem[] = [];
    let childrenLoaded = false;

    if (preservedState?.isOpen && preservedState?.childrenLoaded) {
      children = await getDirectoryEntriesInternal(dirHandle, itemPath, openStatesMap);
      childrenLoaded = true;
    }


    const folderItem: FolderItem = {
      id,
      name,
      type: 'folder',
      path: itemPath,
      children: children,
      childrenLoaded: childrenLoaded,
      isOpen: preservedState?.isOpen || false,
      isLoading: false,
      handle: dirHandle,
    };
    return folderItem;
  } else {
    return {
      id,
      name,
      type: 'file',
      path: itemPath,
      handle: entryHandle as FileSystemFileHandle,
    };
  }
}

// Internal helper to avoid direct export and manage recursion with openStatesMap
async function getDirectoryEntriesInternal(
  directoryHandle: FileSystemDirectoryHandle,
  currentPath: string,
  openStatesMap?: Map<string, OpenFolderStateInfo>
): Promise<FileSystemItem[]> {
  const items: FileSystemItem[] = [];
  for await (const entry of directoryHandle.values()) {
    items.push(await handleToFileSystemItem(entry, currentPath, openStatesMap));
  }
  items.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
  return items;
}


export const getDirectoryNameFromHandle = async (handle: FileSystemDirectoryHandle): Promise<string> => {
  return new Promise(resolve => {
    setTimeout(() => {
        resolve(handle.name);
    }, SIMULATED_DELAY / 3);
  });
};

export const getDirectoryEntries = async (
  directoryHandle: FileSystemDirectoryHandle,
  currentPath: string,
  openStatesMap?: Map<string, OpenFolderStateInfo> 
): Promise<FileSystemItem[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const items = await getDirectoryEntriesInternal(directoryHandle, currentPath, openStatesMap);
      setTimeout(() => resolve(items), SIMULATED_DELAY); 
    } catch (error) {
      console.error(`[项目文件服务 local] 读取目录条目时出错 for '${currentPath}':`, error);
      reject(error);
    }
  });
};

export const readLocalFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  try {
    const file = await fileHandle.getFile();
    const content = await file.text();
    return content;
  } catch (error) {
    console.error(`Error reading file content for ${fileHandle.name}:`, error);
    throw new Error(`读取文件失败: ${fileHandle.name}。${error instanceof Error ? error.message : String(error)}`);
  }
};

export const saveLocalFile = async (fileHandle: FileSystemFileHandle, content: string): Promise<void> => {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (error) {
    console.error(`Error saving file ${fileHandle.name}:`, error);
    throw new Error(`保存文件失败: ${fileHandle.name}。${error instanceof Error ? error.message : String(error)}`);
  }
};

export const createLocalFile = async (
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  initialContent: string = ""
): Promise<FileSystemFileHandle> => {
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(initialContent);
    await writable.close();
    return fileHandle;
  } catch (error) {
    let message = `创建文件 "${fileName}" 失败。`;
    if (error instanceof DOMException && error.name === 'TypeMismatchError') {
      message = `无法创建文件 "${fileName}"，因为已存在同名的文件夹。请使用其他名称。`;
    } else if (error instanceof DOMException && error.name === 'NotAllowedError') {
       message = `创建文件 "${fileName}" 的权限被拒绝。请确保您已授予写入权限。`;
    } else if (error instanceof Error) {
      message += ` ${error.message}`;
    } else {
      message += ` ${String(error)}`;
    }
    console.error(`Error creating local file "${fileName}":`, error);
    throw new Error(message);
  }
};

export const createLocalFolder = async (
  directoryHandle: FileSystemDirectoryHandle,
  folderName: string
): Promise<FileSystemDirectoryHandle> => {
  try {
    const folderHandle = await directoryHandle.getDirectoryHandle(folderName, { create: true });
    return folderHandle;
  } catch (error) {
    let message = `创建文件夹 "${folderName}" 失败。`;
    if (error instanceof DOMException && error.name === 'TypeMismatchError') {
      message = `无法创建文件夹 "${folderName}"，因为已存在同名的文件。请使用其他名称。`;
    } else if (error instanceof DOMException && error.name === 'NotAllowedError') {
       message = `创建文件夹 "${folderName}" 的权限被拒绝。请确保您已授予写入权限。`;
    } else if (error instanceof Error) {
      message += ` ${error.message}`;
    } else {
      message += ` ${String(error)}`;
    }
    console.error(`Error creating local folder "${folderName}":`, error);
    throw new Error(message);
  }
};

export const deleteLocalFileSystemItem = async (
  parentDirectoryHandle: FileSystemDirectoryHandle,
  itemName: string,
  itemKind: 'file' | 'folder'
): Promise<void> => {
  try {
    await parentDirectoryHandle.removeEntry(itemName, { recursive: itemKind === 'folder' });
  } catch (error) {
    console.error(`Error deleting local ${itemKind} "${itemName}":`, error);
    throw new Error(`删除 ${itemKind} "${itemName}" 失败。${error instanceof Error ? error.message : String(error)}`);
  }
};


export const copyLocalFileSystemItemRecursive = async (
  sourceHandle: FileSystemHandle,
  targetParentDirectoryHandle: FileSystemDirectoryHandle,
  newName?: string
): Promise<void> => {
  const itemName = newName || sourceHandle.name;

  if (sourceHandle.kind === 'file') {
    const fileHandle = sourceHandle as FileSystemFileHandle;
    const targetFileHandle = await targetParentDirectoryHandle.getFileHandle(itemName, { create: true });
    const file = await fileHandle.getFile();
    const writable = await targetFileHandle.createWritable();
    await writable.write(file);
    await writable.close();
  } else if (sourceHandle.kind === 'directory') {
    const directoryHandle = sourceHandle as FileSystemDirectoryHandle;
    const targetDirectoryHandle = await targetParentDirectoryHandle.getDirectoryHandle(itemName, { create: true });
    for await (const entry of directoryHandle.values()) {
      await copyLocalFileSystemItemRecursive(entry, targetDirectoryHandle);
    }
  }
};

export const renameLocalFileSystemItem = async (
  parentDirectoryHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string,
  itemKind: 'file' | 'folder'
): Promise<void> => {
  if (oldName === newName) {
    return;
  }
  try {
    let sourceHandle: FileSystemHandle;
    if (itemKind === 'file') {
      sourceHandle = await parentDirectoryHandle.getFileHandle(oldName);
    } else {
      sourceHandle = await parentDirectoryHandle.getDirectoryHandle(oldName);
    }
    
    await copyLocalFileSystemItemRecursive(sourceHandle, parentDirectoryHandle, newName);
    await parentDirectoryHandle.removeEntry(oldName, { recursive: itemKind === 'folder' });

  } catch (error) {
    let message = `重命名 ${itemKind} "${oldName}" 为 "${newName}" 失败。`;
    if (error instanceof DOMException && error.name === 'TypeMismatchError') {
      message = `无法重命名为 "${newName}"，因为目标位置已存在一个同名但类型不同的项目。`;
    } else if (error instanceof DOMException && error.name === 'NotFoundError' && error.message.includes(oldName)) {
      message = `无法重命名：源 ${itemKind} "${oldName}" 未找到。`;
    } else if (error instanceof DOMException && error.name === 'InvalidModificationError' && error.message.includes(newName)) {
      message = `无法重命名为 "${newName}"。名称可能无效，或同名同类型的项目已存在。`;
    } else if (error instanceof Error) {
      message += ` ${error.message}`;
    } else {
      message += ` ${String(error)}`;
    }
    console.error(`Error renaming local ${itemKind} "${oldName}" to "${newName}":`, error);
    throw new Error(message);
  }
};

export const pasteLocalFileSystemItem = async (
  itemToPasteHandle: FileSystemHandle,
  targetParentDirectoryHandle: FileSystemDirectoryHandle,
  desiredName?: string
): Promise<FileSystemHandle> => {
  const finalName = desiredName || itemToPasteHandle.name;

  let newName = finalName;
  let counter = 1;
  const existingNames = [];
  for await (const entry of targetParentDirectoryHandle.values()) {
    existingNames.push(entry.name);
  }

  const baseName = itemToPasteHandle.kind === 'file' && finalName.includes('.') 
                    ? finalName.substring(0, finalName.lastIndexOf('.')) 
                    : finalName;
  const extension = itemToPasteHandle.kind === 'file' && finalName.includes('.') 
                    ? finalName.substring(finalName.lastIndexOf('.')) 
                    : '';

  while (existingNames.some(name => name.toLowerCase() === newName.toLowerCase())) {
    newName = itemToPasteHandle.kind === 'file' 
              ? `${baseName} (${counter})${extension}` 
              : `${baseName} (${counter})`;
    counter++;
  }

  try {
    if (itemToPasteHandle.kind === 'file') {
      await copyLocalFileSystemItemRecursive(itemToPasteHandle, targetParentDirectoryHandle, newName);
      return targetParentDirectoryHandle.getFileHandle(newName);
    } else if (itemToPasteHandle.kind === 'directory') {
      await copyLocalFileSystemItemRecursive(itemToPasteHandle, targetParentDirectoryHandle, newName);
      return targetParentDirectoryHandle.getDirectoryHandle(newName);
    }
  } catch (error) {
    let message = `粘贴项目 "${finalName}" 失败。`;
     if (error instanceof DOMException && error.name === 'TypeMismatchError') {
      message = `无法粘贴项目 "${newName}"，因为目标位置已存在一个同名但类型不同的项目。`;
    } else if (error instanceof Error) {
      message += ` ${error.message}`;
    } else {
      message += ` ${String(error)}`;
    }
    console.error(`Error pasting local item "${finalName}" as "${newName}":`, error);
    throw new Error(message);
  }
  throw new Error('不支持的粘贴项目类型。');
};
