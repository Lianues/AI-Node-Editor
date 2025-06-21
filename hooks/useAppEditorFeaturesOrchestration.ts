
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SidebarItemId, Node as AppNode, NodeTypeDefinition, DefinedArea, CanvasSnapshot, WorkflowServices, ProgramInterfaceDisplayItem, PortDataType, NodePort } from '../types'; 
import { Connection, ConnectionPortIdentifier } from '../features/connections/types/connectionTypes'; 
import { SelectConnectionOptions as CoreSelectConnectionOptions } from '../features/connections/hooks/useConnectionManager'; // Corrected import path
import { ContextMenuItem, ContextMenuConfig } from '../components/ContextMenu/contextMenuTypes';
import { useClipboard } from '../features/clipboard/useClipboard';
import { HistoryActionType, HistoryEntryNodeActionTarget } from '../features/history/historyTypes';
import { WorkflowHistoryManagerOutput } from '../features/history/useWorkflowHistoryManager';
import { useWorkflowContextMenuOrchestrator } from '../features/contextMenu/hooks/useWorkflowContextMenuOrchestrator';
import { AppViewManagerOutput } from './useAppViewManager';
import { AppUIManagerOutput } from './useAppUIManager';
import { MovedNodeInfo } from '../features/nodes/hooks/useNodeDraggingOnCanvas';
import { DefiningAreaScreenRect } from '../features/areaDefinition/types/areaDefinitionTypes';
import { useAppDefinedAreaOrchestration, AppDefinedAreaOrchestrationOutput } from '../features/areaDefinition/hooks/useAppDefinedAreaOrchestration';
import { useAppMarqueeOrchestration, AppMarqueeOrchestrationOutput } from '../features/marquee/hooks/useAppMarqueeOrchestration';
import { NodeManagerAccess as CoreNodeManagerAccess, ConnectionManagerAccess as CoreConnectionManagerAccess, useAppCoreOrchestration } from './useAppCoreOrchestration'; 
import { useWorkflowActionHandlers } from '../features/workflowActions/useWorkflowActionHandlers';
import { WorkflowExecutionManager } from '../features/execution/WorkflowExecutionManager';
import {
  useFeatureHooksInitializer,
  NodeManagerInitializerCallbacks,
  ConnectionManagerInitializerCallbacks,
  FeatureHooksInstances,
} from './initializers/useFeatureHooksInitializer';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../nodes/SubworkflowOutput/Definition';
import { calculateNodeHeight } from '../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../components/renderingConstants';
import { SelectConnectionOptions } from '../features/connections/hooks/useConnectionManager'; 

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined); 
  useEffect(() => {
    ref.current = value;
  }); 
  return ref.current;
}

const getPortDisplayNameForOrchestration = (node: AppNode, defaultPrefix: string): string => {
  return node.data?.portName?.trim() || node.title || `${defaultPrefix} 未命名`;
};

export interface AppEditorFeaturesOrchestrationProps {
  workflowHistoryManager: WorkflowHistoryManagerOutput;
  appViewManager: AppViewManagerOutput;
  appUIManager: AppUIManagerOutput;
  appCoreOrchestrationRef: React.RefObject<ReturnType<typeof useAppCoreOrchestration>>; 
  clipboardControls: ReturnType<typeof useClipboard>;
  originalContextMenuControls: {
    openContextMenu: (event: React.MouseEvent, items: ContextMenuItem[]) => void;
    closeContextMenu: () => void;
    menuConfig: ContextMenuConfig | null;
  };
  getCanvasBoundingClientRect: () => DOMRect | null;
  getNodeDefinitionProp: (type: string) => NodeTypeDefinition | undefined;
  isMKeyPressed: boolean;
  activeTabId: string | null;
  executionManager: WorkflowExecutionManager;
  workflowServices: WorkflowServices;
  onCreateNodeGroupFromContextMenu?: (_event?: any, effectiveSelectedIdsOverride?: string[]) => void; 
}

