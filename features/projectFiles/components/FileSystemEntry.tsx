
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSystemItem, FolderItem } from '../types/fileSystemTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { FolderIcon } from '../../../components/icons/FolderIcon';
import { DocumentIcon } from '../../../components/icons/DocumentIcon';
import { ChevronRightIcon } from '../../../components/icons/ChevronRightIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { ProjectFileClipboardItem } from '../types/projectFilesClipboardTypes';

interface RenamingItemInfo {
  id: string | null;
  currentName: string;
  validationMessage: string | null;
}

interface FileSystemEntryProps {
  item: FileSystemItem;
  level: number;
  onToggleFolder: (folderItem: FolderItem) => void;
  onSelectItem: (itemId: string, itemType: 'file' | 'folder', itemPath: string) => void;
  onDoubleClickItem: (item: FileSystemItem) => void;
  onContextMenu?: (event: React.MouseEvent, item: FileSystemItem) => void;
  selectedItemId: string | null;
  projectFilesClipboardItem?: ProjectFileClipboardItem | null;
  
  renamingItemInfo: RenamingItemInfo | null;
  onSubmitRename: (itemId: string, newName: string) => void;
  onCancelRename: (itemId: string) => void;
  onStartRenameTrigger?: (item: FileSystemItem) => void; 
  onValidateNewItemName?: (newName: string, parentPath: string, itemType: 'file' | 'folder', itemIdToExclude: string | null) => { isValid: boolean; isDuplicate: boolean, message?: string };
}

const INDENT_WIDTH_PX = 20;
const ICON_SIZE_CLASS = 'w-4 h-4';
const CHEVRON_SIZE_CLASS = 'w-3.5 h-3.5';
const SPINNER_SIZE_CLASS = 'w-3.5 h-3.5';
const ROW_HEIGHT_PX = 28; 
const TEMP_ITEM_PLACEHOLDER_PREFIX = "__TEMP_ITEM_PENDING_RENAME__";


