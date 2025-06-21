
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { TabBar } from '../features/tabs/components/TabBar';
import { Canvas } from '../features/canvas/Canvas';
import { NodeListPanel } from '../components/NodeListPanel';
import { PropertyInspectorPanel } from '../components/PropertyInspectorPanel';
import { ProjectFilesPanel } from '../features/projectFiles/components/ProjectFilesPanel';
import { SidebarItemId, Node, NodeExecutionState, NodeTypeDefinition, PortDataType, CanvasSnapshot, FileSystemItem as AppFileSystemItem, DefinedArea, NodeGroupItem, SubWorkflowItem, NotificationType, ProgramInterfaceDisplayItem, RegisteredAiTool, ModelConfigGroup, EditableAiModelConfig } from '../types'; // Added ModelConfigGroup, EditableAiModelConfig
import { Tab } from '../features/tabs/types/tabTypes';
import { Connection, DraggingConnectionState, ConnectionPortIdentifier } from '../features/connections/types/connectionTypes';
import { UpstreamNodeVisualStateManager } from '../features/execution/engine/UpstreamNodeVisualStateManager';
import { PortDataCacheEntry, UpstreamSourceInfo } from '../features/execution/engine/PropagationEngine';
import { HistoryEntry } from '../features/history/historyTypes';
import { FileSystemItem } from '../features/projectFiles/types/fileSystemTypes';
import { ProjectFileClipboardItem } from '../features/projectFiles/types/projectFilesClipboardTypes';
import { ConfirmationModal } from '../features/projectFiles/components/ConfirmationModal';
import { MovedNodeInfo } from '../features/nodes/hooks/useNodeDraggingOnCanvas';
import { DefiningAreaScreenRect } from '../features/areaDefinition/types/areaDefinitionTypes';
import { NodeGroupLibraryPanel } from '../features/nodeGroups/components/NodeGroupLibraryPanel';
import { SubWorkflowLibraryPanel } from '../features/subworkflows/components/SubWorkflowLibraryPanel';
import { ProgramInterfacePanel } from '../features/programInterface/components/ProgramInterfacePanel';
import { useAppOrchestration } from '../hooks/useAppOrchestration';

