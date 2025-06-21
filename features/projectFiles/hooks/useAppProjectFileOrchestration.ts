

import { useCallback } from 'react';
import { CanvasSnapshot, NodeExecutionState, Tab, NodeTypeDefinition, RegisteredAiTool, SubWorkflowItem, NodeGroupItem, NotificationType, EditableAiModelConfig, WorkflowState } from '../../../types'; // Added types for import
import { ProjectExportData, exportProjectDataAsJson } from '../../projectExportImport/projectExportService'; // Import ProjectExportData
import { parseAndValidateProjectFile } from '../../projectExportImport/projectImportService'; // New import for parsing
import * as filesystemService from '../services/filesystemService';
import { useProjectFileManager } from './useProjectFileManager';
import { useWorkflowTabsManager } from '../../../hooks/useWorkflowTabsManager'; // Import WorkflowState directly from its source
import { downloadWorkflowAsJson } from '../../fileManagement/downloadUtils'; // Corrected import path
import { initialEditableConfigsForService as defaultInitialEditableConfigs } from '../../../components/Modals/GlobalSettingsModal/AiModelConfigSettings';
import { captureOpenFolderStatesRecursive, OpenFolderStateInfo } from './useProjectFileState'; // Added for Save As


interface UseAppProjectFileOrchestrationProps {
  projectFileManager: ReturnType<typeof useProjectFileManager>;
  tabsManager: ReturnType<typeof useWorkflowTabsManager>;
  getCurrentCanvasSnapshot: () => CanvasSnapshot;
  getLiveNodeExecutionStates: () => Map<string, NodeExecutionState>;
  // Setters for global state managed outside (typically in App.tsx)
  setCustomNodeDefinitions: React.Dispatch<React.SetStateAction<NodeTypeDefinition[]>>;
  setCustomTools: React.Dispatch<React.SetStateAction<RegisteredAiTool[]>>;
  setSubWorkflowDefinitions: React.Dispatch<React.SetStateAction<SubWorkflowItem[]>>;
  setNodeGroupDefinitions: React.Dispatch<React.SetStateAction<NodeGroupItem[]>>;
  setShouldCreateAreaOnGroupDrop: React.Dispatch<React.SetStateAction<boolean>>;
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  editableAiModelConfigs: EditableAiModelConfig[]; // Added: current global AI configs
  setEditableAiModelConfigs: React.Dispatch<React.SetStateAction<EditableAiModelConfig[]>>; // Added: setter for global AI configs
}