export const useAppEditorFeaturesOrchestration = ({
  workflowHistoryManager,
  appViewManager,
  appUIManager,
  appCoreOrchestrationRef,
  clipboardControls,
  originalContextMenuControls,
  getCanvasBoundingClientRect,
  getNodeDefinitionProp,
  isMKeyPressed,
  activeTabId,
  executionManager,
  workflowServices,
  onCreateNodeGroupFromContextMenu, 
}: AppEditorFeaturesOrchestrationProps) => {
  const didDragJustOccurRef = useRef<boolean>(false);
  const commitNodeDataUpdateToHistoryRef = useRef<((nodeId: string, nodeTitle: string, propertyKey: string, oldValue: any, newValue: any) => void | undefined) | undefined>(undefined);

  const [shouldCreateAreaOnGroupDrop, setShouldCreateAreaOnGroupDrop] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('workflowEditor_shouldCreateAreaOnGroupDrop');
    return storedValue ? JSON.parse(storedValue) : false;
  });

  const toggleShouldCreateAreaOnGroupDrop = useCallback(() => {
    setShouldCreateAreaOnGroupDrop(prev => {
      const newValue = !prev;
      localStorage.setItem('workflowEditor_shouldCreateAreaOnGroupDrop', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  const appDefinedAreaOrchestrationRef = useRef<AppDefinedAreaOrchestrationOutput | null>(null);
  const appMarqueeOrchestrationRef = useRef<AppMarqueeOrchestrationOutput | null>(null);
  
  const [logicalInterfaces, setLogicalInterfacesInternal] = useState<ProgramInterfaceDisplayItem[]>([]);

  const getLogicalInterfacesForAccess = useCallback(() => logicalInterfaces, [logicalInterfaces]);
  const setLogicalInterfacesDirectlyForAccess = useCallback((interfaces: ProgramInterfaceDisplayItem[]) => {
    setLogicalInterfacesInternal(interfaces);
  }, []);

  const onNodeSelectedCallback = useCallback((primaryNodeId: string | null, nodeTypeToPlaceCleared: boolean) => {
    if (primaryNodeId || nodeTypeToPlaceCleared) {
      featureHooks.connectionManager?.selectConnection(null);
      appDefinedAreaOrchestrationRef.current?.clearSelectedDefinedArea();
      appMarqueeOrchestrationRef.current?.setIsMarqueeSelectModeActiveInternal(false);
    }
    if (primaryNodeId && appDefinedAreaOrchestrationRef.current?.isDefiningAreaActive) {
      appDefinedAreaOrchestrationRef.current?.appHandleEndDefiningArea(null);
    }
  }, []); 

  const onBeforeNodeDeletedCallback = useCallback((nodeId: string) => {
    featureHooks.connectionManager?.deleteConnectionsForNode(nodeId);
  }, []); 

  const onNodeTypeToPlaceChangedCallback = useCallback((typeKey: string | null) => {
    if (typeKey) {
      featureHooks.connectionManager?.selectConnection(null);
      appDefinedAreaOrchestrationRef.current?.clearSelectedDefinedArea();
      appMarqueeOrchestrationRef.current?.setIsMarqueeSelectModeActiveInternal(false);
      if (appDefinedAreaOrchestrationRef.current?.isDefiningAreaActive) {
        appDefinedAreaOrchestrationRef.current?.appHandleEndDefiningArea(null);
      }
    }
  }, []); 

  const onNodeDataUpdatedCallback = useCallback((nodeId: string, nodeTitle: string, propertyKey: string, oldValue: any, newValue: any) => {
    const callback = commitNodeDataUpdateToHistoryRef.current;
    if (callback) {
      callback(nodeId, nodeTitle, propertyKey, oldValue, newValue);
    }
  }, []);

  const onDeselectConnectionsCallback = useCallback(() => {
    featureHooks.connectionManager?.selectConnection(null);
  }, []); 

  const onConnectionSelectedCallback = useCallback((connectionId: string | null) => {
    if (connectionId) {
      featureHooks.nodeManager?.selectNode(null, false);
      featureHooks.nodeManager?.selectNodeTypeForPlacement(null);
      appDefinedAreaOrchestrationRef.current?.clearSelectedDefinedArea();
      appMarqueeOrchestrationRef.current?.setIsMarqueeSelectModeActiveInternal(false);
    }
  }, []); 

  const nodeManagerCallbacks: NodeManagerInitializerCallbacks = useMemo(() => ({
    onNodeSelected: onNodeSelectedCallback,
    onBeforeNodeDeleted: onBeforeNodeDeletedCallback,
    onNodeTypeToPlaceChanged: onNodeTypeToPlaceChangedCallback,
    onNodeDataUpdated: onNodeDataUpdatedCallback,
    onDeselectConnections: onDeselectConnectionsCallback,
  }), [
    onNodeSelectedCallback, onBeforeNodeDeletedCallback, onNodeTypeToPlaceChangedCallback,
    onNodeDataUpdatedCallback, onDeselectConnectionsCallback
  ]);

  const connectionManagerCallbacks: ConnectionManagerInitializerCallbacks = useMemo(() => ({
    onConnectionSelected: onConnectionSelectedCallback,
  }), [onConnectionSelectedCallback]);

  const featureHooks = useFeatureHooksInitializer({
    nodeManagerCallbacks,
    connectionManagerCallbacks,
    getNodeDefinition: getNodeDefinitionProp, 
  });

  const combinedNodeManagerAccessForSubHooks: CoreNodeManagerAccess = useMemo(() => ({
      ...(featureHooks.nodeManager),
      getLogicalInterfaces: getLogicalInterfacesForAccess,
      setLogicalInterfacesDirectly: setLogicalInterfacesDirectlyForAccess,
  }), [featureHooks.nodeManager, getLogicalInterfacesForAccess, setLogicalInterfacesDirectlyForAccess]);

  useEffect(() => {
  }, [
      onNodeSelectedCallback, onBeforeNodeDeletedCallback, onNodeTypeToPlaceChangedCallback,
      onDeselectConnectionsCallback, onConnectionSelectedCallback, featureHooks
  ]);

  const appDefinedAreaOrchestration = useAppDefinedAreaOrchestration({
    definedAreaManagerHook: featureHooks.definedAreaManager,
    workflowHistoryManager,
    nodeManagerAccess: combinedNodeManagerAccessForSubHooks, 
    connectionManagerAccess: featureHooks.connectionManager,
    appViewManager,
    appUIManager,
    getCanvasBoundingClientRect,
    activeTabId,
  });
  appDefinedAreaOrchestrationRef.current = appDefinedAreaOrchestration;

  const appMarqueeOrchestration = useAppMarqueeOrchestration({
    nodeManagerAccess: combinedNodeManagerAccessForSubHooks, 
    workflowHistoryManager,
    isMKeyPressed,
    isDefiningAreaActive: appDefinedAreaOrchestration.isDefiningAreaActive,
    deactivateDefiningAreaMode: () => appDefinedAreaOrchestration.appHandleEndDefiningArea(null),
    deactivateNodeTypeToPlaceMode: () => featureHooks.nodeManager.selectNodeTypeForPlacement(null),
    deselectConnectionMode: () => featureHooks.connectionManager.selectConnection(null),
    deselectDefinedAreaMode: () => appDefinedAreaOrchestration.clearSelectedDefinedArea(),
  });
  appMarqueeOrchestrationRef.current = appMarqueeOrchestration;

  const wrappedSelectNode = useCallback((nodeId: string | null, shiftKey: boolean = false) => {
    let wasDrag = didDragJustOccurRef.current;
    const shouldReturnEarlyDueToDrag = wasDrag && nodeId === null;

    if (shouldReturnEarlyDueToDrag) {
        didDragJustOccurRef.current = false;
        return;
    }
    featureHooks.nodeManager.selectNode(nodeId, shiftKey);
    if (nodeId) { 
        appDefinedAreaOrchestration.clearSelectedDefinedArea();
        appMarqueeOrchestration.setIsMarqueeSelectModeActiveInternal(false); 
    }
  }, [featureHooks.nodeManager, appDefinedAreaOrchestration, appMarqueeOrchestration]);

  useEffect(() => {
    commitNodeDataUpdateToHistoryRef.current = (nodeId, nodeTitle, propertyKey, oldValue, newValue) => {
      workflowHistoryManager.commitHistoryAction(HistoryActionType.UPDATE_NODE_DATA, {
        nodeId, nodeTitle, propertyKey, oldValue, newValue
      });
    };
  }, [workflowHistoryManager]);

  const actionHandlers = useWorkflowActionHandlers({
    nodeManager: featureHooks.nodeManager,
    connectionManager: featureHooks.connectionManager,
    clipboardControls,
    workflowHistoryManager,
    pan: appViewManager.currentInteractivePan,
    scale: appViewManager.currentInteractiveScale,
    getCanvasBoundingClientRect,
    getNodeDefinition: getNodeDefinitionProp,
    activeTabId,
  });

  const handleShowProperties = useCallback((
    itemType: 'node' | 'connection' | 'canvas' | 'defined-area',
    itemId?: string
  ) => {
    appUIManager.setActiveSidebarItemOptimized(SidebarItemId.PropertyInspector);

    if (itemType === 'node' && itemId) {
      wrappedSelectNode(itemId, false);
    } else if (itemType === 'connection' && itemId) {
      featureHooks.connectionManager.selectConnection(itemId, { isContextMenu: true }); 
      if (featureHooks.nodeManager.primarySelectedNodeId) wrappedSelectNode(null, false);
      appDefinedAreaOrchestration.clearSelectedDefinedArea();
      appMarqueeOrchestration.setIsMarqueeSelectModeActiveInternal(false); 
    } else if (itemType === 'canvas') {
      wrappedSelectNode(null, false);
      featureHooks.connectionManager.selectConnection(null);
      appDefinedAreaOrchestration.clearSelectedDefinedArea();
      appMarqueeOrchestration.setIsMarqueeSelectModeActiveInternal(false); 
    } else if (itemType === 'defined-area' && itemId) {
      appDefinedAreaOrchestration.handleShowPropertiesForDefinedArea(itemId);
      appMarqueeOrchestration.setIsMarqueeSelectModeActiveInternal(false); 
    }
  }, [
    wrappedSelectNode, featureHooks.connectionManager, featureHooks.nodeManager, appUIManager,
    appDefinedAreaOrchestration, appMarqueeOrchestration
  ]);

  const contextMenuOrchestrator = useWorkflowContextMenuOrchestrator({
    openContextMenu: originalContextMenuControls.openContextMenu,
    canPaste: clipboardControls.canPaste,
    onCopyNode: actionHandlers.appHandleCopyNode,
    onCutNode: actionHandlers.appHandleCutNode,
    onPasteNode: actionHandlers.appHandlePasteNode,
    onDelete: actionHandlers.appHandleDelete,
    onShowProperties: handleShowProperties,
    onSelectNode: wrappedSelectNode,
    onSelectConnection: (id: string | null, options?: CoreSelectConnectionOptions) => featureHooks.connectionManager.selectConnection(id, options),
    getCanvasBoundingClientRect,
    pan: appViewManager.currentInteractivePan,
    scale: appViewManager.currentInteractiveScale,
    activeTabId,
    selectedNodeIds: featureHooks.nodeManager.selectedNodeIds,
    onDeleteDefinedArea: appDefinedAreaOrchestration.appHandleDeleteDefinedArea,
    onCreateAreaFromSelection: appDefinedAreaOrchestration.appHandleCreateAreaFromSelectedNodes,
    onStartDefiningArea: appDefinedAreaOrchestration.appHandleStartDefiningArea,
    onCreateNodeGroup: onCreateNodeGroupFromContextMenu, 
  });

  const handleCanvasBackgroundClick = useCallback((worldX: number, worldY: number, shiftKey?: boolean) => {
    if (shiftKey) return; 

    featureHooks.connectionManager.selectConnection(null);
    appDefinedAreaOrchestration.clearSelectedDefinedArea();
    appMarqueeOrchestration.setIsMarqueeSelectModeActiveInternal(false); 

    if (featureHooks.nodeManager.nodeTypeToPlace) {
      actionHandlers.appOrchestrationAddNodeAtPosition(worldX, worldY);
    } else {
      wrappedSelectNode(null, false);
    }
    if (appDefinedAreaOrchestration.isDefiningAreaActive) {
      appDefinedAreaOrchestration.appHandleEndDefiningArea(null); 
    }
  }, [
    featureHooks.nodeManager, featureHooks.connectionManager, appDefinedAreaOrchestration,
    appMarqueeOrchestration, actionHandlers, wrappedSelectNode
  ]);

  const appHandleDragPerformed = useCallback(() => {
    didDragJustOccurRef.current = true;
    setTimeout(() => {
      didDragJustOccurRef.current = false;
    }, 0);
  }, []);

  const updateProgramInterfaceNameOnNodes = useCallback((
    originalItem: ProgramInterfaceDisplayItem,
    newName: string
  ) => {
    if (originalItem.isLogical) {
      setLogicalInterfacesInternal(prev => {
        const updated = prev.map(li =>
          li.id === originalItem.id ? { ...li, name: newName, originalDataType: li.dataType } : li 
        );
        workflowHistoryManager.commitHistoryAction(HistoryActionType.UPDATE_SUBWORKFLOW_INTERFACE_NAME, {
          interfaceType: originalItem.nodeType,
          oldName: originalItem.name,
          newName: newName,
          dataType: originalItem.dataType,
          affectedNodeIds: [originalItem.id], 
        });
        return updated;
      });
    } else {
      actionHandlers.appOrchestrationUpdateProgramInterfaceName(originalItem, newName);
    }
  }, [actionHandlers, workflowHistoryManager]);

  const updateProgramInterfaceDetailsOnNodes = useCallback(( 
    originalItem: ProgramInterfaceDisplayItem,
    updates: { dataType?: PortDataType; isPortRequired?: boolean }
  ) => {
    if (originalItem.isLogical) {
      const oldDataType = originalItem.dataType;
      const oldIsRequired = originalItem.isRequired;
      
      setLogicalInterfacesInternal(prev => {
        const updated = prev.map(li =>
          li.id === originalItem.id
            ? {
                ...li,
                name: li.name, 
                dataType: updates.dataType !== undefined ? updates.dataType : li.dataType,
                isRequired: updates.isPortRequired !== undefined ? updates.isPortRequired : li.isRequired,
                originalDataType: updates.dataType || li.dataType, 
              }
            : li
        );
        const updatedPropsForHistory: any = {};
        if (updates.dataType && updates.dataType !== oldDataType) {
          updatedPropsForHistory.dataType = { old: oldDataType, new: updates.dataType };
        }
        if (updates.isPortRequired !== undefined && updates.isPortRequired !== oldIsRequired) {
          updatedPropsForHistory.isPortRequired = { old: oldIsRequired, new: updates.isPortRequired };
        }
        if (Object.keys(updatedPropsForHistory).length > 0) {
            workflowHistoryManager.commitHistoryAction(HistoryActionType.UPDATE_SUBWORKFLOW_INTERFACE_DETAILS, {
                interfaceType: originalItem.nodeType,
                interfaceName: originalItem.name, 
                updatedProperties: updatedPropsForHistory,
                affectedNodeIds: [originalItem.id], 
            });
        }
        return updated;
      });
    } else {
      actionHandlers.appOrchestrationUpdateProgramInterfaceDetails(originalItem, updates);
    }
  }, [actionHandlers, workflowHistoryManager]);

  const appHandleDeleteProgramInterface = useCallback((itemToDelete: ProgramInterfaceDisplayItem) => {
    const nodesToDeleteForInterface: string[] = [];
    const currentNodes = featureHooks.nodeManager.getNodes();

    currentNodes.forEach(node => {
      const nodeTypeMatches = (itemToDelete.nodeType === 'input' && node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY) ||
                              (itemToDelete.nodeType === 'output' && node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY);
      if (nodeTypeMatches) {
        const currentPortName = node.data?.portName;
        const itemMatchDataType = itemToDelete.originalDataType || itemToDelete.dataType;
        if (currentPortName === itemToDelete.name && node.data?.portDataType === itemMatchDataType) {
          nodesToDeleteForInterface.push(node.id);
        }
      }
    });

    if (nodesToDeleteForInterface.length > 0) {
      const deletedNodesDetails: HistoryEntryNodeActionTarget[] = [];
      nodesToDeleteForInterface.forEach(nodeId => {
        const node = currentNodes.find(n => n.id === nodeId); 
        if (node) {
            deletedNodesDetails.push({ nodeId: node.id, nodeType: node.type, nodeTitle: node.title });
            featureHooks.nodeManager.deleteNodeCompletely(nodeId); 
        }
      });
    }
  }, [featureHooks.nodeManager]);

  const { nodes } = featureHooks.nodeManager;

  useEffect(() => {
    const currentActiveTab = activeTabId ? appCoreOrchestrationRef.current?.tabs.find(t => t.id === activeTabId) : null;
    if (currentActiveTab?.type !== 'subworkflow') {
      if (logicalInterfaces.length > 0) setLogicalInterfacesInternal([]);
      return;
    }
  
    const canvasInputNodes = new Map<string, AppNode>();
    const canvasOutputNodes = new Map<string, AppNode>();
    nodes.forEach(node => {
      if (node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY) canvasInputNodes.set(node.id, node);
      else if (node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY) canvasOutputNodes.set(node.id, node);
    });
  
    const nextInterfaces: ProgramInterfaceDisplayItem[] = [];
    const processedCanvasNodeIds = new Set<string>();
    
    logicalInterfaces.forEach(currentLi => {
      let updatedOrKeptLi: ProgramInterfaceDisplayItem | null = null;
  
      if (!currentLi.isLogical && currentLi.id) { 
        const canvasNodesForType = currentLi.nodeType === 'input' ? canvasInputNodes : canvasOutputNodes;
        const correspondingCanvasNode = canvasNodesForType.get(currentLi.id);
  
        if (correspondingCanvasNode) { 
          const portName = getPortDisplayNameForOrchestration(correspondingCanvasNode, currentLi.nodeType === 'input' ? '输入' : '输出');
          const portDataType = correspondingCanvasNode.data?.portDataType || (currentLi.nodeType === 'input' ? correspondingCanvasNode.outputs[0]?.dataType : correspondingCanvasNode.inputs[0]?.dataType) || PortDataType.ANY;
          const isPortRequired = !!correspondingCanvasNode.data?.isPortRequired;
          updatedOrKeptLi = {
            ...currentLi, name: portName, dataType: portDataType,
            originalDataType: portDataType, isRequired: isPortRequired,
          };
          processedCanvasNodeIds.add(correspondingCanvasNode.id);
        } else { 
          updatedOrKeptLi = {
            ...currentLi,
            id: `logical_${currentLi.name.replace(/\s+/g, '_')}_${currentLi.nodeType}_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
            isLogical: true,
          };
        }
      } else { 
        const canvasNodesToSearch = currentLi.nodeType === 'input' ? canvasInputNodes : canvasOutputNodes;
        let fulfillingNode: AppNode | undefined = undefined;
  
        for (const [nodeId, canvasNode] of canvasNodesToSearch) {
          if (processedCanvasNodeIds.has(nodeId)) continue;
          const canvasPortName = getPortDisplayNameForOrchestration(canvasNode, currentLi.nodeType === 'input' ? '输入' : '输出');
          const canvasPortDataType = canvasNode.data?.portDataType || (currentLi.nodeType === 'input' ? canvasNode.outputs[0]?.dataType : canvasNode.inputs[0]?.dataType) || PortDataType.ANY;
          if (canvasPortName === currentLi.name && canvasPortDataType === currentLi.dataType) {
            fulfillingNode = canvasNode;
            break;
          }
        }
  
        if (fulfillingNode) { 
          const portName = getPortDisplayNameForOrchestration(fulfillingNode, currentLi.nodeType === 'input' ? '输入' : '输出');
          const portDataType = fulfillingNode.data?.portDataType || (currentLi.nodeType === 'input' ? fulfillingNode.outputs[0]?.dataType : fulfillingNode.inputs[0]?.dataType) || PortDataType.ANY;
          const isPortRequired = !!fulfillingNode.data?.isPortRequired;
          updatedOrKeptLi = {
            ...currentLi, id: fulfillingNode.id, name: portName,
            dataType: portDataType, originalDataType: portDataType,
            isRequired: isPortRequired, isLogical: false,
          };
          processedCanvasNodeIds.add(fulfillingNode.id);
        } else { 
          updatedOrKeptLi = currentLi;
        }
      }
      if(updatedOrKeptLi) nextInterfaces.push(updatedOrKeptLi);
    });
  
    const brandNewInputItems: ProgramInterfaceDisplayItem[] = [];
    canvasInputNodes.forEach(node => {
      if (!processedCanvasNodeIds.has(node.id)) {
        const portName = getPortDisplayNameForOrchestration(node, '输入');
        const portDataType = node.data?.portDataType || node.outputs[0]?.dataType || PortDataType.ANY;
        const isPortRequired = !!node.data?.isPortRequired;
        brandNewInputItems.push({
          id: node.id, name: portName, dataType: portDataType, originalDataType: portDataType,
          isRequired: isPortRequired, nodeType: 'input', isLogical: false,
        });
      }
    });
  
    const brandNewOutputItems: ProgramInterfaceDisplayItem[] = [];
    canvasOutputNodes.forEach(node => {
      if (!processedCanvasNodeIds.has(node.id)) {
        const portName = getPortDisplayNameForOrchestration(node, '输出');
        const portDataType = node.data?.portDataType || node.inputs[0]?.dataType || PortDataType.ANY;
        const isPortRequired = !!node.data?.isPortRequired;
        brandNewOutputItems.push({
          id: node.id, name: portName, dataType: portDataType, originalDataType: portDataType,
          isRequired: isPortRequired, nodeType: 'output', isLogical: false,
        });
      }
    });
  
    const finalCombinedInterfaces = [
      ...brandNewInputItems,
      ...nextInterfaces.filter(li => li.nodeType === 'input' && !brandNewInputItems.some(bni => bni.id === li.id)),
      ...brandNewOutputItems,
      ...nextInterfaces.filter(li => li.nodeType === 'output' && !brandNewOutputItems.some(bno => bno.id === li.id)),
    ];
    
    const uniqueFinalCombined = Array.from(new Map(finalCombinedInterfaces.map(item => [item.id, item])).values());
  
    if (JSON.stringify(logicalInterfaces) !== JSON.stringify(uniqueFinalCombined)) {
      setLogicalInterfacesInternal(uniqueFinalCombined);
    }
  }, [nodes, logicalInterfaces, activeTabId, appCoreOrchestrationRef]);
  
  const handleAddLogicalInterfaceToState = useCallback((item: ProgramInterfaceDisplayItem) => {
    setLogicalInterfacesInternal(prev => {
      const exists = prev.some(li => li.name === item.name && li.dataType === item.dataType && li.nodeType === item.nodeType);
      if (exists) {
        return prev;
      }
      const newItem = { ...item, isLogical: true, originalDataType: item.dataType };
      
      const inputs = prev.filter(li => li.nodeType === 'input');
      const outputs = prev.filter(li => li.nodeType === 'output');
      let newArray;
      if (newItem.nodeType === 'input') {
        newArray = [newItem, ...inputs, ...outputs];
      } else {
        newArray = [...inputs, newItem, ...outputs];
      }
      
      if (workflowHistoryManager) {
        workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_NODE, { 
            newNodeId: newItem.id,
            newNodeType: `logical-${newItem.nodeType}-interface`, 
            newNodeTitle: newItem.name,
            committedNewNodeInstance: { id: newItem.id, title: newItem.name, type: `logical-${newItem.nodeType}-interface`, x:0, y:0, width:0, height:0, inputs:[], outputs:[], headerColor:'', bodyColor:'' } as AppNode, 
        });
      }
      return newArray;
    });
  }, [workflowHistoryManager]);

  const handleDeleteLogicalInterfaceFromPanel = useCallback((itemId: string) => { 
    const itemToDelete = logicalInterfaces.find(li => li.id === itemId);
    if (itemToDelete && itemToDelete.isLogical) { 
      setLogicalInterfacesInternal(prev => {
        const newState = prev.filter(li => li.id !== itemId);
        newState.sort((a, b) => {
            if (a.nodeType !== b.nodeType) return a.nodeType.localeCompare(b.nodeType);
            if (a.isLogical !== b.isLogical) return a.isLogical ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
        return newState;
      });
      if (workflowHistoryManager) {
        workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_LOGICAL_PROGRAM_INTERFACE_ITEM, {
          interfaceName: itemToDelete.name,
          interfaceType: itemToDelete.nodeType,
          dataType: itemToDelete.dataType,
        });
      }
    } else if (itemToDelete && !itemToDelete.isLogical) {
      appHandleDeleteProgramInterface(itemToDelete);
    }
  }, [logicalInterfaces, workflowHistoryManager, appHandleDeleteProgramInterface]); 
  
  const reorderLogicalInterface = useCallback((
    draggedItemId: string,
    targetItemId: string,
    position: 'before' | 'after',
    itemType: 'input' | 'output' 
  ) => {
    setLogicalInterfacesInternal(prevLogicalItems => {
      const itemsOfTargetType = prevLogicalItems.filter(item => item.nodeType === itemType);
      const otherTypeItems = prevLogicalItems.filter(item => item.nodeType !== itemType);

      const draggedItemIndex = itemsOfTargetType.findIndex(item => item.id === draggedItemId);
      if (draggedItemIndex === -1) return prevLogicalItems; 

      const [draggedItem] = itemsOfTargetType.splice(draggedItemIndex, 1); 
      let targetItemIndexInFiltered = itemsOfTargetType.findIndex(item => item.id === targetItemId);

      if (targetItemIndexInFiltered === -1) { 
        itemsOfTargetType.push(draggedItem);
      } else {
        if (position === 'before') {
          itemsOfTargetType.splice(targetItemIndexInFiltered, 0, draggedItem);
        } else { 
          itemsOfTargetType.splice(targetItemIndexInFiltered + 1, 0, draggedItem);
        }
      }
      
      let reconstructedList : ProgramInterfaceDisplayItem[] = [];
      if (itemType === 'input') {
        reconstructedList = [...itemsOfTargetType, ...otherTypeItems];
      } else { 
        reconstructedList = [...otherTypeItems, ...itemsOfTargetType];
      }
      
      const oldFullIndex = prevLogicalItems.findIndex(it => it.id === draggedItemId);
      const newFullIndexAfterReorder = reconstructedList.findIndex(it => it.id === draggedItemId);

      if (workflowHistoryManager && oldFullIndex !== -1 && newFullIndexAfterReorder !== -1 && oldFullIndex !== newFullIndexAfterReorder) {
        const originalItemForHistory = prevLogicalItems.find(it => it.id === draggedItemId);
        if (originalItemForHistory) { 
            workflowHistoryManager.commitHistoryAction(HistoryActionType.REORDER_LOGICAL_PROGRAM_INTERFACE_ITEM, {
            itemId: draggedItemId,
            interfaceName: originalItemForHistory.name, 
            interfaceType: itemType, 
            oldIndex: oldFullIndex,
            newIndex: newFullIndexAfterReorder,
            });
        }
      }
      return reconstructedList;
    });
  }, [workflowHistoryManager]); 

  return {
    ...featureHooks.nodeManager, 
    ...featureHooks.connectionManager,
    updateConnectionProperties: featureHooks.connectionManager.updateConnectionProperties, // Ensure this is exposed
    definedAreas: featureHooks.definedAreaManager.definedAreas,
    setDefinedAreasDirectly: featureHooks.definedAreaManager.setDefinedAreasDirectly,
    selectedDefinedArea: appDefinedAreaOrchestration.selectedDefinedAreaForInspector,
    appHandleUpdateDefinedArea: appDefinedAreaOrchestration.appHandleUpdateDefinedArea,
    isDefiningAreaActive: appDefinedAreaOrchestration.isDefiningAreaActive,
    appHandleStartDefiningArea: appDefinedAreaOrchestration.appHandleStartDefiningArea,
    appHandleEndDefiningArea: appDefinedAreaOrchestration.appHandleEndDefiningArea,
    clearSelectedDefinedArea: appDefinedAreaOrchestration.clearSelectedDefinedArea,
    addDefinedAreaDirectlyAndCommitHistory: appDefinedAreaOrchestration.addDefinedAreaDirectlyAndCommitHistory,
    isMarqueeSelectActiveForCanvas: appMarqueeOrchestration.isMarqueeSelectActiveForCanvas,
    appHandleStartMarqueeSelect: appMarqueeOrchestration.appHandleStartMarqueeSelectInternal,
    appHandleSelectNodesByMarquee: appMarqueeOrchestration.appHandleSelectNodesByMarqueeInternal,
    setIsMarqueeSelectModeActiveInternal: appMarqueeOrchestration.setIsMarqueeSelectModeActiveInternal,
    handleCanvasContextMenu: contextMenuOrchestrator.handleCanvasContextMenu,
    handleNodeContextMenu: contextMenuOrchestrator.handleNodeContextMenu,
    handleConnectionContextMenu: contextMenuOrchestrator.handleConnectionContextMenu,
    handleDefinedAreaContextMenu: contextMenuOrchestrator.handleDefinedAreaContextMenu,
    appHandleNodeMoveEnd: actionHandlers.appHandleNodeMoveEnd,
    addNode: actionHandlers.appOrchestrationAddNode, 
    addNodeOnDrop: actionHandlers.appOrchestrationAddNodeOnDrop,
    completeConnection: actionHandlers.completeConnectionAndCommit, 
    appHandleCopyNode: actionHandlers.appHandleCopyNode,
    appHandleCutNode: actionHandlers.appHandleCutNode,
    appHandlePasteNode: actionHandlers.appHandlePasteNode,
    appHandleDelete: actionHandlers.appHandleDelete, 
    appHandleDeleteProgramInterface,
    appHandleDragPerformed,
    handleCanvasBackgroundClick,
    handleShowProperties, 
    shouldCreateAreaOnGroupDrop, 
    toggleShouldCreateAreaOnGroupDrop, 
    setShouldCreateAreaOnGroupDrop, 
    updateProgramInterfaceNameOnNodes, 
    updateProgramInterfaceDetailsOnNodes, 
    logicalInterfaces: getLogicalInterfacesForAccess(), 
    onAddLogicalInterface: handleAddLogicalInterfaceToState,
    onDeleteLogicalInterfaceFromPanel: handleDeleteLogicalInterfaceFromPanel, 
    reorderLogicalInterface, 
    getLogicalInterfaces: getLogicalInterfacesForAccess,
    setLogicalInterfacesDirectly: setLogicalInterfacesDirectlyForAccess,
  };
};
