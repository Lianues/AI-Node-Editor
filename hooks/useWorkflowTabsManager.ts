
import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Tab, CanvasSnapshot, NodeExecutionState, DefinedArea, ProgramInterfaceDisplayItem } from '../types'; // Added ProgramInterfaceDisplayItem
import { Connection } from '../features/connections/types/connectionTypes';
import { HistoryEntry, HistoryActionType } from '../features/history/historyTypes';
import { useTabManager } from '../features/tabs/hooks/useTabManager';
import { ProjectExportData } from '../features/projectExportImport/projectExportService'; // Import ProjectExportData
import { deserializeWorkflowStateExecutionStates } from '../features/projectExportImport/projectImportService'; // Import deserializer

// --- Start of type definitions (could be moved to a shared types file if used elsewhere) ---
export interface WorkflowState {
  nodes: Node[];
  connections: Connection[];
  definedAreas: DefinedArea[];
  logicalInterfaces: ProgramInterfaceDisplayItem[]; // Added logicalInterfaces
  selectedNodeIds: string[];
  selectedConnectionId: string | null;
  historyEntries: HistoryEntry[];
  currentHistoryIndex: number;
  pan: { x: number; y: number };
  scale: number;
  nodeTypeToPlace: string | null;
  nodeExecutionStates: Map<string, NodeExecutionState>;
}

const deepCloneArray = <T>(arr: T[]): T[] => {
  if (!arr) return [];
  // Ensure items within the array are also deep cloned if they are objects/arrays
  return arr.map(item => (typeof item === 'object' && item !== null) ? JSON.parse(JSON.stringify(item)) : item);
};

const createInitialSnapshot = (pan: { x: number; y: number }, scale: number): CanvasSnapshot => ({
  nodes: [],
  connections: [],
  definedAreas: [],
  logicalInterfaces: [], // Initialize logicalInterfaces
  pan: { ...pan },
  scale: scale,
  selectedNodeIds: [],
  selectedConnectionId: null,
  nodeExecutionStates: [],
  nodeTypeToPlace: null,
});

