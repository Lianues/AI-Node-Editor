
import React, { useState, useEffect, useCallback } from 'react';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { FileSystemItem, FolderItem, FileItem as FileSystemFileItem } from '../types/fileSystemTypes';
import { FileSystemEntry } from './FileSystemEntry';
import { FolderIcon } from '../../../components/icons/FolderIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { ArrowPathIcon } from '../../../components/icons/ArrowPathIcon';
import { ServerStackIcon } from '../../../components/icons/ServerStackIcon';
import { useProjectFilesContextMenu } from '../hooks/useProjectFilesContextMenu';
import { buildProjectFilesContextMenuItems } from './ProjectFilesContextMenuItems';
import { ProjectFilesContextMenu } from './ProjectFilesContextMenu';
import { ProjectFileClipboardItem } from '../types/projectFilesClipboardTypes'; 

interface RenamingItemInfo {
  id: string | null;
  currentName: string;
  validationMessage: string | null;
}
interface ProjectFilesPanelProps {
  projectSourceType: 'local' | 'internal' | null;
  rootDirectoryHandle: FileSystemDirectoryHandle | null; 
  rootItems: FileSystemItem[];
  projectRootName: string;
  isLoading: boolean;
  error: string | null;
  selectedItemId: string | null;
  projectFilesClipboardItem: ProjectFileClipboardItem | null; 
  onSourceTypeSelect: (source: 'local' | 'internal') => void;
  onClearSource: () => void;
  onToggleFolder: (folderItem: FileSystemItem) => void;
  onSelectItem: (itemId: string, itemType: 'file' | 'folder', itemPath: string) => void;
  onOpenFile: (item: FileSystemItem) => void;
  
  onCutItem: (item: FileSystemItem) => void;
  onCopyItem: (item: FileSystemItem) => void;
  onPasteItem: (targetFolderItem: FileSystemItem) => void;
  
  onRequestDeleteItem: (item: FileSystemItem) => void;
  renamingItemInfo: RenamingItemInfo | null;
  onStartRenameItem: (item: FileSystemItem) => void;
  onSubmitRenameItem: (itemId: string, newName: string) => void;
  onCancelRenameItem: (itemId: string) => void;
  onRequestNewItem: (parentFolderItem: FileSystemItem, type: 'file' | 'folder') => void; 
  onValidateNewItemName?: (newName: string, parentPath: string, itemType: 'file' | 'folder', itemIdToExclude: string | null) => { isValid: boolean; isDuplicate: boolean, message?: string };
}

