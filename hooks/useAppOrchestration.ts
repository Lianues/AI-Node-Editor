

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SidebarItemId, Tab, Node, NodeExecutionState, NodeTypeDefinition, WorkflowServices, CanvasSnapshot, DefinedArea, SubWorkflowItem, NodeGroupItem, WorkflowState, NotificationMessage, NotificationType, ProgramInterfaceDisplayItem, RegisteredAiTool, EditableAiModelConfig, ModelConfigGroup } from '../types';
import { Connection, ConnectionPortIdentifier } from '../features/connections/types/connectionTypes';
import { getStaticNodeDefinition as getNodeDefUtil } from '../nodes';
import { ContextMenuItem, ContextMenuConfig } from '../components/ContextMenu/contextMenuTypes';
import { useClipboard } from '../features/clipboard/useClipboard';
import { WorkflowExecutionManager } from '../features/execution/WorkflowExecutionManager';
import { HistoryEntry, HistoryActionType } from '../features/history/historyTypes';
import {
  HistoryAccess,
  NodeManagerAccess,
  ConnectionManagerAccess,
  DefinedAreaManagerAccess,
  useAppCoreOrchestration, 
} from './useAppCoreOrchestration'; 
import { useWorkflowHistoryManager } from '../features/history/useWorkflowHistoryManager';
import { useWorkflowExecutionOrchestrator } from '../features/execution/hooks/useWorkflowExecutionOrchestrator';
import { useProjectFileManager } from '../features/projectFiles/hooks/useProjectFileManager';
import { useAppViewManager } from './useAppViewManager';
import { useAppUIManager } from './useAppUIManager';
import { useAppProjectFileOrchestration } from '../features/projectFiles/hooks/useAppProjectFileOrchestration';
import { useAppEditorFeaturesOrchestration } from './useAppEditorFeaturesOrchestration';
// import { useAppCoreOrchestration } from './useAppCoreOrchestration'; // Already imported above
import { useAppSubWorkflows, InterfaceUpdateResult } from '../features/subworkflows/hooks/useAppSubWorkflows'; 
import { useAppSubWorkflowOrchestration, generateInstancePortsAndMappings } from '../features/subworkflows/hooks/useAppSubWorkflowOrchestration';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../nodes/SubworkflowOutput/Definition';
import { SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY } from '../nodes/SubworkflowInstance/Definition';
import { useAppNodeGroups, NodeManagerAccessForNodeGroups } from '../features/nodeGroups/hooks/useAppNodeGroups';
import { calculateNodeHeight } from '../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../components/renderingConstants';
import { SubWorkflowInputOutputDefinition } from '../features/subworkflows/types/subWorkflowTypes';
import { useNotificationManager } from '../features/notifications/useNotificationManager';
import { useSaveCoordinator } from './useSaveCoordinator';
import { useWorkflowServicesInitializer } from './initializers/useWorkflowServicesInitializer';
import { exportProjectDataAsJson, ProjectExportData } from '../features/projectExportImport/projectExportService';


interface AppOrchestrationProps {
  contextMenuControls: {
    openContextMenu: (event: React.MouseEvent, items: ContextMenuItem[]) => void;
    closeContextMenu: () => void;
    menuConfig: ContextMenuConfig | null;
  };
  clipboardControls: ReturnType<typeof useClipboard>;
  baseWorkflowServices: Omit<WorkflowServices, 'getNodeDefinition' | 'getGraphDefinition' | 'subworkflowHost'>;
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined;
  getCanvasBoundingClientRect: () => DOMRect | null;
  isMKeyPressed: boolean;
  customTools: RegisteredAiTool[]; 
  setCustomTools: React.Dispatch<React.SetStateAction<RegisteredAiTool[]>>;
  customNodeDefinitions: NodeTypeDefinition[]; 
  setCustomNodeDefinitions: React.Dispatch<React.SetStateAction<NodeTypeDefinition[]>>;
  editableAiModelConfigs: EditableAiModelConfig[]; 
  setEditableAiModelConfigs: React.Dispatch<React.SetStateAction<EditableAiModelConfig[]>>; 
}