const createInitialHistoryEntry = (snapshot: CanvasSnapshot, descriptionSuffix: string = ""): HistoryEntry => ({
  id: `hist_initial_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  timestamp: Date.now(),
  actionType: HistoryActionType.INITIAL_STATE,
  description: `初始状态${descriptionSuffix}`,
  details: {},
  snapshot: snapshot,
});

const deepCloneWorkflowState = (state: WorkflowState): WorkflowState => {
    return {
        nodes: deepCloneArray(state.nodes),
        connections: deepCloneArray(state.connections),
        definedAreas: deepCloneArray(state.definedAreas || []),
        logicalInterfaces: deepCloneArray(state.logicalInterfaces || []), // Deep clone logicalInterfaces
        selectedNodeIds: [...state.selectedNodeIds],
        selectedConnectionId: state.selectedConnectionId,
        historyEntries: deepCloneArray(state.historyEntries),
        currentHistoryIndex: state.currentHistoryIndex,
        pan: { ...state.pan },
        scale: state.scale,
        nodeTypeToPlace: state.nodeTypeToPlace,
        // Deep clone map values if they are objects (NodeExecutionState usually is)
        nodeExecutionStates: new Map(Array.from(state.nodeExecutionStates || []).map(([key, value]) => [key, JSON.parse(JSON.stringify(value))])),
    };
};

export interface NodeManagerAccess {
  getNodes: () => Node[];
  getSelectedNodeId: () => string | null;
  getSelectedNodeIds: () => string[];
  getNodeTypeToPlace: () => string | null;
  setNodesDirectly: (nodes: Node[]) => void;
  selectNode: (nodeId: string | null, shiftKey?: boolean) => void;
  selectNodeTypeForPlacement: (typeKey: string | null) => void;
  addNodesToSelection: (nodeIdsToAdd: string[]) => void;
  getLogicalInterfaces: () => ProgramInterfaceDisplayItem[]; // Added
  setLogicalInterfacesDirectly: (interfaces: ProgramInterfaceDisplayItem[]) => void; // Added
}

export interface ConnectionManagerAccess {
  getConnections: () => Connection[];
  getSelectedConnectionId: () => string | null;
  setConnectionsDirectly: (connections: Connection[]) => void;
  selectConnection: (connectionId: string | null) => void;
}

export interface DefinedAreaManagerAccess {
  getDefinedAreas: () => DefinedArea[];
  setDefinedAreasDirectly: (areas: DefinedArea[]) => void;
}


export interface HistoryAccess {
  getActiveTabHistory: () => HistoryEntry[];
  getCurrentHistoryIndex: () => number;
  setActiveTabHistory: (history: HistoryEntry[] | ((prevHistory: HistoryEntry[]) => HistoryEntry[])) => void;
  setCurrentHistoryIndex: (index: number | ((prevIndex: number) => number)) => void;
}

export interface ViewAccessForTabsManager {
  getCurrentPan: () => { x: number; y: number };
  getCurrentScale: () => number;
  setPan: (newPanOrCallback: { x: number; y: number } | ((prevState: { x: number; y: number }) => { x: number; y: number })) => void;
  setScale: (newScaleOrCallback: number | ((prevState: number) => number)) => void;
}

// --- End of type definitions ---

interface UseWorkflowTabsManagerProps {
  initialTabs: Tab[];
  defaultInitialPan?: { x: number; y: number };
  defaultInitialScale?: number;
  nodeManagerAccess: NodeManagerAccess;
  connectionManagerAccess: ConnectionManagerAccess;
  definedAreaManagerAccess: DefinedAreaManagerAccess;
  historyAccess: HistoryAccess;
  viewAccess: ViewAccessForTabsManager;
  onTabWorkflowStateLoaded: (newActiveTabId: string | null, nodeExecutionStates: Map<string, NodeExecutionState>) => void;
  getLiveExecutionStatesForActiveTab?: () => Map<string, NodeExecutionState>;
}

export const useWorkflowTabsManager = ({
  initialTabs: providedInitialTabs,
  defaultInitialPan = { x: 0, y: 0 },
  defaultInitialScale = 1,
  nodeManagerAccess,
  connectionManagerAccess,
  definedAreaManagerAccess,
  historyAccess,
  viewAccess,
  onTabWorkflowStateLoaded,
  getLiveExecutionStatesForActiveTab,
}: UseWorkflowTabsManagerProps) => {
  const [tabWorkflowStates, setTabWorkflowStates] = useState<Map<string, WorkflowState>>(() => {
    const map = new Map<string, WorkflowState>();
    providedInitialTabs.forEach(tab => {
      const initialCanvasSnapshot = createInitialSnapshot(defaultInitialPan, defaultInitialScale);
      map.set(tab.id, {
        nodes: [],
        connections: [],
        definedAreas: [],
        logicalInterfaces: [], // Initialize logicalInterfaces
        selectedNodeIds: [],
        selectedConnectionId: null,
        historyEntries: [createInitialHistoryEntry(initialCanvasSnapshot, ` (${tab.title})`)],
        currentHistoryIndex: 0,
        pan: { ...defaultInitialPan },
        scale: defaultInitialScale,
        nodeTypeToPlace: null,
        nodeExecutionStates: new Map(),
      });
    });
    return map;
  });

  const [liveUnsavedWorkflowStates, setLiveUnsavedWorkflowStates] = useState<Map<string, WorkflowState>>(new Map());
  const closedInternalTabStatesRef = useRef<Map<string, WorkflowState>>(new Map());
  const previousActiveTabIdRef = useRef<string | null>(null);
  const tabFileHandlesRef = useRef<Map<string, FileSystemFileHandle>>(new Map());
  
  const pendingSnapshotForNewTabRef = useRef<Map<string, CanvasSnapshot>>(new Map());
  const justCreatedTabStateRef = useRef<Map<string, WorkflowState>>(new Map());


  const latestNodeManagerAccessRef = useRef(nodeManagerAccess);
  const latestConnectionManagerAccessRef = useRef(connectionManagerAccess);
  const latestDefinedAreaManagerAccessRef = useRef(definedAreaManagerAccess);
  const latestHistoryAccessRef = useRef(historyAccess);
  const latestViewAccessRef = useRef(viewAccess);
  const latestGetLiveExecutionStatesRef = useRef(getLiveExecutionStatesForActiveTab);

  useEffect(() => {
    latestNodeManagerAccessRef.current = nodeManagerAccess;
    latestConnectionManagerAccessRef.current = connectionManagerAccess;
    latestDefinedAreaManagerAccessRef.current = definedAreaManagerAccess;
    latestHistoryAccessRef.current = historyAccess;
    latestViewAccessRef.current = viewAccess;
    latestGetLiveExecutionStatesRef.current = getLiveExecutionStatesForActiveTab;
  });

  let saveTabStateCallback: (tabIdToSave: string) => void;
  let loadTabStateCallback: (tabIdToLoad: string | null) => void;

  const onTabCreatedCallback = useCallback((newTab: Tab) => {
    let stateForNewTab: WorkflowState | undefined;
    let loadedFromPersisted = false;
    const titleForHistory = newTab.title ? ` (${newTab.title})` : "";

    // If an ID is provided (e.g., for internal project file or project import) AND it exists in closedInternalTabStatesRef
    if (newTab.id && !newTab.fileHandle && closedInternalTabStatesRef.current.has(newTab.id)) {
        stateForNewTab = deepCloneWorkflowState(closedInternalTabStatesRef.current.get(newTab.id)!);
        loadedFromPersisted = true;
    } else {
        // Try loading from pending snapshot if available for this ID (e.g. from project import or opening local file)
        const pendingSnapshot = pendingSnapshotForNewTabRef.current.get(newTab.id);
        if (pendingSnapshot) {
            const nodeExecStatesMap = new Map<string, NodeExecutionState>();
            if (pendingSnapshot.nodeExecutionStates && Array.isArray(pendingSnapshot.nodeExecutionStates)) {
                pendingSnapshot.nodeExecutionStates.forEach(([id, st]) => nodeExecStatesMap.set(id, JSON.parse(JSON.stringify(st))));
            }
            stateForNewTab = {
                nodes: deepCloneArray(pendingSnapshot.nodes),
                connections: deepCloneArray(pendingSnapshot.connections),
                definedAreas: deepCloneArray(pendingSnapshot.definedAreas || []),
                logicalInterfaces: deepCloneArray(pendingSnapshot.logicalInterfaces || []), // Load logicalInterfaces from snapshot
                selectedNodeIds: [...(pendingSnapshot.selectedNodeIds || [])],
                selectedConnectionId: pendingSnapshot.selectedConnectionId,
                historyEntries: [createInitialHistoryEntry(pendingSnapshot, `${titleForHistory} - from snapshot`)],
                currentHistoryIndex: 0,
                pan: { ...pendingSnapshot.pan },
                scale: pendingSnapshot.scale,
                nodeTypeToPlace: pendingSnapshot.nodeTypeToPlace,
                nodeExecutionStates: nodeExecStatesMap,
            };
            pendingSnapshotForNewTabRef.current.delete(newTab.id);
        } else { // Fallback to brand new initial state
            const initialCanvasSnapshot = createInitialSnapshot({ ...defaultInitialPan }, defaultInitialScale);
            stateForNewTab = {
                nodes: [], connections: [], definedAreas: [], logicalInterfaces: [], // Initialize logicalInterfaces
                selectedNodeIds: [], selectedConnectionId: null,
                historyEntries: [createInitialHistoryEntry(initialCanvasSnapshot, `${titleForHistory} - new empty`)],
                currentHistoryIndex: 0,
                pan: { ...defaultInitialPan }, scale: defaultInitialScale, nodeTypeToPlace: null, nodeExecutionStates: new Map()
            };
        }
    }
    
    justCreatedTabStateRef.current.set(newTab.id, deepCloneWorkflowState(stateForNewTab!));
    setTabWorkflowStates(prevMap => new Map(prevMap).set(newTab.id, deepCloneWorkflowState(stateForNewTab!)));

    if (!loadedFromPersisted && !newTab.fileHandle && !pendingSnapshotForNewTabRef.current.has(newTab.id)) {
        closedInternalTabStatesRef.current.set(newTab.id, deepCloneWorkflowState(stateForNewTab!));
    }
  }, [defaultInitialPan, defaultInitialScale]);


  const tabManager = useTabManager({
    initialTabs: providedInitialTabs,
    onTabActivated: (newActiveTabId, oldActiveTabId) => {
      if (oldActiveTabId && saveTabStateCallback) {
        saveTabStateCallback(oldActiveTabId);
      }
      if (loadTabStateCallback) {
        loadTabStateCallback(newActiveTabId);
      }
    },
    onTabCreated: onTabCreatedCallback,
  });

  saveTabStateCallback = useCallback((tabIdToSave: string) => {
    const tabInfo = tabManager.tabs.find(t => t.id === tabIdToSave);
    if (!tabInfo) {
      return;
    }

    const liveExecutionStates = latestGetLiveExecutionStatesRef.current ? latestGetLiveExecutionStatesRef.current() : new Map();
    const currentFullStateOfTabToSave: WorkflowState = {
        nodes: deepCloneArray(latestNodeManagerAccessRef.current.getNodes()),
        connections: deepCloneArray(latestConnectionManagerAccessRef.current.getConnections()),
        definedAreas: deepCloneArray(latestDefinedAreaManagerAccessRef.current.getDefinedAreas()),
        logicalInterfaces: deepCloneArray(latestNodeManagerAccessRef.current.getLogicalInterfaces()), // Save logicalInterfaces
        selectedNodeIds: [...latestNodeManagerAccessRef.current.getSelectedNodeIds()],
        selectedConnectionId: latestConnectionManagerAccessRef.current.getSelectedConnectionId(),
        historyEntries: deepCloneArray(latestHistoryAccessRef.current.getActiveTabHistory()),
        currentHistoryIndex: latestHistoryAccessRef.current.getCurrentHistoryIndex(),
        pan: { ...latestViewAccessRef.current.getCurrentPan() },
        scale: latestViewAccessRef.current.getCurrentScale(),
        nodeTypeToPlace: latestNodeManagerAccessRef.current.getNodeTypeToPlace(),
        nodeExecutionStates: new Map(Array.from(liveExecutionStates.entries()).map(([k,v]) => [k, JSON.parse(JSON.stringify(v))])),
    };

    setTabWorkflowStates(prevMap => new Map(prevMap).set(tabIdToSave, currentFullStateOfTabToSave));

    if (tabInfo.unsaved) {
        setLiveUnsavedWorkflowStates(prevMap => new Map(prevMap).set(tabIdToSave, currentFullStateOfTabToSave));
    } else { 
        setLiveUnsavedWorkflowStates(prevMap => { 
            if (prevMap.has(tabIdToSave)) {
                const newMap = new Map(prevMap);
                newMap.delete(tabIdToSave);
                return newMap;
            }
            return prevMap;
        });
    }
  }, [tabManager.tabs]); 

  loadTabStateCallback = useCallback((tabIdToLoad: string | null) => {
    if (!tabIdToLoad) {
        latestNodeManagerAccessRef.current.setNodesDirectly([]);
        latestNodeManagerAccessRef.current.selectNode(null, false);
        latestNodeManagerAccessRef.current.selectNodeTypeForPlacement(null);
        latestConnectionManagerAccessRef.current.setConnectionsDirectly([]);
        latestConnectionManagerAccessRef.current.selectConnection(null);
        latestDefinedAreaManagerAccessRef.current.setDefinedAreasDirectly([]);
        latestNodeManagerAccessRef.current.setLogicalInterfacesDirectly([]); // Clear logicalInterfaces
        latestHistoryAccessRef.current.setActiveTabHistory([]);
        latestHistoryAccessRef.current.setCurrentHistoryIndex(0);
        latestViewAccessRef.current.setPan({ ...defaultInitialPan });
        latestViewAccessRef.current.setScale(defaultInitialScale);
        onTabWorkflowStateLoaded(null, new Map());
        return;
    }

    let stateToLoad: WorkflowState | undefined = undefined;
    const activeTabInfo = tabManager.tabs.find(t => t.id === tabIdToLoad);


    if (justCreatedTabStateRef.current.has(tabIdToLoad)) {
      stateToLoad = deepCloneWorkflowState(justCreatedTabStateRef.current.get(tabIdToLoad)!);
      justCreatedTabStateRef.current.delete(tabIdToLoad); 
    } else if (activeTabInfo && activeTabInfo.unsaved && liveUnsavedWorkflowStates.has(tabIdToLoad)) {
        stateToLoad = deepCloneWorkflowState(liveUnsavedWorkflowStates.get(tabIdToLoad)!);
    } else if (activeTabInfo && !activeTabInfo.fileHandle && closedInternalTabStatesRef.current.has(tabIdToLoad)) {
        stateToLoad = deepCloneWorkflowState(closedInternalTabStatesRef.current.get(tabIdToLoad)!);
    }

    if (!stateToLoad) {
        stateToLoad = tabWorkflowStates.get(tabIdToLoad);
    }
    
    if (!stateToLoad && activeTabInfo) {
        const titleForHistory = activeTabInfo.title ? ` (${activeTabInfo.title})` : "";
        const initialCanvasSnapshotForHistory = createInitialSnapshot({ ...defaultInitialPan }, defaultInitialScale);
        stateToLoad = {
            nodes: [], connections: [], definedAreas: [], logicalInterfaces: [], // Initialize logicalInterfaces
            selectedNodeIds: [], selectedConnectionId: null,
            historyEntries: [createInitialHistoryEntry(initialCanvasSnapshotForHistory, `${titleForHistory} - Fallback on loadTabState`)],
            currentHistoryIndex: 0,
            pan: { ...defaultInitialPan }, scale: defaultInitialScale, nodeTypeToPlace: null, nodeExecutionStates: new Map(),
        };
    }
    
    if (!stateToLoad) { 
        
        return;
    }

    latestNodeManagerAccessRef.current.setNodesDirectly(deepCloneArray(stateToLoad.nodes));
    latestNodeManagerAccessRef.current.selectNode(null, false);
    if (stateToLoad.selectedNodeIds && stateToLoad.selectedNodeIds.length > 0) {
        stateToLoad.selectedNodeIds.forEach((id, index) => {
            latestNodeManagerAccessRef.current.selectNode(id, index > 0);
        });
    }
    latestNodeManagerAccessRef.current.selectNodeTypeForPlacement(stateToLoad.nodeTypeToPlace);
    latestConnectionManagerAccessRef.current.setConnectionsDirectly(deepCloneArray(stateToLoad.connections));
    latestConnectionManagerAccessRef.current.selectConnection(stateToLoad.selectedConnectionId);
    latestDefinedAreaManagerAccessRef.current.setDefinedAreasDirectly(deepCloneArray(stateToLoad.definedAreas || []));
    latestNodeManagerAccessRef.current.setLogicalInterfacesDirectly(deepCloneArray(stateToLoad.logicalInterfaces || [])); // Load logicalInterfaces
    latestViewAccessRef.current.setPan({ ...stateToLoad.pan });
    latestViewAccessRef.current.setScale(stateToLoad.scale);
    onTabWorkflowStateLoaded(tabIdToLoad, new Map(Array.from(stateToLoad.nodeExecutionStates || []).map(([k,v]) => [k, JSON.parse(JSON.stringify(v))])));
    latestHistoryAccessRef.current.setActiveTabHistory(deepCloneArray(stateToLoad.historyEntries));
    latestHistoryAccessRef.current.setCurrentHistoryIndex(stateToLoad.currentHistoryIndex);
    
    setTabWorkflowStates(prevMap => new Map(prevMap).set(tabIdToLoad, deepCloneWorkflowState(stateToLoad!)));

  }, [
      tabManager.tabs, tabWorkflowStates, liveUnsavedWorkflowStates,
      defaultInitialPan, defaultInitialScale, onTabWorkflowStateLoaded,
      setTabWorkflowStates 
    ]);


  useEffect(() => {
    const initialActiveTabId = tabManager.activeTabId;
    if (initialActiveTabId && !previousActiveTabIdRef.current && loadTabStateCallback) { 
        loadTabStateCallback(initialActiveTabId);
    }
    previousActiveTabIdRef.current = initialActiveTabId;
  }, [tabManager.activeTabId, loadTabStateCallback]);


  const addTab = useCallback((options?: { snapshot?: CanvasSnapshot, title?: string, fileHandle?: FileSystemFileHandle, type?: Tab['type'], id?: string }) => {
    const newTabId = options?.id || `${options?.type || 'workflow'}_tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (options?.snapshot) {
      pendingSnapshotForNewTabRef.current.set(newTabId, options.snapshot);
    }
    
    // Ensure the ID from options is passed to tabManager.addTab
    const newTabObjectFromTabManager = tabManager.addTab({
      id: newTabId, 
      title: options?.title,
      type: options?.type,
    });


    if (options?.fileHandle && newTabObjectFromTabManager) {
      tabFileHandlesRef.current.set(newTabObjectFromTabManager.id, options.fileHandle);
      tabManager.updateTab(newTabObjectFromTabManager.id, { fileHandle: options.fileHandle });
    }
    return newTabObjectFromTabManager;
  }, [tabManager]);


  const persistCurrentlyActiveTabStateAsSaved = useCallback((currentLiveNodeExecutionStates: Map<string, NodeExecutionState>) => {
    if (!tabManager.activeTabId) {
      return;
    }
    const activeTabObject = tabManager.tabs.find(t => t.id === tabManager.activeTabId);
    if (!activeTabObject) {
      return;
    }

    const currentFullState: WorkflowState = {
        nodes: deepCloneArray(latestNodeManagerAccessRef.current.getNodes()),
        connections: deepCloneArray(latestConnectionManagerAccessRef.current.getConnections()),
        definedAreas: deepCloneArray(latestDefinedAreaManagerAccessRef.current.getDefinedAreas()),
        logicalInterfaces: deepCloneArray(latestNodeManagerAccessRef.current.getLogicalInterfaces()), // Persist logicalInterfaces
        selectedNodeIds: [...latestNodeManagerAccessRef.current.getSelectedNodeIds()],
        selectedConnectionId: latestConnectionManagerAccessRef.current.getSelectedConnectionId(),
        historyEntries: deepCloneArray(latestHistoryAccessRef.current.getActiveTabHistory()),
        currentHistoryIndex: latestHistoryAccessRef.current.getCurrentHistoryIndex(),
        pan: { ...latestViewAccessRef.current.getCurrentPan() },
        scale: latestViewAccessRef.current.getCurrentScale(),
        nodeTypeToPlace: latestNodeManagerAccessRef.current.getNodeTypeToPlace(),
        nodeExecutionStates: new Map(Array.from(currentLiveNodeExecutionStates.entries()).map(([k,v]) => [k, JSON.parse(JSON.stringify(v))]))
    };

    setTabWorkflowStates(prevMap => new Map(prevMap).set(tabManager.activeTabId!, currentFullState));

    if (!activeTabObject.fileHandle) { 
      closedInternalTabStatesRef.current.set(tabManager.activeTabId!, deepCloneWorkflowState(currentFullState));
    }
    
    setLiveUnsavedWorkflowStates(prevMap => {
        if (prevMap.has(tabManager.activeTabId!)) {
            const newMap = new Map(prevMap);
            newMap.delete(tabManager.activeTabId!);
            return newMap;
        }
        return prevMap;
    });
  }, [tabManager.activeTabId, tabManager.tabs]);

  const originalCloseTab = tabManager.closeTab;
  const closeTabWrapper = useCallback((tabIdToClose: string) => {
    const tabInfo = tabManager.tabs.find(t => t.id === tabIdToClose);

    tabFileHandlesRef.current.delete(tabIdToClose);
    pendingSnapshotForNewTabRef.current.delete(tabIdToClose);
    justCreatedTabStateRef.current.delete(tabIdToClose);
    
    setLiveUnsavedWorkflowStates(prevMap => {
        const newMap = new Map(prevMap);
        newMap.delete(tabIdToClose);
        return newMap;
    });
    setTabWorkflowStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(tabIdToClose);
        return newMap;
    });
    
    originalCloseTab(tabIdToClose);
  }, [originalCloseTab, tabManager.tabs]);

  const getActiveTabFileHandle = useCallback((): FileSystemFileHandle | undefined => {
    if (!tabManager.activeTabId) return undefined;
    const activeTab = tabManager.tabs.find(t => t.id === tabManager.activeTabId);
    return activeTab?.fileHandle ?? tabFileHandlesRef.current.get(tabManager.activeTabId);
  }, [tabManager.activeTabId, tabManager.tabs]);

  const getTabWorkflowStateById = useCallback((tabId: string): WorkflowState | undefined => {
    const tabInfo = tabManager.tabs.find(t => t.id === tabId);

    if (tabInfo && tabInfo.unsaved && liveUnsavedWorkflowStates.has(tabId)) {
        return deepCloneWorkflowState(liveUnsavedWorkflowStates.get(tabId)!);
    }
    if (tabInfo && !tabInfo.fileHandle && closedInternalTabStatesRef.current.has(tabId)) {
        return deepCloneWorkflowState(closedInternalTabStatesRef.current.get(tabId)!);
    }
    const stateFromMainMap = tabWorkflowStates.get(tabId);
    if (stateFromMainMap) {
        return deepCloneWorkflowState(stateFromMainMap);
    }
    
    return undefined;
  }, [tabWorkflowStates, liveUnsavedWorkflowStates, tabManager.tabs]);

  const updateTabStateInternal = useCallback((tabId: string, updates: Partial<WorkflowState>) => {
    setTabWorkflowStates(prevMap => {
      const currentTabState = prevMap.get(tabId);
      if (!currentTabState) {
        // console.warn(`[WTM] updateTabStateInternal: No current state found for tabId ${tabId}`);
        return prevMap;
      }
      // Ensure updates are applied to a deep clone to avoid direct mutation of previous state object
      const newState = deepCloneWorkflowState({ ...currentTabState, ...updates });
      return new Map(prevMap).set(tabId, newState);
    });
  
    setLiveUnsavedWorkflowStates(prevMap => {
      if (prevMap.has(tabId)) {
        const currentUnsavedState = prevMap.get(tabId);
        if (!currentUnsavedState) return prevMap; // Should not happen if tab is in liveUnsaved
        const newUnsavedState = deepCloneWorkflowState({ ...currentUnsavedState, ...updates });
        return new Map(prevMap).set(tabId, newUnsavedState);
      }
      return prevMap; // Only update if it's already in liveUnsaved
    });
    
    const tabToMark = tabManager.tabs.find(t => t.id === tabId);
    if (tabToMark && !tabToMark.unsaved) {
        tabManager.updateTab(tabId, { unsaved: true });
    }
  }, [tabManager]);

  const clearAllTabsAndWorkflowStates = useCallback(() => {
    tabManager.closeAllTabs(); // This handles setting tabs to empty (or pinned) and activeTabId to null/first_pinned
    setTabWorkflowStates(new Map());
    setLiveUnsavedWorkflowStates(new Map());
    closedInternalTabStatesRef.current.clear();
    tabFileHandlesRef.current.clear();
    pendingSnapshotForNewTabRef.current.clear();
    justCreatedTabStateRef.current.clear();
    onTabWorkflowStateLoaded(null, new Map());
  }, [tabManager, onTabWorkflowStateLoaded]);

  const setAllTabWorkflowStates = useCallback((
    newStatesFromImport: ProjectExportData['tabWorkflowStates']
  ) => {
    const deserializedStatesMap = new Map<string, WorkflowState>();
    for (const tabId in newStatesFromImport) {
      if (Object.prototype.hasOwnProperty.call(newStatesFromImport, tabId)) {
        deserializedStatesMap.set(tabId, deserializeWorkflowStateExecutionStates(newStatesFromImport[tabId]));
      }
    }

    setTabWorkflowStates(deserializedStatesMap);

    const newInternalStatesForRef = new Map<string, WorkflowState>();
    tabManager.tabs.forEach(tabInstance => {
      if (!tabInstance.fileHandle && deserializedStatesMap.has(tabInstance.id)) {
        newInternalStatesForRef.set(tabInstance.id, deserializedStatesMap.get(tabInstance.id)!);
      }
    });
    closedInternalTabStatesRef.current = newInternalStatesForRef;
    
  }, [tabManager.tabs]); // Added tabManager.tabs dependency


  return {
    tabs: tabManager.tabs,
    activeTabId: tabManager.activeTabId,
    selectTab: tabManager.selectTab,
    closeTab: closeTabWrapper,
    addTab,
    closeOtherTabs: tabManager.closeOtherTabs,
    closeTabsToTheRight: tabManager.closeTabsToTheRight,
    closeAllTabs: tabManager.closeAllTabs,
    togglePinTab: tabManager.togglePinTab,
    updateTab: tabManager.updateTab,
    persistCurrentlyActiveTabStateAsSaved,
    getActiveTabFileHandle,
    getTabWorkflowStateById,
    updateTabStateInternal, 
    clearAllTabsAndWorkflowStates, // Expose new method
    setAllTabWorkflowStates,      // Expose new method
  };
};
