
import { useCallback } from 'react';
import { FileSystemItem, FolderItem, FileItem as ProjectFileItem } from '../types/fileSystemTypes';
import { CanvasSnapshot } from '../../../types';
import * as filesystemService from '../services/filesystemService';
import { handleFileUpload, isValidCanvasSnapshot } from '../../fileManagement/uploadUtils';
import { Tab } from '../../tabs/types/tabTypes';
import { ProjectFileState, ProjectFileStateSetters, captureOpenFolderStatesRecursive, OpenFolderStateInfo, updateFolderStateRecursive } from './useProjectFileState'; // Added OpenFolderStateInfo
import { UseProjectFilesClipboardOutput } from './useProjectFilesClipboard';

const createInitialEmptySnapshot = (pan: { x: number; y: number }, scale: number): CanvasSnapshot => ({
  nodes: [],
  connections: [],
  definedAreas: [], // Added definedAreas to initial snapshot
  logicalInterfaces: [], // Added logicalInterfaces
  pan: { ...pan },
  scale: scale,
  selectedNodeIds: [],
  selectedConnectionId: null,
  nodeExecutionStates: [],
  nodeTypeToPlace: null,
});

interface UseProjectFileOperationsProps {
  projectFileState: ProjectFileState;
  projectFileSetters: ProjectFileStateSetters;
  projectFilesClipboard: UseProjectFilesClipboardOutput;
  onTabAdd: (options?: { snapshot?: CanvasSnapshot, title?: string, fileHandle?: FileSystemFileHandle, type?: Tab['type'], id?: string }) => void;
  onTabUpdate: (tabId: string, updates: Partial<Omit<Tab, 'id'>>) => void;
  getTabs: () => Tab[];
  defaultPan: { x: number; y: number };
  defaultScale: number;
  clearErrorForModal: () => void; 
}