interface MainLayoutProps {
  appOrchestration: ReturnType<typeof useAppOrchestration>;
  onWorldMouseMove: (coords: { x: number; y: number } | null) => void;
  canvasRefProp: React.RefObject<HTMLDivElement>;
  isMKeyPressed: boolean;
  onOpenAiToolsViewer: () => void;
  onOpenCreateCustomAiNodeModal: () => void; 
  customTools: RegisteredAiTool[]; 
  customNodeDefinitions: NodeTypeDefinition[]; 
  getCombinedNodeDefinition: (type: string) => NodeTypeDefinition | undefined; 
  onOpenCustomUiPreview: (html: string, height: number, nodeId: string, inputData?: Record<string, any>) => void; 
  onOpenGlobalSettingsModal: () => void; 
  mergedModelConfigs: Array<ModelConfigGroup | EditableAiModelConfig>; // New prop
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  appOrchestration,
  onWorldMouseMove,
  canvasRefProp,
  isMKeyPressed,
  onOpenAiToolsViewer,
  onOpenCreateCustomAiNodeModal, 
  customTools, 
  customNodeDefinitions, 
  getCombinedNodeDefinition,
  onOpenCustomUiPreview, 
  onOpenGlobalSettingsModal, 
  mergedModelConfigs, // Destructure new prop
}) => {
  const {
    ui,
    view,
    core,
    notifications,
    editor,
    execution,
    projectFilesManager,
    projectFileActions,
    saveCoordinator,
    subWorkflowsManager,
    subWorkflowsOrchestration,
    nodeGroups,
    handleSelectSidebarItem,
  } = appOrchestration;

  const showNodeListPanel = ui.activeSidebarItem === SidebarItemId.NodeList;
  const showProjectFilesPanel = ui.activeSidebarItem === SidebarItemId.ProjectFiles;
  const showNodeGroupLibraryPanel = ui.activeSidebarItem === SidebarItemId.NodeGroupLibrary;
  const showSubWorkflowLibraryPanel = ui.activeSidebarItem === SidebarItemId.SubWorkflowLibrary;
  const showProgramInterfacePanel = ui.activeSidebarItem === SidebarItemId.ProgramInterface;
  const showPropertyInspectorPanel = ui.activeSidebarItem === SidebarItemId.PropertyInspector;

  const handleUpdateProgramInterfaceName = (
    originalItem: ProgramInterfaceDisplayItem,
    newName: string
  ) => {
    if (editor.updateProgramInterfaceNameOnNodes) {
      editor.updateProgramInterfaceNameOnNodes(originalItem, newName);
    }
  };

  const handleUpdateProgramInterfaceDetails = (
    originalItem: ProgramInterfaceDisplayItem,
    updates: { dataType?: PortDataType; isPortRequired?: boolean }
  ) => {
    if (editor.updateProgramInterfaceDetailsOnNodes) {
      editor.updateProgramInterfaceDetailsOnNodes(originalItem, updates);
    }
  };


  return (
    <>
      <TopBar
        onAddNode={() => core.addTab()}
        onRunWorkflow={execution.handleRunWorkflow}
        onTerminateWorkflow={execution.handleTerminateWorkflow} // Added
        isWorkflowRunning={execution.isWorkflowRunning}
        selectedNodeIds={editor.selectedNodeIds}
        primarySelectedNodeId={editor.primarySelectedNodeId}
        selectedConnectionId={editor.selectedConnectionId}
        canPaste={editor.canPaste}
        onCut={() => editor.appHandleCutNode()}
        onCopy={() => editor.appHandleCopyNode()}
        onPaste={editor.appHandlePasteNode}
        onDelete={() => editor.appHandleDelete()}
        onMarqueeSelectStart={editor.appHandleStartMarqueeSelect}
        canUndo={core.canUndo}
        onUndo={core.handleUndo}
        canRedo={core.canRedo}
        onRedo={core.handleRedo}
        onStartCreateNodeGroup={nodeGroups.handleCreateNodeGroup}
        activeTabHistory={core.activeTabHistory}
        currentHistoryIndex={core.currentHistoryIndex}
        onRestoreHistoryEntry={core.restoreHistoryEntry}
        onDownloadPage={projectFileActions.handleDownloadActivePage}
        onOpenPageFile={projectFilesManager.appHandleOpenPageFileGlobal}
        onNewPageFile={projectFilesManager.appHandleNewPageFile}
        onSavePageFile={saveCoordinator.saveActivePage}
        onExportProject={projectFileActions.handleExportProject} 
        onImportProject={projectFileActions.handleImportProject} 
        projectSourceTypeForFileMenu={projectFilesManager.projectSourceType}
        activeTabId={core.activeTabId}
        activeTabUnsaved={core.activeTabUnsaved}
        activeTabHasFileHandle={core.activeTabHasFileHandle}
        onStartDefiningArea={editor.appHandleStartDefiningArea}
        onOpenAiToolsViewer={onOpenAiToolsViewer}
        onOpenCreateCustomAiNodeModal={onOpenCreateCustomAiNodeModal} 
        onOpenGlobalSettingsModal={onOpenGlobalSettingsModal}
        onClearAllNodeHighlights={execution.handleClearAllNodeExecutionHighlights} 
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeItemId={ui.activeSidebarItem} onSelectItem={handleSelectSidebarItem} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TabBar
            tabs={core.tabs}
            activeTabId={core.activeTabId!}
            onSelectTab={core.selectTab}
            onCloseTab={core.closeTab}
            onAddTab={() => core.addTab()}
            onCloseOtherTabs={core.closeOtherTabs}
            onCloseTabsToTheRight={core.closeTabsToTheRight}
            onCloseAllTabs={core.closeAllTabs}
            onTogglePinTab={core.togglePinTab}
          />
          <div className="flex flex-1 overflow-hidden">
            {showNodeListPanel && (
              <NodeListPanel
                onSelectNodeTypeForPlacement={editor.selectNodeTypeForPlacement}
                selectedNodeTypeForPlacement={editor.nodeTypeToPlace}
                customNodeDefinitions={customNodeDefinitions} 
                getCombinedNodeDefinition={getCombinedNodeDefinition} 
              />
            )}
            {showProjectFilesPanel && (
              <ProjectFilesPanel
                projectSourceType={projectFilesManager.projectSourceType}
                rootDirectoryHandle={projectFilesManager.projectRootDirectoryHandle}
                rootItems={projectFilesManager.projectRootItems}
                projectRootName={projectFilesManager.projectRootName}
                isLoading={projectFilesManager.isProjectLoading}
                error={projectFilesManager.projectError}
                selectedItemId={projectFilesManager.selectedProjectItemId}
                projectFilesClipboardItem={projectFilesManager.projectFilesClipboardItem}
                onSourceTypeSelect={projectFilesManager.handleProjectSourceTypeSelected}
                onClearSource={projectFilesManager.handleClearProjectSource}
                onToggleFolder={projectFilesManager.handleToggleProjectFolder}
                onSelectItem={(itemId, itemType, itemPath) => projectFilesManager.handleSelectProjectItem(itemId)}
                onOpenFile={projectFilesManager.appHandleOpenFileFromProject}
                onCutItem={projectFilesManager.handleCutItem}
                onCopyItem={projectFilesManager.handleCopyItem}
                onPasteItem={projectFilesManager.handlePasteItem}
                onRequestDeleteItem={projectFilesManager.requestDeleteItem}
                renamingItemInfo={projectFilesManager.renamingItemInfo}
                onStartRenameItem={projectFilesManager.startRenamingItem}
                onSubmitRenameItem={projectFilesManager.submitProjectItemRename}
                onCancelRenameItem={projectFilesManager.cancelProjectItemRename}
                onRequestNewItem={projectFilesManager.handleRequestNewItem}
                onValidateNewItemName={projectFilesManager.validateNewItemName}
              />
            )}
            {showNodeGroupLibraryPanel && (
              <NodeGroupLibraryPanel
                nodeGroups={nodeGroups.nodeGroups}
                onDragStartNodeGroup={nodeGroups.handleDragStartNodeGroupFromLibrary}
                isCreating={nodeGroups.isCreatingNodeGroup}
                pendingName={nodeGroups.pendingNodeGroupName}
                onPendingNameChange={nodeGroups.setPendingNodeGroupName}
                onSaveNodeGroup={nodeGroups.handleSaveNodeGroup}
                onCancelCreateNodeGroup={nodeGroups.handleCancelCreateNodeGroup}
                onUpdateNodeGroupDescription={nodeGroups.updateNodeGroupDescription}
                onUpdateNodeGroupName={nodeGroups.updateNodeGroupName}
                shouldCreateAreaOnGroupDrop={editor.shouldCreateAreaOnGroupDrop}
                onToggleShouldCreateAreaOnGroupDrop={editor.toggleShouldCreateAreaOnGroupDrop}
                onReorderNodeGroupItem={nodeGroups.reorderNodeGroupItem} 
              />
            )}
            {showSubWorkflowLibraryPanel && (
              <SubWorkflowLibraryPanel
                subWorkflows={subWorkflowsManager.subWorkflows}
                onDragStartSubWorkflow={subWorkflowsManager.handleDragStartSubWorkflow}
                onAddNewSubWorkflowTab={subWorkflowsOrchestration.handleAddNewSubWorkflowTab}
                onUpdateSubWorkflowName={subWorkflowsManager.updateSubWorkflowName}
                onUpdateSubWorkflowDescription={subWorkflowsManager.updateSubWorkflowDescription}
                onOpenSubWorkflowTabById={subWorkflowsOrchestration.handleOpenSubWorkflowTabById}
                onMarkSubWorkflowTabUnsaved={subWorkflowsOrchestration.handleMarkSubWorkflowTabUnsaved}
                onReorderSubWorkflowItem={subWorkflowsManager.reorderSubWorkflowItem}
              />
            )}
            {showProgramInterfacePanel && (
              <ProgramInterfacePanel
                nodes={editor.nodes}
                activeTab={core.activeTabForInspector}
                onUpdateInterfaceName={handleUpdateProgramInterfaceName}
                onUpdateProgramInterfaceDetails={handleUpdateProgramInterfaceDetails}
                onDeleteInterfaceItem={editor.appHandleDeleteProgramInterface}
                workflowHistoryManager={appOrchestration.core}
                logicalInterfaces={editor.logicalInterfaces}
                onAddLogicalInterface={editor.onAddLogicalInterface}
                onDeleteLogicalInterfaceFromPanel={editor.onDeleteLogicalInterfaceFromPanel}
                onReorderLogicalInterface={editor.reorderLogicalInterface} 
              />
            )}
            <Canvas
              key={core.activeTabId || 'no-active-tab'}
              nodes={editor.nodes}
              onNodeDrag={editor.updateNodePosition}
              onNodeDragEnd={editor.appHandleNodeMoveEnd}
              selectedNodeIds={editor.selectedNodeIds}
              onSelectNode={editor.selectNode}
              appHandleSelectNodesByMarquee={editor.appHandleSelectNodesByMarquee}
              getNodeDefinition={getCombinedNodeDefinition} 
              onNodeDrop={(nodeTypeKey, x, y, overrideData) => editor.addNodeOnDrop(nodeTypeKey, x, y, overrideData)}
              onNodeGroupDrop={nodeGroups.handleDropNodeGroupOntoCanvas}
              onSubWorkflowDrop={subWorkflowsOrchestration.handleDropSubWorkflowInstanceOnCanvas}
              nodeTypeToPlace={editor.nodeTypeToPlace}
              onBackgroundClick={editor.handleCanvasBackgroundClick}
              updateNodeData={editor.updateNodeData}
              nodeExecutionStates={execution.nodeExecutionStates}
              appHandleDragPerformed={editor.appHandleDragPerformed}
              draggingConnection={editor.draggingConnection}
              setDraggingConnection={editor.setDraggingConnection}
              connections={editor.connections}
              onCompleteConnection={editor.completeConnection}
              selectedConnectionId={editor.selectedConnectionId}
              onSelectConnection={editor.selectConnection}
              definedAreas={editor.definedAreas}
              selectedDefinedAreaId={editor.selectedDefinedArea?.id || null}
              onCanvasContextMenu={editor.handleCanvasContextMenu}
              onNodeContextMenu={editor.handleNodeContextMenu}
              onConnectionContextMenu={editor.handleConnectionContextMenu}
              onDefinedAreaContextMenu={editor.handleDefinedAreaContextMenu}
              canPaste={editor.canPaste}
              onCopyNode={(nodeId) => editor.appHandleCopyNode(nodeId)}
              onCutNode={(nodeId) => editor.appHandleCutNode(nodeId)}
              onPasteNode={editor.appHandlePasteNode}
              onDelete={editor.appHandleDelete}
              onShowProperties={editor.handleShowProperties}
              getUpstreamNodeVisualStateManager={execution.getUpstreamNodeVisualStateManager}
              getQueuedInputsForDownstreamPort={execution.getQueuedInputsForDownstreamPort}
              onWorldMouseMove={onWorldMouseMove}
              canvasRef={canvasRefProp}
              externalPan={view.viewPropsForCanvas.externalPanForCanvas}
              externalScale={view.viewPropsForCanvas.externalScaleForCanvas}
              onViewUpdate={view.viewPropsForCanvas.onCanvasViewUpdate}
              activeTabId={core.activeTabId}
              isMarqueeSelectModeActive={editor.isMarqueeSelectActiveForCanvas}
              setIsMarqueeSelectModeActive={editor.setIsMarqueeSelectModeActiveInternal}
              isMKeyPressed={isMKeyPressed}
              isDefiningAreaActive={editor.isDefiningAreaActive}
              appHandleEndDefiningArea={editor.appHandleEndDefiningArea}
              onOpenCustomUiPreview={onOpenCustomUiPreview} 
              mergedModelConfigs={mergedModelConfigs} // Pass mergedModelConfigs to Canvas
            />
            {showPropertyInspectorPanel && (
              <PropertyInspectorPanel
                node={editor.selectedNode}
                selectedNodeIds={editor.selectedNodeIds}
                nodeDefinition={editor.selectedNodeDefinition}
                selectedConnection={core.selectedConnectionForInspector}
                selectedDefinedArea={editor.selectedDefinedArea}
                activeTab={core.activeTabForInspector}
                updateNodeData={editor.updateNodeData}
                updateDefinedArea={editor.appHandleUpdateDefinedArea}
                selectedNodeExecutionState={core.selectedNodeExecutionState}
                onOpenSubWorkflowTabById={subWorkflowsOrchestration.handleOpenSubWorkflowTabById}
                addNotification={notifications.addNotification}
                customTools={customTools}
                mergedModelConfigs={mergedModelConfigs} 
              />
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={projectFilesManager.isDeleteModalOpen}
        title="确认删除"
        message={`确定要删除项目 "${projectFilesManager.itemToDelete?.name || '未知项目'}" 吗？此操作无法撤销。`}
        confirmButtonText="删除"
        onConfirm={projectFilesManager.confirmProjectItemDelete}
        onCancel={projectFilesManager.cancelDeleteItem}
        errorMessage={projectFilesManager.errorForModal}
      />
    </>
  );
};
