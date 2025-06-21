
import React, { useState, useRef, useMemo } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon'; // Added StopIcon
import { vscodeDarkTheme } from '../theme/vscodeDark';
import { EditMenu } from './TopBar/EditMenu';
import { EditMenuItem } from './TopBar/editMenuTypes';
import { ViewMenu } from './TopBar/ViewMenu';
import { ViewMenuItem } from './TopBar/viewMenuTypes';
import { FileMenu } from './TopBar/FileMenu';
import { FileMenuItem } from './TopBar/fileMenuTypes';
import { CanvasMenu } from './TopBar/CanvasMenu'; 
import { CanvasMenuItem } from './TopBar/canvasMenuTypes'; 
import { AddMenu } from './TopBar/AddMenu';
import { AddMenuItem } from './TopBar/addMenuTypes';
import { HistoryEntry } from '../../features/history/historyTypes';
import { CanvasSnapshot, Tab } from '../../types';

interface TopBarProps {
  onAddNode: () => void; 
  onRunWorkflow: () => void;
  onTerminateWorkflow: () => void; // Added
  isWorkflowRunning: boolean; 
  selectedNodeIds: string[]; 
  primarySelectedNodeId: string | null; 
  selectedConnectionId: string | null;
  canPaste: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onMarqueeSelectStart: () => void; 
  canUndo: boolean; 
  onUndo: () => void; 
  canRedo: boolean;
  onRedo: () => void;
  onStartCreateNodeGroup: () => void; 
  activeTabHistory: HistoryEntry[]; 
  currentHistoryIndex: number; 
  onRestoreHistoryEntry: (entryId: string) => void; 
  onOpenAiToolsViewer: () => void;
  onDownloadPage: () => void;
  onOpenPageFile: () => void;
  onNewPageFile: () => void;
  onSavePageFile: () => void; 
  onExportProject?: () => void; 
  onImportProject?: () => void; 
  projectSourceTypeForFileMenu: 'local' | 'internal' | null; 
  activeTabId: string | null; 
  activeTabUnsaved?: boolean; 
  activeTabHasFileHandle?: boolean; 
  onStartDefiningArea: () => void; 
  onOpenCreateCustomAiNodeModal: () => void;
  // onOpenCreateCustomDataNodeModal prop removed
  onOpenGlobalSettingsModal: () => void; 
  onClearAllNodeHighlights: () => void; 
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onAddNode, 
  onRunWorkflow,
  onTerminateWorkflow, // Destructure
  isWorkflowRunning, 
  selectedNodeIds, 
  primarySelectedNodeId, 
  selectedConnectionId,
  canPaste,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onMarqueeSelectStart,
  canUndo, 
  onUndo, 
  canRedo,
  onRedo,
  onStartCreateNodeGroup, 
  activeTabHistory, 
  currentHistoryIndex, 
  onRestoreHistoryEntry,
  onOpenAiToolsViewer, 
  onDownloadPage,
  onOpenPageFile,
  onNewPageFile,
  onSavePageFile,
  onExportProject, 
  onImportProject, 
  projectSourceTypeForFileMenu,
  activeTabId,        
  activeTabUnsaved,   
  activeTabHasFileHandle, 
  onStartDefiningArea,
  onOpenCreateCustomAiNodeModal,
  // onOpenCreateCustomDataNodeModal prop removed from destructuring
  onOpenGlobalSettingsModal, 
  onClearAllNodeHighlights, 
}) => {
  const menuItemsText = ['文件', '编辑', '添加', '查看', '画布']; 
  
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const editMenuButtonRef = useRef<HTMLButtonElement>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuButtonRef = useRef<HTMLButtonElement>(null); 

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuButtonRef = useRef<HTMLButtonElement>(null);

  const [isCanvasMenuOpen, setIsCanvasMenuOpen] = useState(false); 
  const canvasMenuButtonRef = useRef<HTMLButtonElement>(null); 

  const handleFileMenuToggle = () => {
    setIsFileMenuOpen(prev => !prev);
    if (isEditMenuOpen) setIsEditMenuOpen(false);
    if (isAddMenuOpen) setIsAddMenuOpen(false); 
    if (isViewMenuOpen) setIsViewMenuOpen(false);
    if (isCanvasMenuOpen) setIsCanvasMenuOpen(false); 
  };

  const closeFileMenu = () => setIsFileMenuOpen(false);

  const handleEditMenuToggle = () => {
    setIsEditMenuOpen(prev => !prev);
    if (isFileMenuOpen) setIsFileMenuOpen(false);
    if (isAddMenuOpen) setIsAddMenuOpen(false); 
    if (isViewMenuOpen) setIsViewMenuOpen(false); 
    if (isCanvasMenuOpen) setIsCanvasMenuOpen(false); 
  };

  const closeEditMenu = () => setIsEditMenuOpen(false);

  const handleAddMenuToggle = () => { 
    setIsAddMenuOpen(prev => !prev);
    if (isFileMenuOpen) setIsFileMenuOpen(false);
    if (isEditMenuOpen) setIsEditMenuOpen(false);
    if (isViewMenuOpen) setIsViewMenuOpen(false);
    if (isCanvasMenuOpen) setIsCanvasMenuOpen(false);
  };

  const closeAddMenu = () => setIsAddMenuOpen(false);

  const handleViewMenuToggle = () => { 
    setIsViewMenuOpen(prev => !prev);
    if (isFileMenuOpen) setIsFileMenuOpen(false);
    if (isEditMenuOpen) setIsEditMenuOpen(false); 
    if (isAddMenuOpen) setIsAddMenuOpen(false); 
    if (isCanvasMenuOpen) setIsCanvasMenuOpen(false); 
  };

  const closeViewMenu = () => setIsViewMenuOpen(false);

  const handleCanvasMenuToggle = () => { 
    setIsCanvasMenuOpen(prev => !prev);
    if (isFileMenuOpen) setIsFileMenuOpen(false);
    if (isEditMenuOpen) setIsEditMenuOpen(false);
    if (isAddMenuOpen) setIsAddMenuOpen(false); 
    if (isViewMenuOpen) setIsViewMenuOpen(false);
  };

  const closeCanvasMenu = () => setIsCanvasMenuOpen(false);
  
  const fileMenuItems = useMemo<FileMenuItem[]>(() => {
    const saveDisabled = !activeTabId || activeTabUnsaved === false;
    
    const items: FileMenuItem[] = [
      { id: 'new-page-file', label: '新建页面文件...', onClick: onNewPageFile, disabled: projectSourceTypeForFileMenu === null },
      { id: 'save-page-file', label: '保存文件', onClick: onSavePageFile, disabled: saveDisabled, shortcut: 'Ctrl+S' },
      { id: 'sep-file-1', isSeparator: true, label: '', onClick: () => {} },
      { id: 'open-page', label: '导入页面...', onClick: onOpenPageFile },
      { id: 'download-page', label: '导出页面', onClick: onDownloadPage, disabled: !activeTabId },
    ];
    if (onImportProject) { 
        items.push({ id: 'sep-file-project', isSeparator: true, label: '', onClick: () => {} });
        items.push({ id: 'import-project', label: '导入项目...', onClick: onImportProject });
    }
    if (onExportProject) { 
      items.push({ id: 'export-project', label: '导出项目...', onClick: onExportProject, disabled: !onExportProject });
    }
    return items;
  }, [onDownloadPage, onOpenPageFile, onNewPageFile, onSavePageFile, onExportProject, onImportProject, projectSourceTypeForFileMenu, activeTabId, activeTabUnsaved]);

  const editMenuItems = useMemo<EditMenuItem[]>(() => [
    { id: 'undo', label: '撤销', onClick: onUndo, disabled: !canUndo, shortcut: 'Ctrl+Z' },
    { id: 'redo', label: '恢复', onClick: onRedo, disabled: !canRedo, shortcut: 'Ctrl+Y' },
    { id: 'sep1', isSeparator: true, label: '', onClick: () => {}, shortcut: '' },
    { id: 'cut', label: '剪切', onClick: onCut, disabled: selectedNodeIds.length === 0, shortcut: 'Ctrl+X' },
    { id: 'copy', label: '复制', onClick: onCopy, disabled: selectedNodeIds.length === 0, shortcut: 'Ctrl+C' },
    { id: 'paste', label: '粘贴', onClick: onPaste, disabled: !canPaste, shortcut: 'Ctrl+V' },
    { id: 'delete', label: '删除', onClick: onDelete, disabled: selectedNodeIds.length === 0 && !selectedConnectionId, shortcut: 'Del / Back' },
    { id: 'sep2', isSeparator: true, label: '', onClick: () => {}, shortcut: '' },
    { id: 'marquee-select', label: '框选', onClick: onMarqueeSelectStart, disabled: !activeTabId, shortcut: "按住 M 激活" }
  ], [selectedNodeIds, selectedConnectionId, canPaste, onCut, onCopy, onPaste, onDelete, onMarqueeSelectStart, canUndo, onUndo, canRedo, onRedo, activeTabId]);

  const addMenuItems = useMemo<AddMenuItem[]>(() => [
    { id: 'create-area', label: '创建区域', onClick: onStartDefiningArea, disabled: !activeTabId },
    { id: 'create-node-group-add-menu', label: '创建节点组', onClick: onStartCreateNodeGroup, disabled: selectedNodeIds.length === 0 },
    { id: 'add-custom-ai-node', label: '自定义 AI 节点', onClick: onOpenCreateCustomAiNodeModal, disabled: false }, 
    // "add-custom-data-node" item removed
  ], [activeTabId, onStartDefiningArea, onStartCreateNodeGroup, selectedNodeIds, onOpenCreateCustomAiNodeModal]);

  const viewMenuItems = useMemo<ViewMenuItem[]>(() => [ 
    { id: 'history', label: '历史操作', onClick: () => {}, hasSubmenu: true },
    { id: 'view-ai-tools', label: 'AI 工具', onClick: onOpenAiToolsViewer },
    { id: 'view-global-settings', label: '全局设置', onClick: onOpenGlobalSettingsModal }, 
  ], [onOpenAiToolsViewer, onOpenGlobalSettingsModal]); 

  const canvasMenuItems = useMemo<CanvasMenuItem[]>(() => [
    { 
      id: 'clear-node-highlights', 
      label: '清除节点高亮', 
      onClick: onClearAllNodeHighlights, 
      disabled: !activeTabId 
    },
    { 
      id: 'terminate-run', 
      label: '终止运行', 
      onClick: onTerminateWorkflow, 
      disabled: !isWorkflowRunning 
    },
    // Add other canvas-specific menu items here in the future
  ], [activeTabId, onClearAllNodeHighlights, isWorkflowRunning, onTerminateWorkflow]); 

  return (
    <div className={`h-8 ${vscodeDarkTheme.topBar.bg} flex items-center justify-between border-b ${vscodeDarkTheme.topBar.border} shrink-0`}>
      <div className="flex items-center h-full">
        <div className={`w-16 h-full flex items-center justify-center ${vscodeDarkTheme.sidebar.bg} border-r ${vscodeDarkTheme.topBar.border}`}> 
          <div className={`text-xl font-bold ${vscodeDarkTheme.topBar.logoText} select-none`}>AI</div>
        </div>
        
        <div className="flex items-center space-x-6 pl-6">
          {menuItemsText.map((item) => {
            if (item === '文件') {
              return (
                <div key={item} className="relative">
                  <button ref={fileMenuButtonRef} onClick={handleFileMenuToggle} className={`text-sm ${vscodeDarkTheme.topBar.menuItemText} hover:${vscodeDarkTheme.topBar.menuItemTextHover} transition-colors focus:outline-none select-none ${isFileMenuOpen ? vscodeDarkTheme.topBar.menuItemTextHover : ''}`} aria-haspopup="true" aria-expanded={isFileMenuOpen}>{item}</button>
                  <FileMenu isOpen={isFileMenuOpen} onClose={closeFileMenu} menuItems={fileMenuItems} triggerRef={fileMenuButtonRef}/>
                </div>
              );
            }
            if (item === '编辑') {
              return (
                <div key={item} className="relative"> 
                  <button ref={editMenuButtonRef} onClick={handleEditMenuToggle} className={`text-sm ${vscodeDarkTheme.topBar.menuItemText} hover:${vscodeDarkTheme.topBar.menuItemTextHover} transition-colors focus:outline-none select-none ${isEditMenuOpen ? vscodeDarkTheme.topBar.menuItemTextHover : ''}`} aria-haspopup="true" aria-expanded={isEditMenuOpen}>{item}</button>
                  <EditMenu isOpen={isEditMenuOpen} onClose={closeEditMenu} menuItems={editMenuItems} triggerRef={editMenuButtonRef}/>
                </div>
              );
            }
            if (item === '添加') { 
              return (
                <div key={item} className="relative">
                  <button ref={addMenuButtonRef} onClick={handleAddMenuToggle} className={`text-sm ${vscodeDarkTheme.topBar.menuItemText} hover:${vscodeDarkTheme.topBar.menuItemTextHover} transition-colors focus:outline-none select-none ${isAddMenuOpen ? vscodeDarkTheme.topBar.menuItemTextHover : ''}`} aria-haspopup="true" aria-expanded={isAddMenuOpen}>{item}</button>
                  <AddMenu isOpen={isAddMenuOpen} onClose={closeAddMenu} menuItems={addMenuItems} triggerRef={addMenuButtonRef}/>
                </div>
              );
            }
            if (item === '查看') { 
              return (
                <div key={item} className="relative">
                  <button ref={viewMenuButtonRef} onClick={handleViewMenuToggle} className={`text-sm ${vscodeDarkTheme.topBar.menuItemText} hover:${vscodeDarkTheme.topBar.menuItemTextHover} transition-colors focus:outline-none select-none ${isViewMenuOpen ? vscodeDarkTheme.topBar.menuItemTextHover : ''}`} aria-haspopup="true" aria-expanded={isViewMenuOpen}>{item}</button>
                  <ViewMenu isOpen={isViewMenuOpen} onClose={closeViewMenu} menuItems={viewMenuItems} triggerRef={viewMenuButtonRef} activeTabHistory={activeTabHistory} currentHistoryIndex={currentHistoryIndex} onRestoreHistoryEntry={onRestoreHistoryEntry}/>
                </div>
              );
            }
            if (item === '画布') { 
              return (
                <div key={item} className="relative">
                  <button ref={canvasMenuButtonRef} onClick={handleCanvasMenuToggle} className={`text-sm ${vscodeDarkTheme.topBar.menuItemText} hover:${vscodeDarkTheme.topBar.menuItemTextHover} transition-colors focus:outline-none select-none ${isCanvasMenuOpen ? vscodeDarkTheme.topBar.menuItemTextHover : ''}`} aria-haspopup="true" aria-expanded={isCanvasMenuOpen}>{item}</button>
                  <CanvasMenu isOpen={isCanvasMenuOpen} onClose={closeCanvasMenu} menuItems={canvasMenuItems} triggerRef={canvasMenuButtonRef}/>
                </div>
              );
            }
            return ( <button key={item} className={`text-sm ${vscodeDarkTheme.topBar.menuItemText} hover:${vscodeDarkTheme.topBar.menuItemTextHover} transition-colors select-none`}>{item}</button> );
          })}
        </div>
      </div>
      <div className="flex items-center space-x-3 pr-4"> 
        <button onClick={onRunWorkflow} className={`flex items-center ${vscodeDarkTheme.topBar.buttonDefaultBg} hover:${vscodeDarkTheme.topBar.buttonDefaultBgHover} ${vscodeDarkTheme.topBar.buttonDefaultText} text-sm px-3 py-1.5 rounded-md transition-colors select-none ${isWorkflowRunning || !activeTabId ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="运行工作流程" disabled={isWorkflowRunning || !activeTabId}>
          <PlayIcon className="w-4 h-3 mr-1.5" />运行
        </button>
      </div>
    </div>
  );
};