export const useProjectFileOperations = ({
  projectFileState,
  projectFileSetters,
  projectFilesClipboard,
  onTabAdd,
  onTabUpdate,
  getTabs,
  defaultPan,
  defaultScale,
  clearErrorForModal,
}: UseProjectFileOperationsProps) => {
  const { 
    projectSourceType, projectRootDirectoryHandle, projectRootItems 
  } = projectFileState;
  const { 
    setProjectSourceType, setProjectRootDirectoryHandle, setProjectRootItems, 
    setProjectRootName, setIsProjectLoading, setProjectError, 
    setSelectedProjectItemId 
  } = projectFileSetters;

  const projectLoadInternalData = useCallback(async (openStatesToPreserve?: Map<string, OpenFolderStateInfo>) => {
    setIsProjectLoading(true);
    setProjectError(null);
    clearErrorForModal();
    try {
      const name = await filesystemService.getInternalProjectRootName();
      setProjectRootName(name);
      let items = await filesystemService.getInternalRootDirectoryItems(openStatesToPreserve); 
      setProjectRootItems(items);
      setProjectRootDirectoryHandle(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load internal project.';
      setProjectError(errorMessage);
      setProjectRootItems([]);
    } finally {
      setIsProjectLoading(false);
    }
  }, [setIsProjectLoading, setProjectError, clearErrorForModal, setProjectRootName, setProjectRootItems, setProjectRootDirectoryHandle]);

  const projectLoadLocalData = useCallback(async (dirHandle: FileSystemDirectoryHandle, openStatesToPreserve?: Map<string, OpenFolderStateInfo>) => {
    setIsProjectLoading(true);
    setProjectError(null);
    clearErrorForModal();
    try {
      const name = await filesystemService.getDirectoryNameFromHandle(dirHandle);
      setProjectRootName(name || "Local Project");
      let items = await filesystemService.getDirectoryEntries(dirHandle, '/', openStatesToPreserve);
      setProjectRootItems(items || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to load directory contents.`;
      setProjectError(errorMessage);
      setProjectRootItems([]);
    } finally {
      setIsProjectLoading(false);
    }
  }, [setIsProjectLoading, setProjectError, clearErrorForModal, setProjectRootName, setProjectRootItems]);

  const handleProjectSourceTypeSelected = useCallback(async (source: 'local' | 'internal') => {
    setProjectSourceType(source);
    setSelectedProjectItemId(null);
    clearErrorForModal();
    projectFilesClipboard.clearClipboard();
    if (source === 'internal') {
      filesystemService.resetInternalDemoProject();
      await projectLoadInternalData(); 
    } else if (source === 'local') {
      try {
        const handle = await window.showDirectoryPicker();
        setProjectRootDirectoryHandle(handle);
        await projectLoadLocalData(handle); 
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setProjectSourceType(null);
          setProjectError(null);
        } else {
          setProjectError('无法选择目录。请确保浏览器权限已授予。');
          setProjectSourceType(null);
        }
      }
    }
  }, [setProjectSourceType, setSelectedProjectItemId, clearErrorForModal, projectFilesClipboard, projectLoadInternalData, projectLoadLocalData, setProjectRootDirectoryHandle, setProjectError]);

  const handleClearProjectSource = useCallback(() => {
    setProjectSourceType(null);
    setProjectRootDirectoryHandle(null);
    setProjectRootItems([]);
    setProjectRootName("项目文件");
    setProjectError(null);
    clearErrorForModal();
    setSelectedProjectItemId(null);
    setIsProjectLoading(false);
    projectFilesClipboard.clearClipboard();
  }, [setProjectSourceType, setProjectRootDirectoryHandle, setProjectRootItems, setProjectRootName, setProjectError, clearErrorForModal, setSelectedProjectItemId, setIsProjectLoading, projectFilesClipboard]);

  const handleToggleProjectFolder = useCallback(async (folderItem: FileSystemItem) => {
    if (folderItem.type !== 'folder') return;
    const folder = folderItem as FolderItem;

    if (projectSourceType === 'local' && !folder.handle) {
      setProjectError(`Folder handle missing for local folder ${folder.name}`);
      return;
    }
    clearErrorForModal();
    
    const updateLocalFolderState = (id: string, update: Partial<FolderItem> & { newChildren?: FileSystemItem[] }) => {
        setProjectRootItems(prev => updateFolderStateRecursive(prev, id, update));
    };

    if (!folder.isOpen && !folder.childrenLoaded) {
      updateLocalFolderState(folder.id, { isLoading: true, isOpen: true });
      setProjectError(null);
      try {
        let children: FileSystemItem[];
        const currentOpenStates = new Map<string, OpenFolderStateInfo>();
        captureOpenFolderStatesRecursive(projectRootItems, currentOpenStates);

        if (projectSourceType === 'local' && folder.handle) {
          children = await filesystemService.getDirectoryEntries(folder.handle, folder.path, currentOpenStates);
        } else if (projectSourceType === 'internal') {
          children = await filesystemService.getInternalFolderContents(folder.path, currentOpenStates); 
        } else {
          throw new Error("Invalid project source type for loading folder contents.");
        }
        updateLocalFolderState(folder.id, {
          newChildren: children,
          childrenLoaded: true,
          isLoading: false,
          isOpen: true,
        });
      } catch (err) {
        setProjectError(err instanceof Error ? err.message : `Failed to load folder ${folder.name}.`);
        updateLocalFolderState(folder.id, { isLoading: false, isOpen: false });
      }
    } else {
      updateLocalFolderState(folder.id, { isOpen: !folder.isOpen, isLoading: false });
    }
  }, [projectSourceType, clearErrorForModal, setProjectRootItems, setProjectError, projectRootItems]);

  const appHandleOpenFileFromProject = useCallback(async (item: FileSystemItem) => {
    if (item.type !== 'file' || !item.name.toLowerCase().endsWith('.json')) {
      return;
    }
    setProjectError(null);
    clearErrorForModal();
    const tabTitle = item.name.replace(/\.json$/i, '');

    const tabs = getTabs();
    const existingTab = tabs.find(t => {
      if (projectSourceType === 'local' && (item as ProjectFileItem).handle) {
        return t.fileHandle === (item as ProjectFileItem).handle;
      }
      // For internal files, match by item.id as tab.id
      return t.id === item.id && !t.fileHandle && projectSourceType === 'internal';
    });

    if (existingTab) {
      onTabUpdate(existingTab.id, {}); // This should activate the tab and ensure it's selected
      return;
    }

    if (projectSourceType === 'internal') {
      // For internal files, when opening from project panel, always pass the item.id as the tab.id.
      // The onTabAdd -> onTabCreatedCallback logic in useWorkflowTabsManager will then try to
      // load persisted state from closedInternalTabStatesRef using this ID.
      onTabAdd({ title: tabTitle, id: item.id, type: 'workflow' });
    } else if (projectSourceType === 'local') {
      const fileItem = item as ProjectFileItem;
      if (!fileItem.handle) {
        setProjectError(`Cannot open local file "${item.name}": File handle is missing.`);
        return;
      }
      try {
        setIsProjectLoading(true);
        const content = await filesystemService.readLocalFileContent(fileItem.handle);
        const parsedData = JSON.parse(content);
        if (!isValidCanvasSnapshot(parsedData)) {
          setProjectError(`File "${item.name}" is not a valid workflow snapshot.`);
          setIsProjectLoading(false);
          return;
        }
        // When opening a local file, provide its handle and title, but let the ID be auto-generated by TabManager
        // as local file tabs are primarily identified by their handle.
        onTabAdd({ snapshot: parsedData, title: tabTitle, fileHandle: fileItem.handle, type: 'workflow' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Could not open or parse file "${item.name}".`;
        setProjectError(errorMessage);
      } finally {
        setIsProjectLoading(false);
      }
    }
  }, [projectSourceType, getTabs, onTabAdd, onTabUpdate, setProjectError, clearErrorForModal, setIsProjectLoading]);


  const appHandleNewPageFile = useCallback(async () => {
    const openStates = new Map<string, OpenFolderStateInfo>();
    captureOpenFolderStatesRecursive(projectRootItems, openStates);

    setIsProjectLoading(true);
    setProjectError(null);
    clearErrorForModal();
    try {
      if (projectSourceType === 'internal') {
        const existingRootItems = await filesystemService.getInternalRootDirectoryItems();
        const existingRootItemNamesAndTypes = existingRootItems.map(i => ({ name: i.name, type: i.type as 'file' | 'folder' }));
        const newFileName = filesystemService.generateUniqueFileName("Untitled", ".json", 'file', existingRootItemNamesAndTypes);
        const createdFile = await filesystemService.createInternalFile('/', newFileName);
        if (createdFile) {
          await projectLoadInternalData(openStates);
          // For new internal file, pass the createdFile.id as the tab.id
          // Pass undefined for snapshot and title, TabManager will generate a default title if necessary.
          onTabAdd({ id: createdFile.id, type: 'workflow', title: newFileName.replace(/\.json$/i, '') }); 
        } else {
          throw new Error("Failed to create file in internal project structure.");
        }
      } else if (projectSourceType === 'local' && projectRootDirectoryHandle) {
        const desiredName = prompt("输入新页面的文件名 (不含 .json):", "Untitled");
        if (!desiredName || desiredName.trim() === "") {
          setIsProjectLoading(false);
          return;
        }
        const currentLocalRootItemsForNameCheck = await filesystemService.getDirectoryEntries(projectRootDirectoryHandle, '/');
        const currentLocalRootItemsNamesAndTypes = currentLocalRootItemsForNameCheck.map(i => ({ name: i.name, type: i.type as 'file' | 'folder' }));
        
        const uniqueFileName = filesystemService.generateUniqueFileName(desiredName.trim(), ".json", 'file', currentLocalRootItemsNamesAndTypes);
        const newFileHandle = await projectRootDirectoryHandle.getFileHandle(uniqueFileName, { create: true });
        const emptySnapshot = createInitialEmptySnapshot(defaultPan, defaultScale);
        const jsonString = JSON.stringify(emptySnapshot, null, 2);
        await filesystemService.saveLocalFile(newFileHandle, jsonString);
        // For new local file, provide snapshot, title, and handle. ID will be auto-generated.
        onTabAdd({ snapshot: emptySnapshot, title: uniqueFileName.replace(/\.json$/i, ''), fileHandle: newFileHandle, type: 'workflow' });
        await projectLoadLocalData(projectRootDirectoryHandle, openStates);
      } else {
        alert("请先选择一个项目源 (内部或本地文件夹) 以创建新页面。");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "创建新页面文件失败。";
      setProjectError(errorMessage);
    } finally {
      setIsProjectLoading(false);
    }
  }, [projectSourceType, projectRootDirectoryHandle, defaultPan, defaultScale, projectLoadInternalData, projectLoadLocalData, onTabAdd, setIsProjectLoading, setProjectError, clearErrorForModal, projectRootItems]);

  const appHandleOpenPageFileGlobal = useCallback(async () => {
    const openStates = new Map<string, OpenFolderStateInfo>();
    captureOpenFolderStatesRecursive(projectRootItems, openStates);
    setIsProjectLoading(true);
    setProjectError(null);
    clearErrorForModal();
    try {
      const { snapshot, filename: originalImportFilename, rawContent } = await handleFileUpload();
      const importedTabTitle = originalImportFilename.replace(/\.json$/i, '');
      let actualFilenameForFileSystem = originalImportFilename;

      if (projectSourceType === 'local' && projectRootDirectoryHandle) {
        try {
          const currentLocalRootItems = await filesystemService.getDirectoryEntries(projectRootDirectoryHandle, '/'); 
          const currentLocalRootItemNamesAndTypes = currentLocalRootItems.map(i => ({ name: i.name, type: i.type as 'file' | 'folder' }));
          const uniqueLocalFilename = filesystemService.generateUniqueFileName(importedTabTitle, originalImportFilename.toLowerCase().endsWith('.json') ? '.json' : '', 'file', currentLocalRootItemNamesAndTypes);
          actualFilenameForFileSystem = uniqueLocalFilename;
          const newLocalFileHandle = await projectRootDirectoryHandle.getFileHandle(actualFilenameForFileSystem, { create: true });
          await filesystemService.saveLocalFile(newLocalFileHandle, rawContent);
          // ID will be auto-generated by TabManager
          onTabAdd({snapshot, title: actualFilenameForFileSystem.replace(/\.json$/i, ''), fileHandle: newLocalFileHandle, type: 'workflow'});
          await projectLoadLocalData(projectRootDirectoryHandle, openStates);
        } catch (localSaveError) {
          const errorMsg = localSaveError instanceof Error ? localSaveError.message : String(localSaveError);
          setProjectError(`Error saving imported file to local project: ${errorMsg}`);
          alert(`File imported, but failed to save to local project: ${errorMsg}\nOpening in a temporary tab.`);
          onTabAdd({snapshot, title: importedTabTitle, type: 'workflow'}); // ID auto-gen
        }
      } else {
        let finalTabTitleForDisplay = importedTabTitle;
        let finalIdForTab: string | undefined = undefined; // Let TabManager generate if not internal
        if (projectSourceType === 'internal') {
          const internalItems = await filesystemService.getInternalRootDirectoryItems(); 
          const internalItemNamesAndTypes = internalItems.map(i => ({ name: i.name, type: i.type as 'file' | 'folder' }));
          actualFilenameForFileSystem = filesystemService.generateUniqueFileName(importedTabTitle, originalImportFilename.toLowerCase().endsWith('.json') ? '.json' : '', 'file', internalItemNamesAndTypes);
          finalTabTitleForDisplay = actualFilenameForFileSystem.replace(/\.json$/i, '');
          // For internal, we want to ensure the tab ID matches the created/ensured file ID
          const ensuredInternalFile = await filesystemService.ensureInternalFileEntryExists(actualFilenameForFileSystem);
          finalIdForTab = ensuredInternalFile.id; 
          await projectLoadInternalData(openStates);
        }
        onTabAdd({snapshot, title: finalTabTitleForDisplay, id: finalIdForTab, type: 'workflow'});
      }
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      alert(`Error opening file: ${errorMessage}`);
      setProjectError(`Error during file import: ${errorMessage}`);
    } finally {
      setIsProjectLoading(false);
    }
  }, [projectSourceType, projectRootDirectoryHandle, onTabAdd, projectLoadLocalData, projectLoadInternalData, setIsProjectLoading, setProjectError, clearErrorForModal, projectRootItems]);
  
  return {
    projectLoadInternalData,
    projectLoadLocalData, // Added this to the return object
    handleProjectSourceTypeSelected,
    handleClearProjectSource,
    handleToggleProjectFolder,
    appHandleOpenFileFromProject,
    appHandleNewPageFile,
    appHandleOpenPageFileGlobal,
  };
};