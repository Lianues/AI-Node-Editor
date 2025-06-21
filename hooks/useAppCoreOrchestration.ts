


import React, { useMemo, useCallback } from 'react'; // Added useCallback
import { Node, Tab, CanvasSnapshot, NodeExecutionState, DefinedArea, ProgramInterfaceDisplayItem } from '../types'; // Removed WorkflowState from here, Added ProgramInterfaceDisplayItem
import { Connection } from '../features/connections/types/connectionTypes';
import { HistoryEntry, HistoryActionType } from '../features/history/historyTypes';
import { AppViewManagerOutput } from './useAppViewManager'; // Kept this import
import { AppUIManagerOutput } from './useAppUIManager';   // Kept this import
import { useClipboard } from '../features/clipboard/useClipboard';
import { useWorkflowTabsManager } from './useWorkflowTabsManager'; // Added correct import
import { SelectConnectionOptions } from '../features/connections/hooks/useConnectionManager'; // Added import


// --- Start of type definitions (moved here from useMultiTabWorkflowManager) ---
export interface WorkflowState {
  nodes: Node[];
  connections: Connection[];
  definedAreas: DefinedArea[];
  selectedNodeIds: string[];
  selectedConnectionId: string | null;
  historyEntries: HistoryEntry[];
  currentHistoryIndex: number;
  pan: { x: number; y: number };
  scale: number;
  nodeTypeToPlace: string | null;
  nodeExecutionStates: Map<string, NodeExecutionState>;
  logicalInterfaces: ProgramInterfaceDisplayItem[]; // Added logicalInterfaces
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
  logicalInterfaces: [], // Added logicalInterfaces
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
        logicalInterfaces: deepCloneArray(state.logicalInterfaces || []), // Added logicalInterfaces
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
  selectConnection: (connectionId: string | null, options?: SelectConnectionOptions) => void;
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

// export type ViewAccess = ViewAccessForTabsManager; // Already part of AppViewManagerOutput
// --- End of type definitions ---

interface UseAppCoreOrchestrationProps {
  appViewManager: AppViewManagerOutput;
  appUIManager: AppUIManagerOutput;
  clipboardControls: ReturnType<typeof useClipboard>;
  historyAccess: HistoryAccess;
  nodeManagerAccess: NodeManagerAccess;
  connectionManagerAccess: ConnectionManagerAccess;
  definedAreaManagerAccess: DefinedAreaManagerAccess;
  onTabWorkflowStateLoaded: (newActiveTabId: string | null, nodeExecutionStates: Map<string, NodeExecutionState>) => void;
  defaultInitialPan: { x: number; y: number };
  defaultInitialScale: number;
}

export const useAppCoreOrchestration = ({
  appViewManager,
  appUIManager,
  clipboardControls,
  historyAccess,
  nodeManagerAccess,
  connectionManagerAccess,
  definedAreaManagerAccess,
  onTabWorkflowStateLoaded,
  defaultInitialPan,
  defaultInitialScale,
}: UseAppCoreOrchestrationProps) => {
  const workflowTabsManager = useWorkflowTabsManager({
    initialTabs: [],
    defaultInitialPan,
    defaultInitialScale,
    nodeManagerAccess,
    connectionManagerAccess,
    definedAreaManagerAccess,
    historyAccess,
    viewAccess: appViewManager.viewAccessForTabsManager,
    onTabWorkflowStateLoaded,
    getLiveExecutionStatesForActiveTab: () => (window as any).tempGetLiveNodeExecutionStatesForAppOrch?.() || new Map()
  });

  const addTab = useCallback((options?: { snapshot?: CanvasSnapshot, title?: string, fileHandle?: FileSystemFileHandle, type?: Tab['type'], id?: string }) => {
    // Pass the id from options to workflowTabsManager.addTab
    const newTab = workflowTabsManager.addTab({
      snapshot: options?.snapshot,
      title: options?.title,
      fileHandle: options?.fileHandle,
      type: options?.type,
      id: options?.id, // Pass the id here
    });

    // fileHandle association logic remains the same, if fileHandle is part of options
    if (options?.fileHandle && newTab) {
      workflowTabsManager.updateTab(newTab.id, { fileHandle: options.fileHandle });
    }
    return newTab;
  }, [workflowTabsManager]);

  const updateTabStateInternal = useCallback((tabId: string, updates: Partial<WorkflowState>) => {
    workflowTabsManager.updateTabStateInternal(tabId, updates);
  }, [workflowTabsManager]);


  return {
    // From workflowTabsManager
    tabs: workflowTabsManager.tabs,
    activeTabId: workflowTabsManager.activeTabId,
    selectTab: workflowTabsManager.selectTab,
    closeTab: workflowTabsManager.closeTab,
    addTab,
    closeOtherTabs: workflowTabsManager.closeOtherTabs,
    closeTabsToTheRight: workflowTabsManager.closeTabsToTheRight,
    closeAllTabs: workflowTabsManager.closeAllTabs,
    togglePinTab: workflowTabsManager.togglePinTab,
    updateTab: workflowTabsManager.updateTab,
    persistCurrentlyActiveTabStateAsSaved: workflowTabsManager.persistCurrentlyActiveTabStateAsSaved, 
    getActiveTabFileHandle: workflowTabsManager.getActiveTabFileHandle,
    getTabWorkflowStateById: workflowTabsManager.getTabWorkflowStateById,
    updateTabStateInternal, 
    clearAllTabsAndWorkflowStates: workflowTabsManager.clearAllTabsAndWorkflowStates, // Expose
    setAllTabWorkflowStates: workflowTabsManager.setAllTabWorkflowStates,       // Expose


    // Re-expose passed-in managers/controls
    appViewManager,
    appUIManager,
    clipboardControls,
  };
};