export const useAppOrchestration = ({
  contextMenuControls: originalContextMenuControlsFromApp,
  clipboardControls: clipboardControlsFromApp,
  baseWorkflowServices: baseWorkflowServicesFromApp,
  getNodeDefinition: getNodeDefinitionProp,
  getCanvasBoundingClientRect,
  isMKeyPressed,
  customTools, 
  setCustomTools, 
  customNodeDefinitions, 
  setCustomNodeDefinitions, 
  editableAiModelConfigs, 
  setEditableAiModelConfigs, 
}: AppOrchestrationProps) => {
  const [activeTabHistory, setActiveTabHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);

  const notificationManager = useNotificationManager();

  const appViewManager = useAppViewManager();
  const appUIManager = useAppUIManager();
  const appSubWorkflowsManager = useAppSubWorkflows();

  const finalEditorFeaturesOrchestrationInstanceRef = useRef<ReturnType<typeof useAppEditorFeaturesOrchestration> | null>(null);
  const appCoreOrchestrationRef = useRef<ReturnType<typeof useAppCoreOrchestration> | null>(null);
  const workflowExecutionOrchestratorRef = useRef<ReturnType<typeof useWorkflowExecutionOrchestrator> | null>(null);
  const projectFileManagerRef = useRef<ReturnType<typeof useProjectFileManager> | null>(null);
  const appProjectFileOrchestrationRef = useRef<ReturnType<typeof useAppProjectFileOrchestration> | null>(null);
  const realWorkflowHistoryManagerRef = useRef<ReturnType<typeof useWorkflowHistoryManager> | null>(null);
  const appSubWorkflowOrchestrationRef = useRef<ReturnType<typeof useAppSubWorkflowOrchestration> | null>(null);
  const appNodeGroupsHookRef = useRef<ReturnType<typeof useAppNodeGroups> | null>(null); 


  const getGraphDefinition = useCallback(async (workflowId: string): Promise<WorkflowState | null> => {
    if (appCoreOrchestrationRef.current) {
      return appCoreOrchestrationRef.current.getTabWorkflowStateById(workflowId) || null;
    }
    return null;
  }, []);

  const fullWorkflowServices = useWorkflowServicesInitializer({
    baseWorkflowServices: baseWorkflowServicesFromApp,
    getNodeDefinition: getNodeDefinitionProp,
    getGraphDefinition,
  });

  const mainExecutionManager = useMemo(() => new WorkflowExecutionManager(fullWorkflowServices), [fullWorkflowServices]);

  const historyAccess: HistoryAccess = useMemo(() => ({
    getActiveTabHistory: () => activeTabHistory,
    getCurrentHistoryIndex: () => currentHistoryIndex,
    setActiveTabHistory: setActiveTabHistory,
    setCurrentHistoryIndex: setCurrentHistoryIndex,
  }), [activeTabHistory, currentHistoryIndex]);

  const nodeManagerAccessForCore: NodeManagerAccess = useMemo(() => ({
    getNodes: () => finalEditorFeaturesOrchestrationInstanceRef.current?.nodes || [],
    getSelectedNodeId: () => finalEditorFeaturesOrchestrationInstanceRef.current?.primarySelectedNodeId || null,
    getSelectedNodeIds: () => finalEditorFeaturesOrchestrationInstanceRef.current?.selectedNodeIds || [],
    getNodeTypeToPlace: () => finalEditorFeaturesOrchestrationInstanceRef.current?.nodeTypeToPlace || null,
    setNodesDirectly: (nodes: Node[]) => finalEditorFeaturesOrchestrationInstanceRef.current?.setNodesDirectly(nodes),
    selectNode: (nodeId, shiftKey) => finalEditorFeaturesOrchestrationInstanceRef.current?.selectNode(nodeId, shiftKey),
    selectNodeTypeForPlacement: (typeKey) => finalEditorFeaturesOrchestrationInstanceRef.current?.selectNodeTypeForPlacement(typeKey),
    addNodesToSelection: (nodeIdsToAdd) => finalEditorFeaturesOrchestrationInstanceRef.current?.addNodesToSelection(nodeIdsToAdd),
    getLogicalInterfaces: () => finalEditorFeaturesOrchestrationInstanceRef.current?.getLogicalInterfaces() || [],
    setLogicalInterfacesDirectly: (interfaces) => finalEditorFeaturesOrchestrationInstanceRef.current?.setLogicalInterfacesDirectly(interfaces),
  }), []);

  const connectionManagerAccessForCore: ConnectionManagerAccess = useMemo(() => ({
    getConnections: () => finalEditorFeaturesOrchestrationInstanceRef.current?.connections || [],
    getSelectedConnectionId: () => finalEditorFeaturesOrchestrationInstanceRef.current?.selectedConnectionId || null,
    setConnectionsDirectly: (connections: Connection[]) => finalEditorFeaturesOrchestrationInstanceRef.current?.setConnectionsDirectly(connections),
    selectConnection: (connectionId, options) => finalEditorFeaturesOrchestrationInstanceRef.current?.selectConnection(connectionId, options),
  }), []);

  const definedAreaManagerAccessForCore: DefinedAreaManagerAccess = useMemo(() => ({
    getDefinedAreas: () => finalEditorFeaturesOrchestrationInstanceRef.current?.definedAreas || [],
    setDefinedAreasDirectly: (areas: DefinedArea[]) => finalEditorFeaturesOrchestrationInstanceRef.current?.setDefinedAreasDirectly(areas),
  }), []);

  const appCoreOrchestrationInstance = useAppCoreOrchestration({
    appViewManager,
    appUIManager,
    clipboardControls: clipboardControlsFromApp,
    historyAccess,
    nodeManagerAccess: nodeManagerAccessForCore,
    connectionManagerAccess: connectionManagerAccessForCore,
    definedAreaManagerAccess: definedAreaManagerAccessForCore,
    onTabWorkflowStateLoaded: (newActiveTabId, loadedNodeExecStates) => {
      if (workflowExecutionOrchestratorRef.current) {
        workflowExecutionOrchestratorRef.current.handleNodeStateChangeBulk?.(loadedNodeExecStates);
      }
    },
    defaultInitialPan: appViewManager.viewPropsForCanvas.externalPanForCanvas,
    defaultInitialScale: appViewManager.viewPropsForCanvas.externalScaleForCanvas,
  });
  appCoreOrchestrationRef.current = appCoreOrchestrationInstance;

  const getNodesForExecution = useCallback(() => finalEditorFeaturesOrchestrationInstanceRef.current?.nodes || [], []);
  const getConnectionsForExecution = useCallback(() => finalEditorFeaturesOrchestrationInstanceRef.current?.connections || [], []);

  const handleConnectionUpdateForWEO = useCallback((updatedConnection: Connection) => {
    if (finalEditorFeaturesOrchestrationInstanceRef.current?.updateConnectionProperties) {
        const { id, ...connectionDataNoId } = updatedConnection;
        finalEditorFeaturesOrchestrationInstanceRef.current.updateConnectionProperties(id, connectionDataNoId);
    }
  }, []); 


  const workflowExecutionOrchestratorInstance = useWorkflowExecutionOrchestrator({
    executionManager: mainExecutionManager,
    getNodes: getNodesForExecution,
    getConnections: getConnectionsForExecution,
    getNodeDefinition: getNodeDefinitionProp,
    updateNodeData: (nodeId, dataUpdates) => { 
      if (finalEditorFeaturesOrchestrationInstanceRef.current?.updateNodeData) {
        finalEditorFeaturesOrchestrationInstanceRef.current.updateNodeData(nodeId, dataUpdates);
      }
    },
    customTools: customTools, 
    onConnectionUpdateCallback: handleConnectionUpdateForWEO, 
  });
  workflowExecutionOrchestratorRef.current = workflowExecutionOrchestratorInstance;
  
  const triggerCustomNodeOutput = useCallback((nodeId: string, portId: string, data: any) => {
    if (!mainExecutionManager || !finalEditorFeaturesOrchestrationInstanceRef.current || !workflowExecutionOrchestratorRef.current) {
      console.error("triggerCustomNodeOutput: Core components not initialized.");
      return;
    }
    mainExecutionManager.triggerCustomNodeOutput(
      nodeId,
      portId,
      data,
      getNodesForExecution, // Pass getter
      getConnectionsForExecution, // Pass getter
      getNodeDefinitionProp,
      workflowExecutionOrchestratorRef.current.handleNodeStateChange,
      (id, updates) => finalEditorFeaturesOrchestrationInstanceRef.current?.updateNodeData(id, updates),
      customTools
    );
  }, [mainExecutionManager, getNodeDefinitionProp, customTools, getNodesForExecution, getConnectionsForExecution]);

  const handleTerminateWorkflow = useCallback(() => {
    if (workflowExecutionOrchestratorRef.current) {
      workflowExecutionOrchestratorRef.current.handleTerminateWorkflow();
    }
  }, []);


  const getCurrentCanvasSnapshot = useCallback((): CanvasSnapshot => {
    const currentFeatures = finalEditorFeaturesOrchestrationInstanceRef.current;
    if (!currentFeatures) {
        return { nodes: [], connections: [], definedAreas: [], logicalInterfaces: [], pan: {x:0,y:0}, scale: 1, selectedNodeIds: [], selectedConnectionId: null, nodeExecutionStates: [], nodeTypeToPlace: null};
    }
    const liveNodeExecStates = workflowExecutionOrchestratorRef.current?.getLiveNodeExecutionStates() || new Map();
    const executionStatesArray: Array<[string, NodeExecutionState]> = [];
    liveNodeExecStates.forEach((state, id) => {
        executionStatesArray.push([id, JSON.parse(JSON.stringify(state))]);
    });
    return {
      nodes: JSON.parse(JSON.stringify(currentFeatures.nodes || [])),
      connections: JSON.parse(JSON.stringify(currentFeatures.connections || [])),
      definedAreas: JSON.parse(JSON.stringify(currentFeatures.definedAreas || [])),
      logicalInterfaces: JSON.parse(JSON.stringify(currentFeatures.getLogicalInterfaces() || [])), 
      pan: { ...appViewManager.currentInteractivePan },
      scale: appViewManager.currentInteractiveScale,
      selectedNodeIds: [...(currentFeatures.selectedNodeIds || [])],
      selectedConnectionId: currentFeatures.selectedConnectionId || null,
      nodeExecutionStates: executionStatesArray,
      nodeTypeToPlace: currentFeatures.nodeTypeToPlace || null,
    };
  }, [appViewManager.currentInteractivePan, appViewManager.currentInteractiveScale]);

  const restoreHistoryEntryById = useCallback((entryId: string) => {
    const entryToRestoreIndex = activeTabHistory.findIndex(h => h.id === entryId);
    if (entryToRestoreIndex === -1) {
        return;
    }

    const entryToRestore = activeTabHistory[entryToRestoreIndex];
    const snapshot = entryToRestore.snapshot;

    const currentFeatures = finalEditorFeaturesOrchestrationInstanceRef.current;
    if (!currentFeatures) {
        return;
    }

    currentFeatures.setNodesDirectly?.(JSON.parse(JSON.stringify(snapshot.nodes)));
    currentFeatures.setConnectionsDirectly?.(JSON.parse(JSON.stringify(snapshot.connections)));
    currentFeatures.setDefinedAreasDirectly?.(JSON.parse(JSON.stringify(snapshot.definedAreas || [])));
    currentFeatures.setLogicalInterfacesDirectly?.(JSON.parse(JSON.stringify(snapshot.logicalInterfaces || []))); 

    appViewManager.viewAccessForTabsManager.setPan({ ...snapshot.pan });
    appViewManager.viewAccessForTabsManager.setScale(snapshot.scale);

    const restoredSelectedIds = snapshot.selectedNodeIds || [];
    currentFeatures.selectNode?.(null, false);
    restoredSelectedIds.forEach((id, index) => {
      currentFeatures.selectNode?.(id, index > 0);
    });

    currentFeatures.selectConnection?.(snapshot.selectedConnectionId);
    currentFeatures.clearSelectedDefinedArea?.();

    const restoredNodeExecutionStates = new Map<string, NodeExecutionState>();
    if (snapshot.nodeExecutionStates && Array.isArray(snapshot.nodeExecutionStates)) {
        snapshot.nodeExecutionStates.forEach(([id, state]) => {
            restoredNodeExecutionStates.set(id, JSON.parse(JSON.stringify(state)));
        });
        workflowExecutionOrchestratorRef.current?.handleNodeStateChangeBulk?.(restoredNodeExecutionStates);
    }

    currentFeatures.selectNodeTypeForPlacement?.(snapshot.nodeTypeToPlace);
    setCurrentHistoryIndex(entryToRestoreIndex);
    originalContextMenuControlsFromApp.closeContextMenu();
  }, [activeTabHistory, appViewManager.viewAccessForTabsManager, originalContextMenuControlsFromApp]);

  const realWorkflowHistoryManager = useWorkflowHistoryManager({
    activeTabHistory,
    currentHistoryIndex,
    setActiveTabHistory,
    setCurrentHistoryIndex,
    getCurrentCanvasSnapshot,
    nodes: finalEditorFeaturesOrchestrationInstanceRef.current?.nodes || [],
    restoreHistoryEntryById,
    closeContextMenu: originalContextMenuControlsFromApp.closeContextMenu,
    onMarkTabUnsaved: (tabId) => {
      if (appCoreOrchestrationRef.current && tabId) {
        appCoreOrchestrationRef.current.updateTab(tabId, { unsaved: true });
      }
    },
    activeTabId: appCoreOrchestrationInstance.activeTabId,
  });
  realWorkflowHistoryManagerRef.current = realWorkflowHistoryManager;
  
  const finalEditorFeaturesOrchestrationInstanceWithRealDeps = useAppEditorFeaturesOrchestration({
    workflowHistoryManager: realWorkflowHistoryManager,
    appViewManager,
    appUIManager,
    appCoreOrchestrationRef, 
    clipboardControls: clipboardControlsFromApp,
    originalContextMenuControls: originalContextMenuControlsFromApp,
    getCanvasBoundingClientRect,
    getNodeDefinitionProp,
    isMKeyPressed,
    activeTabId: appCoreOrchestrationInstance.activeTabId,
    executionManager: mainExecutionManager,
    workflowServices: fullWorkflowServices,
    onCreateNodeGroupFromContextMenu: (_event?: any, ids?: string[]) => appNodeGroupsHookRef.current?.handleCreateNodeGroup(_event, ids),
  });

  useEffect(() => {
    finalEditorFeaturesOrchestrationInstanceRef.current = finalEditorFeaturesOrchestrationInstanceWithRealDeps;
  }, [finalEditorFeaturesOrchestrationInstanceWithRealDeps]);

  const nodeManagerAccessForNodeGroups = useMemo<NodeManagerAccessForNodeGroups>(() => ({
    getNodes: () => finalEditorFeaturesOrchestrationInstanceRef.current?.nodes || [],
    getSelectedNodeIds: () => finalEditorFeaturesOrchestrationInstanceRef.current?.selectedNodeIds || [],
    addNode: (typeKey, position, existingNodeData, skipSelection) =>
      finalEditorFeaturesOrchestrationInstanceRef.current?.addNode(typeKey, position, existingNodeData, skipSelection) || null,
    selectNode: (id, shiftKey) => finalEditorFeaturesOrchestrationInstanceRef.current?.selectNode(id, shiftKey),
  }), []); 

  const appNodeGroupsHook = useAppNodeGroups({
    nodeManagerHook: nodeManagerAccessForNodeGroups,
    connectionManagerHookRef: finalEditorFeaturesOrchestrationInstanceRef.current ? {
        current: {
            connections: finalEditorFeaturesOrchestrationInstanceRef.current.connections,
            setConnectionsDirectly: finalEditorFeaturesOrchestrationInstanceRef.current.setConnectionsDirectly,
        }
    } : { current: null }, 
    workflowHistoryManager: realWorkflowHistoryManager,
    appUIManager,
    getNodeDefinitionProp,
    executionManager: mainExecutionManager,
    workflowServices: fullWorkflowServices,
    shouldCreateAreaOnGroupDrop: finalEditorFeaturesOrchestrationInstanceWithRealDeps.shouldCreateAreaOnGroupDrop, 
    addAreaAndCommit: finalEditorFeaturesOrchestrationInstanceWithRealDeps.addDefinedAreaDirectlyAndCommitHistory, 
  });
  appNodeGroupsHookRef.current = appNodeGroupsHook;


  const updateSubWorkflowInstances = useCallback((
    updatedSubWorkflowId: string,
    updatedInputs?: SubWorkflowInputOutputDefinition[],
    updatedOutputs?: SubWorkflowInputOutputDefinition[]
  ) => {
    let subWorkflowDefinitionToUse: SubWorkflowItem | undefined;
    if (updatedInputs && updatedOutputs) {
      const existingDef = appSubWorkflowsManager.subWorkflows.find(sw => sw.id === updatedSubWorkflowId);
      if (existingDef) {
        subWorkflowDefinitionToUse = { ...existingDef, inputs: updatedInputs, outputs: updatedOutputs };
      }
    } else {
      subWorkflowDefinitionToUse = appSubWorkflowsManager.subWorkflows.find(sw => sw.id === updatedSubWorkflowId);
    }

    if (!subWorkflowDefinitionToUse) {
      return;
    }

    const allTabs = appCoreOrchestrationRef.current?.tabs || [];
    let atLeastOneInstanceUpdated = false;
    const affectedInstanceNodeIdsAcrossAllTabs: string[] = [];

    allTabs.forEach(tab => {
      if (tab.type === 'workflow' || tab.type === 'subworkflow') {
        const currentTabState = appCoreOrchestrationRef.current?.getTabWorkflowStateById(tab.id);
        if (!currentTabState) return;

        let tabNodesModified = false;
        let tabConnectionsModified = false;

        let newTabNodes = [...currentTabState.nodes];
        let newTabConnections = [...currentTabState.connections];

        newTabNodes = newTabNodes.map(instanceNode => {
          if (instanceNode.type === SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY && instanceNode.data?.subWorkflowId === updatedSubWorkflowId) {
            if (!affectedInstanceNodeIdsAcrossAllTabs.includes(instanceNode.id)) {
                affectedInstanceNodeIdsAcrossAllTabs.push(instanceNode.id);
            }
            atLeastOneInstanceUpdated = true;
            tabNodesModified = true;

            const { instanceInputs, instanceOutputs, portMappings } = generateInstancePortsAndMappings(subWorkflowDefinitionToUse!, null);

            const oldPortIds = new Set([...instanceNode.inputs.map(p => p.id), ...instanceNode.outputs.map(p => p.id)]);
            const newPortIdsSet = new Set([...instanceInputs.map(p => p.id), ...instanceOutputs.map(p => p.id)]);

            const portsToDeleteConnectionsFor = Array.from(oldPortIds).filter(oldPId => !newPortIdsSet.has(oldPId));

            portsToDeleteConnectionsFor.forEach(portIdToDelete => {
              const originalLength = newTabConnections.length;
              newTabConnections = newTabConnections.filter(conn =>
                !(conn.source.nodeId === instanceNode.id && conn.source.portId === portIdToDelete) &&
                !(conn.target.nodeId === instanceNode.id && conn.target.portId === portIdToDelete)
              );
              if (newTabConnections.length < originalLength) {
                tabConnectionsModified = true;
              }
            });

            const newHeight = calculateNodeHeight(
              instanceInputs,
              instanceOutputs,
              HEADER_HEIGHT,
              instanceNode.customContentHeight,
              instanceNode.customContentTitle
            );

            return {
              ...instanceNode,
              inputs: instanceInputs,
              outputs: instanceOutputs,
              height: newHeight,
              data: { 
                ...instanceNode.data,
                subWorkflowName: subWorkflowDefinitionToUse!.name,
                portMappings,
              },
              title: subWorkflowDefinitionToUse!.name, 
            };
          }
          return instanceNode;
        });

        if (tabNodesModified || tabConnectionsModified) {
          const partialStateUpdate: Partial<WorkflowState> = {};
          if (tabNodesModified) partialStateUpdate.nodes = newTabNodes;
          if (tabConnectionsModified) partialStateUpdate.connections = newTabConnections;
          if (currentTabState.logicalInterfaces) {
            partialStateUpdate.logicalInterfaces = [...currentTabState.logicalInterfaces];
          }


          appCoreOrchestrationRef.current?.updateTabStateInternal(tab.id, partialStateUpdate);

          if (tab.id === appCoreOrchestrationRef.current?.activeTabId && finalEditorFeaturesOrchestrationInstanceRef.current) {
            if (tabNodesModified) finalEditorFeaturesOrchestrationInstanceRef.current.setNodesDirectly(newTabNodes);
            if (tabConnectionsModified) finalEditorFeaturesOrchestrationInstanceRef.current.setConnectionsDirectly(newTabConnections);
          }
        }
      }
    });

    if (atLeastOneInstanceUpdated && realWorkflowHistoryManagerRef.current) {
       realWorkflowHistoryManagerRef.current.commitHistoryAction(HistoryActionType.UPDATE_NODE_DATA, {
        nodeId: updatedSubWorkflowId,
        nodeTitle: subWorkflowDefinitionToUse!.name,
        propertyKey: `子程序接口更新 (影响 ${affectedInstanceNodeIdsAcrossAllTabs.length} 个实例)`,
        oldValue: '旧接口定义',
        newValue: '新接口定义',
        affectedInstanceNodeIds: affectedInstanceNodeIdsAcrossAllTabs,
      });
    }

    const subworkflowDefTab = allTabs.find(t => t.id === updatedSubWorkflowId);
    if (subworkflowDefTab && appSubWorkflowOrchestrationRef.current) {
        appSubWorkflowOrchestrationRef.current.handleMarkSubWorkflowTabUnsaved(subworkflowDefTab.id);
    }
  }, [
    appSubWorkflowsManager.subWorkflows,
  ]);


  const appSubWorkflowOrchestrationInstance = useAppSubWorkflowOrchestration({
    appSubWorkflowsManager,
    appCoreOrchestration: appCoreOrchestrationInstance,
    editorFeaturesOrchestration: finalEditorFeaturesOrchestrationInstanceWithRealDeps,
    workflowHistoryManager: realWorkflowHistoryManager,
    getNodeDefinitionProp,
    onSubWorkflowDefinitionChanged: updateSubWorkflowInstances,
  });
  appSubWorkflowOrchestrationRef.current = appSubWorkflowOrchestrationInstance;


  const projectFileManagerInstance = useProjectFileManager({
    onTabAdd: appCoreOrchestrationInstance.addTab,
    onTabUpdate: appCoreOrchestrationInstance.updateTab,
    getActiveTabId: () => appCoreOrchestrationInstance.activeTabId,
    getActiveTabTitle: () => appCoreOrchestrationInstance.tabs.find(t => t.id === appCoreOrchestrationInstance.activeTabId)?.title || null,
    getActiveTabFileHandle: appCoreOrchestrationInstance.getActiveTabFileHandle,
    getTabs: () => appCoreOrchestrationInstance.tabs,
    getCurrentCanvasSnapshot,
    defaultPan: appViewManager.viewPropsForCanvas.externalPanForCanvas,
    defaultScale: appViewManager.viewPropsForCanvas.externalScaleForCanvas,
  });
  projectFileManagerRef.current = projectFileManagerInstance;

  const appProjectFileOrchestrationInstance = useAppProjectFileOrchestration({
    projectFileManager: projectFileManagerInstance,
    tabsManager: appCoreOrchestrationInstance,
    getCurrentCanvasSnapshot,
    getLiveNodeExecutionStates: workflowExecutionOrchestratorInstance.getLiveNodeExecutionStates,
    setCustomNodeDefinitions,
    setCustomTools,
    setSubWorkflowDefinitions: appSubWorkflowsManager.setSubWorkflows, 
    setNodeGroupDefinitions: appNodeGroupsHook.setNodeGroups, 
    setShouldCreateAreaOnGroupDrop: finalEditorFeaturesOrchestrationInstanceWithRealDeps.setShouldCreateAreaOnGroupDrop, 
    addNotification: notificationManager.addNotification,
    editableAiModelConfigs: editableAiModelConfigs, 
    setEditableAiModelConfigs: setEditableAiModelConfigs, 
  });
  appProjectFileOrchestrationRef.current = appProjectFileOrchestrationInstance;

  const saveCoordinator = useSaveCoordinator({
    getActiveTabId: () => appCoreOrchestrationRef.current?.activeTabId || null,
    getActiveTab: () => {
        const activeId = appCoreOrchestrationRef.current?.activeTabId;
        return activeId ? appCoreOrchestrationRef.current?.tabs.find(t => t.id === activeId) || null : null;
    },
    handleSubWorkflowPostTabSave: (tabId: string) => appSubWorkflowOrchestrationRef.current?.handlePostTabSave(tabId),
    getLiveNodeExecutionStates: () => workflowExecutionOrchestratorRef.current?.getLiveNodeExecutionStates() || new Map(),
    persistCurrentlyActiveTabStateAsSaved: (liveStates: Map<string, NodeExecutionState>) => appCoreOrchestrationRef.current?.persistCurrentlyActiveTabStateAsSaved(liveStates),
    updateTabUnsavedState: (tabId: string, isUnsaved: boolean) => appCoreOrchestrationRef.current?.updateTab(tabId, { unsaved: isUnsaved }),
    performFileSave: () => appProjectFileOrchestrationRef.current?.handleSaveActivePageFile() || Promise.resolve(),
  });


  const handleSelectSidebarItem = useCallback((id: SidebarItemId) => {
    appUIManager.setActiveSidebarItemOptimized(currentActiveId => {
      let nextActiveId: SidebarItemId | null;
      if (id === SidebarItemId.NodeList || id === SidebarItemId.PropertyInspector || id === SidebarItemId.ProjectFiles || id === SidebarItemId.NodeGroupLibrary || id === SidebarItemId.SubWorkflowLibrary || id === SidebarItemId.ProgramInterface) { 
        nextActiveId = currentActiveId === id ? null : id;
      } else {
        nextActiveId = id;
      }
      const currentFeatures = finalEditorFeaturesOrchestrationInstanceRef.current;
      if (currentFeatures) {
        if (nextActiveId !== SidebarItemId.NodeList && currentFeatures.nodeTypeToPlace) {
          currentFeatures.selectNodeTypeForPlacement?.(null);
        }
        if (nextActiveId && currentFeatures.isDefiningAreaActive) {
          currentFeatures.appHandleEndDefiningArea?.(null);
        }
        if (nextActiveId && currentFeatures.isMarqueeSelectActiveForCanvas) {
          currentFeatures.setIsMarqueeSelectModeActiveInternal?.(false);
        }
        if (appNodeGroupsHookRef.current && nextActiveId !== SidebarItemId.NodeGroupLibrary && appNodeGroupsHookRef.current.isCreatingNodeGroup) {
          appNodeGroupsHookRef.current.handleCancelCreateNodeGroup?.();
        }
      }
      return nextActiveId;
    });
  }, [appUIManager]); 

  const selectedConnectionForInspector = useMemo(() => {
    const editor = finalEditorFeaturesOrchestrationInstanceRef.current;
    if (!editor?.selectedConnectionId) return null;
    return editor.connections.find(c => c.id === editor.selectedConnectionId) || null;
  }, [finalEditorFeaturesOrchestrationInstanceRef.current?.connections, finalEditorFeaturesOrchestrationInstanceRef.current?.selectedConnectionId]);

  const activeTabForInspector = useMemo(() => {
    const core = appCoreOrchestrationRef.current;
    if (!core?.activeTabId) return null;
    return core.tabs.find(t => t.id === core.activeTabId) || null;
  }, [appCoreOrchestrationRef.current?.tabs, appCoreOrchestrationRef.current?.activeTabId]);

  const selectedNodeExecutionState = useMemo(() => {
    const editor = finalEditorFeaturesOrchestrationInstanceRef.current;
    const execution = workflowExecutionOrchestratorRef.current;
    if (!editor?.primarySelectedNodeId || !execution) return null;
    return execution.nodeExecutionStates.get(editor.primarySelectedNodeId) || null;
  }, [finalEditorFeaturesOrchestrationInstanceRef.current?.primarySelectedNodeId, workflowExecutionOrchestratorRef.current?.nodeExecutionStates]);

  const activeTabUnsaved = useMemo(() => {
    const core = appCoreOrchestrationRef.current;
    if (!core?.activeTabId) return false;
    const currentActiveTab = core.tabs.find(t => t.id === core.activeTabId);
    return currentActiveTab?.unsaved ?? false;
  }, [appCoreOrchestrationRef.current?.tabs, appCoreOrchestrationRef.current?.activeTabId]);

  const activeTabHasFileHandle = useMemo(() => {
    return !!appCoreOrchestrationRef.current?.getActiveTabFileHandle();
  }, [appCoreOrchestrationRef.current?.getActiveTabFileHandle]);


  const appWrappedCloseTab = useCallback((tabIdToClose: string) => {
    appSubWorkflowOrchestrationRef.current?.handlePreTabClose(tabIdToClose);
    if(appCoreOrchestrationRef.current) {
      appCoreOrchestrationRef.current.closeTab(tabIdToClose);
    }
  }, []);
  
  const handleExportProject = useCallback(() => {
    if (!appCoreOrchestrationRef.current || !finalEditorFeaturesOrchestrationInstanceRef.current || !appNodeGroupsHookRef.current) {
      console.error("Orchestration components not fully initialized for export.");
      notificationManager.addNotification("项目导出失败：内部组件未就绪。", NotificationType.Error);
      return;
    }

    const allTabs = appCoreOrchestrationRef.current.tabs; 
    const tabStates: ProjectExportData['tabWorkflowStates'] = {};
    allTabs.forEach(tab => {
      const state = appCoreOrchestrationRef.current!.getTabWorkflowStateById(tab.id);
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
        shouldCreateAreaOnGroupDrop: finalEditorFeaturesOrchestrationInstanceRef.current?.shouldCreateAreaOnGroupDrop ?? false,
      },
      tabs: allTabs.map(({ fileHandle, ...restOfTab }) => restOfTab), 
      activeTabId: appCoreOrchestrationRef.current.activeTabId, 
      tabWorkflowStates: tabStates, 
      subWorkflowDefinitions: appSubWorkflowsManager.subWorkflows,
      nodeGroupDefinitions: appNodeGroupsHookRef.current?.nodeGroups ?? [],
      customAiNodeDefinitions: customNodeDefinitions, 
      customAiTools: customTools,                   
      editableAiModelConfigs: editableAiModelConfigs,
    };
    exportProjectDataAsJson(projectData, `ai_workflow_project_${new Date().toISOString().substring(0,10)}.json`);
    notificationManager.addNotification("项目已成功导出。", NotificationType.Success);
  }, [
    appCoreOrchestrationRef,
    finalEditorFeaturesOrchestrationInstanceRef,
    appSubWorkflowsManager.subWorkflows,
    appNodeGroupsHookRef, 
    customNodeDefinitions,
    customTools,
    editableAiModelConfigs,
    notificationManager,
  ]);


  return {
    ui: appUIManager,
    view: appViewManager,
    core: {
      ...appCoreOrchestrationInstance,
      clearAllTabsAndWorkflowStates: appCoreOrchestrationInstance.clearAllTabsAndWorkflowStates, 
      setAllTabWorkflowStates: appCoreOrchestrationInstance.setAllTabWorkflowStates,             
      activeTabHistory,
      currentHistoryIndex,
      canUndo: realWorkflowHistoryManager.canUndo,
      handleUndo: realWorkflowHistoryManager.handleUndo,
      canRedo: realWorkflowHistoryManager.canRedo,
      handleRedo: realWorkflowHistoryManager.handleRedo,
      commitHistoryAction: realWorkflowHistoryManager.commitHistoryAction,
      restoreHistoryEntry: restoreHistoryEntryById,
      selectedConnectionForInspector,
      activeTabForInspector,
      selectedNodeExecutionState,
      activeTabUnsaved,
      activeTabHasFileHandle,
      closeTab: appWrappedCloseTab,
    },
    notifications: notificationManager,
    editor: {
      ...finalEditorFeaturesOrchestrationInstanceWithRealDeps,
      getNodeDefinitionProp,
      canPaste: clipboardControlsFromApp.canPaste,
    },
    execution: {
      ...workflowExecutionOrchestratorInstance,
      handleTerminateWorkflow, // Added terminate handler
      triggerCustomNodeOutput, 
      handleClearAllNodeExecutionHighlights: workflowExecutionOrchestratorInstance.handleClearAllNodeExecutionHighlights, 
    },
    projectFilesManager: projectFileManagerInstance,
    projectFileActions: {
        ...appProjectFileOrchestrationInstance,
        handleExportProject, 
        handleImportProject: appProjectFileOrchestrationInstance.handleImportProject, 
    },
    saveCoordinator,
    subWorkflowsManager: { 
      ...appSubWorkflowsManager,
      reorderSubWorkflowItem: appSubWorkflowsManager.reorderSubWorkflowItem,
    },
    subWorkflowsOrchestration: appSubWorkflowOrchestrationInstance, 
    nodeGroups: { 
      ...(appNodeGroupsHookRef.current || {}), 
      reorderNodeGroupItem: appNodeGroupsHookRef.current?.reorderNodeGroupItem,
    },
    handleSelectSidebarItem,
    customNodeDefinitions, 
    customTools,           
    editableAiModelConfigs, 
  };
};