export const ProjectFilesPanel: React.FC<ProjectFilesPanelProps> = ({
  projectSourceType,
  rootDirectoryHandle,
  rootItems,
  projectRootName,
  isLoading,
  error,
  selectedItemId,
  projectFilesClipboardItem,
  onSourceTypeSelect,
  onClearSource,
  onToggleFolder,
  onSelectItem,
  onOpenFile,
  onCutItem,
  onCopyItem,
  onPasteItem,
  onRequestDeleteItem, 
  renamingItemInfo,      
  onStartRenameItem,
  onSubmitRenameItem,
  onCancelRenameItem,
  onRequestNewItem, 
  onValidateNewItemName, 
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;

  const {
    menuConfig: projectFilesMenuConfig,
    openProjectFilesContextMenu,
    closeProjectFilesContextMenu,
  } = useProjectFilesContextMenu();

  const handleItemContextMenu = useCallback((event: React.MouseEvent, item: FileSystemItem) => {
    const actions = {
      onCutItem: () => onCutItem(item),
      onCopyItem: () => onCopyItem(item),
      onPasteItem: () => onPasteItem(item), 
      onRenameItem: () => onStartRenameItem(item), 
      onRequestDeleteItem: () => onRequestDeleteItem(item), 
      onNewFileInFolder: () => onRequestNewItem(item, 'file'), 
      onNewFolderInFolder: () => onRequestNewItem(item, 'folder'), 
      projectFilesClipboardItem: projectFilesClipboardItem, 
    };
    const menuItems = buildProjectFilesContextMenuItems(item, actions);
    openProjectFilesContextMenu(event, item, menuItems);
  }, [openProjectFilesContextMenu, onCutItem, onCopyItem, onPasteItem, onStartRenameItem, onRequestDeleteItem, onRequestNewItem, projectFilesClipboardItem]);


  const handleToggle = (item: FileSystemItem) => {
    if (item.type === 'folder') {
      onToggleFolder(item);
    }
  };

  const handleSelect = (item: FileSystemItem) => {
    onSelectItem(item.id, item.type, item.path);
    if (item.type === 'folder') {
      const folder = item as FolderItem; 
      if (!folder.isOpen && !folder.childrenLoaded) {
        // Orchestrator handles toggling/loading if needed upon selection
      }
    }
  };

  const handleDoubleClick = (item: FileSystemItem) => {
    if (renamingItemInfo?.id === item.id) return; 

    if (item.type === 'file' && item.name.toLowerCase().endsWith('.json')) {
      onOpenFile(item);
    } else if (item.type === 'folder') {
      onToggleFolder(item);
    }
  };


  if (!projectSourceType) {
    return (
      <div className={`w-64 ${panelTheme.bg} p-4 border-r ${panelTheme.border} flex flex-col items-center justify-center text-center space-y-4`}>
        <p className={`${panelTheme.headerText} mb-2 text-md font-semibold`}>选择项目源</p>
        <button
          onClick={() => onSourceTypeSelect('internal')}
          className={`w-full flex items-center justify-center px-4 py-2 ${vscodeDarkTheme.topBar.buttonDefaultBg} hover:${vscodeDarkTheme.topBar.buttonDefaultBgHover} ${vscodeDarkTheme.topBar.buttonDefaultText} rounded-md text-sm transition-colors`}
        >
          <ServerStackIcon className="w-4 h-4 mr-2" />
          打开内部演示项目
        </button>
        <button
          onClick={() => onSourceTypeSelect('local')}
          className={`w-full flex items-center justify-center px-4 py-2 ${vscodeDarkTheme.topBar.buttonDefaultBg} hover:${vscodeDarkTheme.topBar.buttonDefaultBgHover} ${vscodeDarkTheme.topBar.buttonDefaultText} rounded-md text-sm transition-colors`}
        >
          <FolderIcon className="w-4 h-4 mr-2" />
          选择本地文件夹
        </button>
         {error && (
            <div className={`p-2 mt-2 w-full rounded-md bg-red-800 text-red-100 text-xs`}>
            错误: {error}
            </div>
        )}
      </div>
    );
  }
  
  const ChangeSourceButton = () => (
    <button 
        onClick={onClearSource} 
        className={`ml-auto p-1 rounded ${panelTheme.nodeItemBg} hover:${panelTheme.nodeItemBgHover}`} 
        title="更改项目源"
    >
        <ArrowPathIcon className={`w-4 h-4 ${panelTheme.nodeItemText}`} />
    </button>
  );

  return (
    <div className={`w-64 ${panelTheme.bg} p-2 border-r ${panelTheme.border} overflow-y-auto shrink-0 select-none`}>
      <div className="flex items-center justify-between mb-1 px-1 pt-1">
        <h2 className={`text-lg font-semibold ${panelTheme.headerText} truncate`} title={projectRootName}>
            {projectRootName}
        </h2>
        <ChangeSourceButton />
      </div>
      
      {isLoading && (!rootItems || rootItems.length === 0) && (
        <div className="flex flex-col items-center justify-center py-5">
          <SpinnerIcon className={`w-6 h-6 ${panelTheme.headerText} mb-2`} />
          <p className={`${panelTheme.headerText} text-sm`}>正在加载...</p>
        </div>
      )}

      {error && (
        <div className={`p-2 my-2 rounded-md bg-red-800 text-red-100 text-sm`}>
          错误: {error}
        </div>
      )}

      {!isLoading && rootItems && rootItems.length === 0 && !error && (
         <div className={`p-2 mt-1 rounded-md ${panelTheme.categoryGroupBg}`}>
            <p className={`text-sm ${panelTheme.emptyPanelText} px-1 py-4 text-center`}>
                文件夹为空或无法加载。
            </p>
        </div>
      )}

      {rootItems && rootItems.map((item) => (
        <FileSystemEntry
          key={item.id}
          item={item}
          level={0}
          onToggleFolder={handleToggle}
          onSelectItem={(itemId, itemType, itemPath) => onSelectItem(itemId, itemType as 'file' | 'folder', itemPath)}
          onDoubleClickItem={handleDoubleClick}
          onContextMenu={handleItemContextMenu}
          selectedItemId={selectedItemId}
          projectFilesClipboardItem={projectFilesClipboardItem}
          renamingItemInfo={renamingItemInfo}
          onSubmitRename={onSubmitRenameItem}
          onCancelRename={onCancelRenameItem}
          onStartRenameTrigger={onStartRenameItem} 
          onValidateNewItemName={onValidateNewItemName} 
        />
      ))}
      <ProjectFilesContextMenu menuConfig={projectFilesMenuConfig} onClose={closeProjectFilesContextMenu} />
    </div>
  );
};