export const useAppProjectFileOrchestration = ({
  projectFileManager,
  tabsManager,
  getCurrentCanvasSnapshot,
  getLiveNodeExecutionStates,
  setCustomNodeDefinitions,
  setCustomTools,
  setSubWorkflowDefinitions,
  setNodeGroupDefinitions,
  setShouldCreateAreaOnGroupDrop,
  addNotification,
  editableAiModelConfigs, 
  setEditableAiModelConfigs, 
}: UseAppProjectFileOrchestrationProps) => {

  const handleDownloadActivePage = useCallback(() => {
    if (tabsManager.activeTabId === null) {
      addNotification("没有活动的页面可供下载。", NotificationType.Warning);
      return;
    }
    const snapshot = getCurrentCanvasSnapshot();
    const activeTab = tabsManager.tabs.find(t => t.id === tabsManager.activeTabId);

    let baseFilename = 'workflow';
    if (activeTab && activeTab.title && activeTab.title.trim() !== '') {
      baseFilename = activeTab.title.trim();
    }
    const sanitizedFilename = baseFilename.replace(/[\\/:*?"<>|]/g, '_');
    let finalBaseFilename = (sanitizedFilename && sanitizedFilename !== '.' && sanitizedFilename !== '..')
                              ? sanitizedFilename
                              : 'workflow';
    // Remove trailing dots which can cause issues on some OS
    while (finalBaseFilename.endsWith('.')) {
        finalBaseFilename = finalBaseFilename.slice(0, -1);
    }
    if (!finalBaseFilename || finalBaseFilename === '.' || finalBaseFilename === '..') { // Ensure a valid name if all were dots
        finalBaseFilename = 'workflow';
    }

    const filename = `${finalBaseFilename}.json`;
    downloadWorkflowAsJson(snapshot, filename);
  }, [getCurrentCanvasSnapshot, tabsManager.tabs, tabsManager.activeTabId, addNotification]);


  const handleSaveAsForActiveTab = useCallback(async () => {
    const activeTabId = tabsManager.activeTabId;
    if (!activeTabId) {
      addNotification("没有活动的页面可供另存为。", NotificationType.Warning);
      return;
    }
    const activeTab = tabsManager.tabs.find(t => t.id === activeTabId);
    if (!activeTab) {
      addNotification("活动的标签页未找到。", NotificationType.Error);
      return;
    }
  
    try {
      const suggestedName = activeTab.title ? `${activeTab.title}.json` : 'untitled_workflow.json';
      const newFileHandle = await window.showSaveFilePicker({
        types: [{ description: 'Workflow Files', accept: { 'application/json': ['.json'] } }],
        suggestedName,
      });
  
      const snapshot = getCurrentCanvasSnapshot();
      const jsonString = JSON.stringify(snapshot, null, 2);
      await filesystemService.saveLocalFile(newFileHandle, jsonString); 
  
      const newFileNameWithoutExt = newFileHandle.name.replace(/\.json$/i, '');
      tabsManager.updateTab(activeTabId, {
        fileHandle: newFileHandle,
        title: newFileNameWithoutExt,
        unsaved: false,
      });
      tabsManager.persistCurrentlyActiveTabStateAsSaved(getLiveNodeExecutionStates());
  
      addNotification(`页面 "${newFileNameWithoutExt}" 已另存为本地文件。`, NotificationType.Success);
  
      if (projectFileManager.projectRootDirectoryHandle) {
        const openStates = new Map<string, OpenFolderStateInfo>();
        captureOpenFolderStatesRecursive(projectFileManager.projectRootItems, openStates);
        await projectFileManager.projectLoadLocalData(projectFileManager.projectRootDirectoryHandle, openStates);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        addNotification("另存为操作已取消。", NotificationType.Info);
      } else {
        const errorMessage = err instanceof Error ? err.message : "另存为文件失败。";
        console.error("Error during save as:", err);
        addNotification(errorMessage, NotificationType.Error);
      }
    }
  }, [
    tabsManager, 
    getCurrentCanvasSnapshot, 
    getLiveNodeExecutionStates, 
    addNotification, 
    projectFileManager.projectRootDirectoryHandle, 
    projectFileManager.projectRootItems, 
    projectFileManager.projectLoadLocalData
  ]);


  const handleSaveActivePageFile = useCallback(async () => {
    const activeTabId = tabsManager.activeTabId;
    if (!activeTabId) {
      addNotification("没有活动的页面可供保存。", NotificationType.Warning);
      return;
    }
    const activeTab = tabsManager.tabs.find(t => t.id === activeTabId);
    if (!activeTab) {
      addNotification("活动的标签页未找到。", NotificationType.Error);
      return;
    }

    try {
      const snapshot = getCurrentCanvasSnapshot();
      const jsonString = JSON.stringify(snapshot, null, 2);
      const baseFilename = activeTab.title.trim() || 'Untitled';
      const filenameWithExt = baseFilename.toLowerCase().endsWith('.json') ? baseFilename : `${baseFilename}.json`;


      if (projectFileManager.projectSourceType === 'internal') {
        await filesystemService.ensureInternalFileEntryExists(filenameWithExt); // Ensure it exists if it's an "internal save"
        tabsManager.persistCurrentlyActiveTabStateAsSaved(getLiveNodeExecutionStates());
        tabsManager.updateTab(activeTabId, { unsaved: false });
        addNotification(`页面 "${activeTab.title}" 已保存到内部项目。`, NotificationType.Success);
      } else if (projectFileManager.projectSourceType === 'local') {
        const fileHandle = activeTab.fileHandle || tabsManager.getActiveTabFileHandle();
        if (fileHandle) {
          await filesystemService.saveLocalFile(fileHandle, jsonString);
          tabsManager.updateTab(activeTabId, { unsaved: false });
          tabsManager.persistCurrentlyActiveTabStateAsSaved(getLiveNodeExecutionStates());
          addNotification(`页面 "${activeTab.title}" 已保存到本地文件系统。`, NotificationType.Success);
        } else {
          // If it's a local project context but the tab has no fileHandle (e.g., new tab)
          // Mark as saved internally. User must use "Save As" for disk persistence.
          tabsManager.persistCurrentlyActiveTabStateAsSaved(getLiveNodeExecutionStates());
          tabsManager.updateTab(activeTabId, { unsaved: false });
          addNotification(`页面 "${activeTab.title}" 已在应用内标记为已保存。如需保存到本地文件，请使用“另存为”。`, NotificationType.Info);
        }
      } else { // projectSourceType is null
        // No longer download, just mark as saved internally and inform user.
        tabsManager.persistCurrentlyActiveTabStateAsSaved(getLiveNodeExecutionStates());
        tabsManager.updateTab(activeTabId, { unsaved: false });
        addNotification(`页面 "${activeTab.title}" 已在应用内标记为已保存。如需保存到本地文件，请使用“另存为”或“导出页面”。`, NotificationType.Info);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "保存文件失败。";
      console.error("Error saving page file:", err);
      addNotification(errorMessage, NotificationType.Error);
    }
  }, [
    tabsManager,
    projectFileManager.projectSourceType,
    getCurrentCanvasSnapshot,
    getLiveNodeExecutionStates,
    // handleDownloadActivePage, // Removed
    addNotification,
  ]);

  const handleExportProject = useCallback(() => {
    if (!tabsManager) { 
      console.error("Orchestration components not fully initialized for export.");
      addNotification("项目导出失败：内部组件未就绪。", NotificationType.Error);
      return;
    }

    const allTabs = tabsManager.tabs;
    const tabStates: ProjectExportData['tabWorkflowStates'] = {};
    allTabs.forEach(tab => {
      const state = tabsManager.getTabWorkflowStateById(tab.id);
      if (state) {
        tabStates[tab.id] = {
          ...state, 
          nodeExecutionStates: Array.from(state.nodeExecutionStates.entries()) 
        };
      }
    });

    const projectData: ProjectExportData = {
      version: "1.0.1", 
      exportedAt: new Date().toISOString(),
      projectSettings: {
        shouldCreateAreaOnGroupDrop: projectFileManager.projectRootItems.length > 0, 
      },
      tabs: allTabs.map(({ fileHandle, ...restOfTab }) => restOfTab),
      activeTabId: tabsManager.activeTabId,
      tabWorkflowStates: tabStates,
      subWorkflowDefinitions: projectFileManager.projectRootItems.filter(item => item.type === 'folder' && item.name === 'SubWorkflows (placeholder)') as any[], 
      nodeGroupDefinitions: projectFileManager.projectRootItems.filter(item => item.type === 'folder' && item.name === 'NodeGroups (placeholder)') as any[], 
      customAiNodeDefinitions: [], 
      customAiTools: [], 
      editableAiModelConfigs: editableAiModelConfigs, 
    };
    exportProjectDataAsJson(projectData, `ai_workflow_project_${new Date().toISOString().substring(0,10)}.json`);
    addNotification("项目已成功导出。", NotificationType.Success);
  }, [
    tabsManager, 
    projectFileManager.projectRootItems, 
    editableAiModelConfigs, 
    addNotification,
  ]);

  const handleImportProject = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const fileContent = await file.text();
        const importedData = await parseAndValidateProjectFile(fileContent);

        projectFileManager.handleClearProjectSource(); 
        tabsManager.clearAllTabsAndWorkflowStates(); 

        setCustomNodeDefinitions(importedData.customAiNodeDefinitions || []);
        setCustomTools(importedData.customAiTools || []);
        setEditableAiModelConfigs(importedData.editableAiModelConfigs || defaultInitialEditableConfigs); 

        setSubWorkflowDefinitions(importedData.subWorkflowDefinitions || []);
        setNodeGroupDefinitions(importedData.nodeGroupDefinitions || []);

        setShouldCreateAreaOnGroupDrop(importedData.projectSettings?.shouldCreateAreaOnGroupDrop ?? false);
        
        importedData.tabs.forEach(tabData => {
            const newTab = tabsManager.addTab({ 
                id: tabData.id, 
                title: tabData.title, 
                type: tabData.type,
             });
             if (newTab) {
                if (tabData.unsaved) {
                    tabsManager.updateTab(newTab.id, { unsaved: true });
                }
                if (tabData.isPinned) { 
                    tabsManager.updateTab(newTab.id, { isPinned: true });
                }
             }
        });

        tabsManager.setAllTabWorkflowStates(importedData.tabWorkflowStates);

        if (importedData.activeTabId && importedData.tabs.some(t => t.id === importedData.activeTabId)) {
            tabsManager.selectTab(importedData.activeTabId);
        } else if (importedData.tabs.length > 0) {
            tabsManager.selectTab(importedData.tabs[0].id);
        } else {
           tabsManager.selectTab(null); 
        }

        addNotification("项目已成功导入。", NotificationType.Success);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "导入项目失败。";
        console.error("Error importing project:", error);
        addNotification(`项目导入失败: ${errorMessage}`, NotificationType.Error);
      }
    };
    input.click();
  }, [
    projectFileManager, 
    tabsManager, 
    setCustomNodeDefinitions, 
    setCustomTools, 
    setEditableAiModelConfigs,
    setSubWorkflowDefinitions,
    setNodeGroupDefinitions,
    setShouldCreateAreaOnGroupDrop,
    addNotification,
  ]);


  return {
    handleDownloadActivePage,
    handleSaveActivePageFile,
    handleSaveAsForActiveTab, // Expose Save As for explicit use
    handleImportProject, 
    handleExportProject, // Ensure export is returned
  };
};