export const FileSystemEntry: React.FC<FileSystemEntryProps> = ({
  item,
  level,
  onToggleFolder,
  onSelectItem,
  onDoubleClickItem,
  onContextMenu,
  selectedItemId,
  projectFilesClipboardItem,
  renamingItemInfo,
  onSubmitRename,
  onCancelRename,
  onStartRenameTrigger,
  onValidateNewItemName, 
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const isSelected = selectedItemId === item.id;
  
  const isCurrentlyRenamingThisItem = renamingItemInfo?.id === item.id;
  const isNewPendingItem = item.name.startsWith(TEMP_ITEM_PLACEHOLDER_PREFIX);

  const [editableName, setEditableName] = useState("");
  const [liveValidationMessage, setLiveValidationMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const getItemParentPath = (itemPath: string): string => {
    if (!itemPath || itemPath === '/') return '/';
    const lastSlash = itemPath.lastIndexOf('/');
    if (lastSlash === -1 || lastSlash === 0) return '/'; // Handle root-level items or paths like "/file"
    return itemPath.substring(0, lastSlash);
  };


  useEffect(() => {
    if (isCurrentlyRenamingThisItem) {
      const initialName = isNewPendingItem ? "" : (renamingItemInfo?.currentName || item.name);
      setEditableName(initialName);
      setLiveValidationMessage(null); // Clear live validation on new rename start
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setLiveValidationMessage(null); // Clear if not renaming this item
    }
  }, [isCurrentlyRenamingThisItem, item.name, renamingItemInfo?.currentName, isNewPendingItem]);
  
  const handleRenameSubmitLocal = useCallback(() => {
    if (!isCurrentlyRenamingThisItem) return;

    // Perform final validation before submitting
    const parentPath = getItemParentPath(item.path);
    const validationResult = onValidateNewItemName 
      ? onValidateNewItemName(editableName.trim(), parentPath, item.type as 'file' | 'folder', item.id)
      : { isValid: true, message: undefined };

    if (!validationResult.isValid) {
      setLiveValidationMessage(validationResult.message || "名称无效。");
      // The parent hook (useProjectItemManagement) will also set its own validation message on failed submit,
      // which acts as a fallback if this live one is somehow bypassed.
      onSubmitRename(item.id, editableName.trim()); // Still call onSubmit to trigger parent's validation & message
      return;
    }
    
    onSubmitRename(item.id, editableName.trim());
    setLiveValidationMessage(null);
  }, [item.id, item.path, item.type, editableName, onSubmitRename, isCurrentlyRenamingThisItem, onValidateNewItemName]);

  const handleRenameInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    setEditableName(newName);
    if (onValidateNewItemName) {
      const parentPath = getItemParentPath(item.path);
      const validationResult = onValidateNewItemName(newName, parentPath, item.type as 'file' | 'folder', item.id);
      setLiveValidationMessage(validationResult.message || null);
    }
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRenameSubmitLocal();
    } else if (event.key === 'Escape') {
      onCancelRename(item.id);
      setLiveValidationMessage(null);
    }
  };
  
  const displayedValidationMessage = liveValidationMessage ?? (isCurrentlyRenamingThisItem ? renamingItemInfo?.validationMessage : null);
  const isErrorStateForInput = !!displayedValidationMessage;

  const isInClipboard = projectFilesClipboardItem?.itemMetadata.id === item.id;
  const isCutItem = isInClipboard && projectFilesClipboardItem?.operation === 'cut';
  const isCopiedItem = isInClipboard && projectFilesClipboardItem?.operation === 'copy';
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'folder') {
      onToggleFolder(item as FolderItem);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentlyRenamingThisItem) return; 
    onSelectItem(item.id, item.type, item.path);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (renamingItemInfo?.id === item.id && !isNewPendingItem) return; 
    if (isNewPendingItem && inputRef.current && document.activeElement === inputRef.current) return; 

    onDoubleClickItem(item);
  };

  const handleContextMenuLocal = (e: React.MouseEvent) => {
    if (isCurrentlyRenamingThisItem && isNewPendingItem) { 
        e.preventDefault();
        return;
    }
    if (onContextMenu) {
      onContextMenu(e, item);
    }
  };

  const itemChevronIconClass = `${CHEVRON_SIZE_CLASS} shrink-0 ${isSelected && !isCurrentlyRenamingThisItem ? panelTheme.nodeItemSelectedForPlacementText : 'text-zinc-400 group-hover:text-zinc-200'}`;
  const itemSpinnerIconClass = `${SPINNER_SIZE_CLASS} shrink-0 ${isSelected && !isCurrentlyRenamingThisItem ? panelTheme.nodeItemSelectedForPlacementText : 'text-zinc-400 group-hover:text-zinc-200'}`;
  
  let itemIconClass = `${ICON_SIZE_CLASS} shrink-0 `;
  if (isSelected && !isCurrentlyRenamingThisItem) {
    itemIconClass += panelTheme.nodeItemSelectedForPlacementText;
  } else if (isCutItem && !isCurrentlyRenamingThisItem) {
     itemIconClass += `${panelTheme.itemTextCutHighlight} group-hover:${panelTheme.nodeItemTextHover}`;
  } else if (isCopiedItem && !isCurrentlyRenamingThisItem) {
     itemIconClass += `${panelTheme.itemTextCopyHighlight} group-hover:${panelTheme.nodeItemTextHover}`;
  } else if (!isCurrentlyRenamingThisItem) {
    itemIconClass += item.type === 'folder' 
      ? 'text-amber-400 group-hover:text-amber-300' 
      : 'text-sky-400 group-hover:text-sky-300';
  } else { 
    itemIconClass += item.type === 'folder' ? 'text-amber-400' : 'text-sky-400';
  }
  
  const isFolder = item.type === 'folder';
  const folderItem = isFolder ? (item as FolderItem) : null;
  
  let finalRowStyleClasses;
  if (isCurrentlyRenamingThisItem) {
    finalRowStyleClasses = `${panelTheme.categoryGroupBg}`; 
  } else if (isSelected) {
    finalRowStyleClasses = `${panelTheme.nodeItemSelectedForPlacementBg} ${panelTheme.nodeItemSelectedForPlacementText}`;
  } else if (isCutItem) {
    finalRowStyleClasses = `${panelTheme.itemBgCutHighlight} ${panelTheme.itemTextCutHighlight} group-hover:bg-zinc-700 group-hover:${panelTheme.nodeItemTextHover}`;
  } else if (isCopiedItem) {
    finalRowStyleClasses = `${panelTheme.itemBgCopyHighlight} ${panelTheme.itemTextCopyHighlight} group-hover:bg-zinc-700 group-hover:${panelTheme.nodeItemTextHover}`;
  } else {
    finalRowStyleClasses = `${panelTheme.nodeItemText} group-hover:bg-zinc-700 group-hover:${panelTheme.nodeItemTextHover}`;
  }
  
  const displayName = (isNewPendingItem && !isCurrentlyRenamingThisItem) ? (item.type === 'file' ? "新文件..." : "新文件夹...") : item.name;

  return (
    <div className="relative flex flex-col">
      <div
        className="flex items-center" 
        style={{ 
          height: `${ROW_HEIGHT_PX}px`, 
          paddingLeft: `${level * INDENT_WIDTH_PX}px`
        }}
        role="treeitem"
        aria-expanded={folderItem?.isOpen}
        aria-selected={isSelected}
        title={item.name.startsWith(TEMP_ITEM_PLACEHOLDER_PREFIX) ? (item.type === 'file' ? '新文件' : '新文件夹') : item.name}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenuLocal}
      >
        <div
          onClick={handleSelect}
          className={`group flex items-center px-1 rounded-sm cursor-pointer flex-grow min-w-0 w-full ${finalRowStyleClasses}`} 
          style={{ height: `${ROW_HEIGHT_PX}px` }}
        >
            <div className="w-5 h-full flex items-center justify-center flex-shrink-0">
              {folderItem && folderItem.isLoading ? (
                <SpinnerIcon className={itemSpinnerIconClass} />
              ) : folderItem ? (
                <span onClick={handleToggle} className={`inline-flex items-center justify-center p-0.5 rounded hover:bg-zinc-600`}>
                  {folderItem.isOpen ? <ChevronDownIcon className={itemChevronIconClass} /> : <ChevronRightIcon className={itemChevronIconClass} />}
                </span>
              ) : (
                 <div className="w-full h-full"></div> 
              )}
            </div>
            
            <div className="mx-0.5 flex-shrink-0 flex items-center justify-center">
              {isFolder ? (
                <FolderIcon className={itemIconClass} />
              ) : (
                <DocumentIcon className={itemIconClass} />
              )}
            </div>
            
            {isCurrentlyRenamingThisItem ? (
              <input
                ref={inputRef}
                type="text"
                value={editableName}
                onChange={handleRenameInputChange}
                onBlur={handleRenameSubmitLocal} 
                onKeyDown={handleRenameKeyDown}
                className={`flex-grow h-full text-sm ${panelTheme.inlineInputText} ${panelTheme.inlineInputBg} 
                            border-none outline-none px-1 box-border
                            ${isErrorStateForInput ? panelTheme.inlineInputErrorBorder : panelTheme.inlineInputBorder}
                          `}
                onClick={(e) => e.stopPropagation()} 
                onDoubleClick={(e) => e.stopPropagation()} 
                aria-label={`Rename ${item.type} ${item.name}`}
                aria-invalid={isErrorStateForInput}
                aria-describedby={isErrorStateForInput ? `rename-error-${item.id}` : undefined}
              />
            ) : (
              <span className="text-sm truncate select-none ml-1">
                {displayName}
              </span>
            )}
        </div>
      </div>
      {isErrorStateForInput && displayedValidationMessage && (
         <div 
            id={`rename-error-${item.id}`}
            className={`${panelTheme.inlineInputErrorMessageText} w-full`} 
            style={{ 
                paddingLeft: `${level * INDENT_WIDTH_PX + 5 + 16 + 4 + 4 + 1}px`, // Align with text start
                lineHeight: '1.3', 
                paddingBottom: '2px', 
                paddingTop: '0px', 
                fontSize: '0.7rem', 
                paddingRight: '4px', 
            }} 
            role="alert"
          >
            {displayedValidationMessage}
        </div>
      )}

      {folderItem && folderItem.isOpen && folderItem.childrenLoaded && !isCurrentlyRenamingThisItem && (
        <div className="relative"> 
          {folderItem.children.length > 0 && (
            <div
              className="absolute w-px bg-zinc-600"
              style={{
                left: `${(level * INDENT_WIDTH_PX) + (INDENT_WIDTH_PX / 2) - 0.5 + 2}px`, 
                top: 0, 
                height: '100%', 
              }}
              aria-hidden="true"
            />
          )}

          {folderItem.children.length > 0 ? (
            folderItem.children.map((child) => (
              <FileSystemEntry
                key={child.id}
                item={child}
                level={level + 1} 
                onToggleFolder={onToggleFolder}
                onSelectItem={onSelectItem}
                onDoubleClickItem={onDoubleClickItem}
                onContextMenu={onContextMenu}
                selectedItemId={selectedItemId}
                projectFilesClipboardItem={projectFilesClipboardItem}
                renamingItemInfo={renamingItemInfo}
                onSubmitRename={onSubmitRename}
                onCancelRename={onCancelRename}
                onStartRenameTrigger={onStartRenameTrigger}
                onValidateNewItemName={onValidateNewItemName}
              />
            ))
          ) : (
             !folderItem.isLoading && ( 
                <div 
                  className={`flex items-center text-xs italic ${panelTheme.emptyCategoryText}`}
                  style={{ 
                    height: `${ROW_HEIGHT_PX}px`,
                    paddingLeft: `${(level + 1) * INDENT_WIDTH_PX + 5 + 16 + 4}px` 
                  }}
                >
                  空文件夹
                </div>
             )
          )}
        </div>
      )}
    </div>
  );
};
