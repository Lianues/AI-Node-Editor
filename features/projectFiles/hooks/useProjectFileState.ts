
import { useState, useCallback } from 'react';
import { FileSystemItem, FolderItem } from '../types/fileSystemTypes';

export interface ProjectFileState {
  projectSourceType: 'local' | 'internal' | null;
  projectRootDirectoryHandle: FileSystemDirectoryHandle | null;
  projectRootItems: FileSystemItem[];
  projectRootName: string;
  isProjectLoading: boolean;
  projectError: string | null;
  selectedProjectItemId: string | null;
}

export interface ProjectFileStateSetters {
  setProjectSourceType: React.Dispatch<React.SetStateAction<'local' | 'internal' | null>>;
  setProjectRootDirectoryHandle: React.Dispatch<React.SetStateAction<FileSystemDirectoryHandle | null>>;
  setProjectRootItems: React.Dispatch<React.SetStateAction<FileSystemItem[]>>;
  setProjectRootName: React.Dispatch<React.SetStateAction<string>>;
  setIsProjectLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setProjectError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedProjectItemId: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface OpenFolderStateInfo {
  isOpen: boolean;
  childrenLoaded: boolean;
}

export const updateFolderStateRecursive = (
  items: FileSystemItem[],
  folderId: string, // Still uses ID for direct updates
  update: Partial<FolderItem> & { newChildren?: FileSystemItem[] }
): FileSystemItem[] => {
  return items.map(item => {
    if (item.id === folderId && item.type === 'folder') {
      const updatedFolder = { ...item, ...update } as FolderItem;
      if ('newChildren' in update && update.newChildren !== undefined) {
        updatedFolder.children = update.newChildren;
      }
      return updatedFolder;
    }
    if (item.type === 'folder' && (item as FolderItem).children && (item as FolderItem).children.length > 0) {
      return { ...item, children: updateFolderStateRecursive((item as FolderItem).children, folderId, update) };
    }
    return item;
  });
};

export const captureOpenFolderStatesRecursive = (
  items: FileSystemItem[],
  openStates: Map<string, OpenFolderStateInfo> // Key is item.path
) => {
  items.forEach(item => {
    if (item.type === 'folder') {
      const folder = item as FolderItem;
      openStates.set(folder.path, { isOpen: !!folder.isOpen, childrenLoaded: !!folder.childrenLoaded });
      if (folder.children && folder.children.length > 0) {
        captureOpenFolderStatesRecursive(folder.children, openStates);
      }
    }
  });
};

export const applyOpenFolderStatesRecursive = (
  items: FileSystemItem[],
  openStates: Map<string, OpenFolderStateInfo> // Key is item.path
): FileSystemItem[] => {
  return items.map(item => {
    if (item.type === 'folder') {
      const folderItem = item as FolderItem;
      const preservedState = openStates.get(folderItem.path); // Use path as key
      const newFolderItem = { ...folderItem };
      if (preservedState !== undefined) {
        newFolderItem.isOpen = preservedState.isOpen;
        // Note: childrenLoaded is managed by the loading process, not directly reapplied here,
        // as this function typically runs on newly fetched items.
      }
      // If children were part of `items` (e.g. internal project structure), recurse.
      // For local FS, `getDirectoryEntries` will handle recursive loading based on openStates.
      if (newFolderItem.children && newFolderItem.children.length > 0) {
        newFolderItem.children = applyOpenFolderStatesRecursive(newFolderItem.children, openStates);
      }
      return newFolderItem;
    }
    return item;
  });
};


export const useProjectFileState = () => {
  const [projectSourceType, setProjectSourceType] = useState<'local' | 'internal' | null>(null);
  const [projectRootDirectoryHandle, setProjectRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [projectRootItems, setProjectRootItems] = useState<FileSystemItem[]>([]);
  const [projectRootName, setProjectRootName] = useState<string>("项目文件");
  const [isProjectLoading, setIsProjectLoading] = useState<boolean>(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [selectedProjectItemId, setSelectedProjectItemId] = useState<string | null>(null);

  const state: ProjectFileState = {
    projectSourceType,
    projectRootDirectoryHandle,
    projectRootItems,
    projectRootName,
    isProjectLoading,
    projectError,
    selectedProjectItemId,
  };

  const setters: ProjectFileStateSetters = {
    setProjectSourceType,
    setProjectRootDirectoryHandle,
    setProjectRootItems,
    setProjectRootName,
    setIsProjectLoading,
    setProjectError,
    setSelectedProjectItemId,
  };
  
  return {
    ...state,
    ...setters,
    updateFolderStateRecursive: (folderId: string, update: Partial<FolderItem> & { newChildren?: FileSystemItem[] }) => 
        setProjectRootItems(prev => updateFolderStateRecursive(prev, folderId, update)),
  };
};
