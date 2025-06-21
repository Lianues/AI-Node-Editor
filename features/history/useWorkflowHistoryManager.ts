

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, CanvasSnapshot, PortDataType, ProgramInterfaceDisplayItem } from '../../types'; 
import { HistoryEntry, HistoryActionType, HistoryEntryNodeActionTarget } from './historyTypes';
import { DefinedArea } from '../areaDefinition/types/areaDefinitionTypes'; 

// Helper function to format values for history descriptions
const formatHistoryValue = (value: any): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') {
    return value.length > 25 ? `"${value.substring(0, 25)}..."` : `"${value}"`;
  }
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 30 ? '{...}' : str;
  }
  return String(value);
};

interface PendingHistoryAction {
  actionType: HistoryActionType;
  data: any;
  timestamp: number;
}

export interface UseWorkflowHistoryManagerProps {
  activeTabHistory: HistoryEntry[];
  currentHistoryIndex: number;
  setActiveTabHistory: (updater: HistoryEntry[] | ((prevHistory: HistoryEntry[]) => HistoryEntry[])) => void;
  setCurrentHistoryIndex: (updater: number | ((prevIndex: number) => number)) => void;
  getCurrentCanvasSnapshot: () => CanvasSnapshot;
  nodes: Node[]; 
  restoreHistoryEntryById: (entryId: string) => void;
  closeContextMenu: () => void;
  onMarkTabUnsaved: (tabId: string) => void; 
  activeTabId: string | null; 
}

export interface WorkflowHistoryManagerOutput {
  canUndo: boolean;
  canRedo: boolean;
  commitHistoryAction: (actionType: HistoryActionType, data: any, timestamp?: number) => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

export const useWorkflowHistoryManager = ({
  activeTabHistory,
  currentHistoryIndex,
  setActiveTabHistory,
  setCurrentHistoryIndex,
  getCurrentCanvasSnapshot,
  nodes, 
  restoreHistoryEntryById,
  closeContextMenu,
  onMarkTabUnsaved, 
  activeTabId,      
}: UseWorkflowHistoryManagerProps): WorkflowHistoryManagerOutput => {
  const [historyActionToCommit, setHistoryActionToCommit] = useState<PendingHistoryAction | null>(null);

  useEffect(() => {
    if (historyActionToCommit) {
      const { actionType, data, timestamp } = historyActionToCommit;

      let finalDetails: HistoryEntry['details'] = {};
      let description = '';
      let shouldCommit = true;
      let snapshotToStore: CanvasSnapshot | null = null; 

      const findNodeById = (id: string) => nodes.find(n => n.id === id);

      switch (actionType) {
        case HistoryActionType.ADD_NODE: {
          const committedNode = data.committedNewNodeInstance as Node; 
          finalDetails = { nodeId: data.newNodeId, nodeType: committedNode?.type || data.newNodeType, nodeTitle: committedNode?.title || data.newNodeTitle };
          description = `添加节点: '${finalDetails.nodeTitle || '未知节点'}' (ID: ${data.newNodeId?.slice(0,8) || '未知'})`;
          
          if (committedNode) {
            const baseSnapshot = getCurrentCanvasSnapshot(); 
            const nodesWithoutPotentiallyStaleNewNode = baseSnapshot.nodes.filter(n => n.id !== committedNode.id);
            const finalNodesForSnapshot = [...nodesWithoutPotentiallyStaleNewNode, committedNode];
            
            snapshotToStore = { 
                ...baseSnapshot, 
                nodes: finalNodesForSnapshot,
                selectedNodeIds: [committedNode.id], 
                selectedConnectionId: null, 
                nodeTypeToPlace: null, 
                logicalInterfaces: baseSnapshot.logicalInterfaces ? [...baseSnapshot.logicalInterfaces] : [], // Preserve logical interfaces
            };
          } else {
            console.warn("[HistoryManager] ADD_NODE action missing committedNewNodeInstance. Snapshot accuracy may vary.");
             snapshotToStore = getCurrentCanvasSnapshot(); // Fallback
          }
          break;
        }
        case HistoryActionType.DELETE_NODE:
          finalDetails = { nodeId: data.nodeId, nodeType: data.nodeType, nodeTitle: data.nodeTitle };
          description = `删除节点: '${data.nodeTitle || '未知节点'}' (ID: ${data.nodeId?.slice(0,8) || '未知'})`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        case HistoryActionType.MOVE_NODE: {
          const movedNode = findNodeById(data.nodeId);
          if (movedNode) {
            const dx = Math.abs(movedNode.x - data.fromX);
            const dy = Math.abs(movedNode.y - data.fromY);
            const SIGNIFICANT_MOVE_THRESHOLD = 0.5;
            if (dx > SIGNIFICANT_MOVE_THRESHOLD || dy > SIGNIFICANT_MOVE_THRESHOLD) {
              finalDetails = {
                movedNodeId: data.nodeId,
                movedNodeTitle: movedNode.title,
                movedNodeType: movedNode.type,
                fromX: data.fromX,
                fromY: data.fromY,
                toX: movedNode.x,
                toY: movedNode.y,
              };
              description = `移动节点: '${movedNode.title || '未知节点'}' (ID: ${data.nodeId?.slice(0,8) || '未知'})`;
              snapshotToStore = getCurrentCanvasSnapshot();
            } else {
              shouldCommit = false;
            }
          } else {
            shouldCommit = false;
          }
          break;
        }
        case HistoryActionType.ADD_CONNECTION: {
          const sourceNode = findNodeById(data.sourceNodeId);
          const targetNode = findNodeById(data.targetNodeId);
          finalDetails = {
            connectionId: data.connectionId,
            sourceNodeId: data.sourceNodeId,
            sourcePortId: data.sourcePortId,
            sourceNodeTitle: sourceNode?.title,
            targetNodeId: data.targetNodeId,
            targetPortId: data.targetPortId,
            targetNodeTitle: targetNode?.title,
          };
          description = `连接: '${sourceNode?.title || data.sourceNodeId?.slice(0,8)}':${data.sourcePortId} 到 '${targetNode?.title || data.targetNodeId?.slice(0,8)}':${data.targetPortId}`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.DELETE_CONNECTION: {
           finalDetails = { ...data };
           description = `断开连接: '${data.sourceNodeTitle || data.sourceNodeId?.slice(0,8)}':${data.sourcePortId} 与 '${data.targetNodeTitle || data.targetNodeId?.slice(0,8)}':${data.targetPortId}`;
           snapshotToStore = getCurrentCanvasSnapshot();
           break;
        }
        case HistoryActionType.COPY_NODE:
          finalDetails = { nodeId: data.nodeId, nodeType: data.nodeType, nodeTitle: data.nodeTitle };
          description = `复制节点: '${data.nodeTitle || '未知节点'}' (ID: ${data.nodeId?.slice(0,8) || '未知'})`;
          // Copy doesn't change canvas state, so no snapshot needed for history, or rather, use current
          snapshotToStore = getCurrentCanvasSnapshot(); 
          break;
        case HistoryActionType.CUT_NODE:
          finalDetails = { nodeId: data.nodeId, nodeType: data.nodeType, nodeTitle: data.nodeTitle };
          description = `剪切节点: '${data.nodeTitle || '未知节点'}' (ID: ${data.nodeId?.slice(0,8) || '未知'})`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        case HistoryActionType.PASTE_NODE: {
          const pastedNode = findNodeById(data.newNodeId); 
          finalDetails = {
            nodeId: data.newNodeId, 
            nodeType: pastedNode?.type || data.originalNodeType,
            nodeTitle: pastedNode?.title || data.originalNodeTitle,
            originalNodeId: data.originalNodeId,
            originalNodeTitle: data.originalNodeTitle,
            originalNodeType: data.originalNodeType,
            pastePositionX: data.pastePositionX,
            pastePositionY: data.pastePositionY,
          };
          const originalTitle = data.originalNodeTitle || (data.originalNodeId ? data.originalNodeId.slice(0,8)+"..." : '未知');
          description = `粘贴节点: '${finalDetails.nodeTitle || '未知节点'}' (源自 '${originalTitle}')`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.UPDATE_NODE_DATA: {
          const updatedNode = findNodeById(data.nodeId);
          finalDetails = {
            nodeId: data.nodeId,
            nodeTitle: updatedNode?.title || data.nodeTitle,
            propertyKey: data.propertyKey,
            oldValue: data.oldValue,
            newValue: data.newValue,
          };
          description = `更新节点 '${finalDetails.nodeTitle || '未知节点'}': ${data.propertyKey} 从 ${formatHistoryValue(data.oldValue)} 到 ${formatHistoryValue(data.newValue)}`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.MULTI_NODE_MOVE: {
          const movedNodeInfos = data.movedNodesInfo as HistoryEntryNodeActionTarget[];
          if (movedNodeInfos && movedNodeInfos.length > 0) {
            finalDetails = { nodeActionTargets: movedNodeInfos, count: movedNodeInfos.length };
            description = `移动 ${movedNodeInfos.length} 个节点`;
            if (movedNodeInfos.length === 1) { 
              description = `移动节点: '${movedNodeInfos[0].nodeTitle || '未知节点'}'`;
            }
            snapshotToStore = getCurrentCanvasSnapshot();
          } else {
            shouldCommit = false;
          }
          break;
        }
        case HistoryActionType.MULTI_NODE_DELETE: {
          const deletedNodesInfo = data.deletedNodesInfo as HistoryEntryNodeActionTarget[];
          if (deletedNodesInfo && deletedNodesInfo.length > 0) {
            finalDetails = { nodeActionTargets: deletedNodesInfo, count: deletedNodesInfo.length };
            description = `删除 ${deletedNodesInfo.length} 个节点`;
             if (deletedNodesInfo.length === 1) {
              description = `删除节点: '${deletedNodesInfo[0].nodeTitle || '未知节点'}'`;
            }
            snapshotToStore = getCurrentCanvasSnapshot();
          } else {
            shouldCommit = false;
          }
          break;
        }
        case HistoryActionType.MULTI_NODE_COPY: {
          const copiedNodesInfo = data.copiedNodesInfo as HistoryEntryNodeActionTarget[];
          if (copiedNodesInfo && copiedNodesInfo.length > 0) {
            finalDetails = { nodeActionTargets: copiedNodesInfo, count: copiedNodesInfo.length };
            description = `复制 ${copiedNodesInfo.length} 个节点`;
            if (copiedNodesInfo.length === 1) {
              description = `复制节点: '${copiedNodesInfo[0].nodeTitle || '未知节点'}'`;
            }
            snapshotToStore = getCurrentCanvasSnapshot();
          } else {
            shouldCommit = false;
          }
          break;
        }
        case HistoryActionType.MULTI_NODE_CUT: {
          const cutNodesInfo = data.cutNodesInfo as HistoryEntryNodeActionTarget[];
          if (cutNodesInfo && cutNodesInfo.length > 0) {
            finalDetails = { nodeActionTargets: cutNodesInfo, count: cutNodesInfo.length };
            description = `剪切 ${cutNodesInfo.length} 个节点`;
            if (cutNodesInfo.length === 1) {
              description = `剪切节点: '${cutNodesInfo[0].nodeTitle || '未知节点'}'`;
            }
            snapshotToStore = getCurrentCanvasSnapshot();
          } else {
            shouldCommit = false;
          }
          break;
        }
        case HistoryActionType.MULTI_NODE_PASTE: {
          const pastedNodesInfo = data.pastedNodesInfo as HistoryEntryNodeActionTarget[];
          if (pastedNodesInfo && pastedNodesInfo.length > 0) {
            finalDetails = { 
              nodeActionTargets: pastedNodesInfo, 
              count: pastedNodesInfo.length,
              pastePositionX: data.pasteAnchorX, 
              pastePositionY: data.pasteAnchorY,
            };
            description = `粘贴 ${pastedNodesInfo.length} 个节点`;
            if (pastedNodesInfo.length === 1) {
               const originalTitle = pastedNodesInfo[0].originalNodeTitle || 
                                     (pastedNodesInfo[0].originalId ? pastedNodesInfo[0].originalId.slice(0,8)+"..." : '未知');
               description = `粘贴节点: '${pastedNodesInfo[0].nodeTitle || '未知节点'}' (源自 '${originalTitle}')`;
            }
            snapshotToStore = getCurrentCanvasSnapshot();
          } else {
            shouldCommit = false;
          }
          break;
        }
        case HistoryActionType.MULTI_NODE_SELECT_MARQUEE: {
          const selectedIds = data.selectedNodeIds as string[];
          const mode = data.mode as 'additive' | 'replace';
          if (selectedIds && selectedIds.length > 0) {
            finalDetails = { selectedNodeIds: selectedIds, mode: mode, count: selectedIds.length };
            description = mode === 'additive' 
              ? `框选添加 ${selectedIds.length} 个节点` 
              : `框选选中 ${selectedIds.length} 个节点`;
            if (selectedIds.length === 1) {
                const node = findNodeById(selectedIds[0]);
                description = mode === 'additive' 
                    ? `框选添加节点: '${node?.title || '未知节点'}'`
                    : `框选选中节点: '${node?.title || '未知节点'}'`;
            }
            snapshotToStore = getCurrentCanvasSnapshot();
          } else if (mode === 'replace' && data.previousSelection && data.previousSelection.length > 0) {
            finalDetails = { selectedNodeIds: [], mode: mode, count: 0 };
            description = `框选清除选择`;
            snapshotToStore = getCurrentCanvasSnapshot();
          }
          else {
            shouldCommit = false; 
          }
          break;
        }
        case HistoryActionType.ADD_DEFINED_AREA: {
          const area = data.area as DefinedArea;
          finalDetails = { areaId: area.id, area: { ...area } }; 
          description = `添加区域: '${area.title || area.id.slice(0,8)}'`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.DELETE_DEFINED_AREA: {
          const deletedArea = data.deletedArea as DefinedArea;
          finalDetails = { areaId: deletedArea.id, deletedArea: { ...deletedArea } };
          description = `删除区域: '${deletedArea.title || deletedArea.id.slice(0,8)}'`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.UPDATE_DEFINED_AREA: {
          finalDetails = {
            areaId: data.areaId,
            oldDefinedAreaValues: data.oldValues, 
            newDefinedAreaValues: data.newValues,
          };
          const changedProps = Object.keys(data.newValues).join(', ');
          description = `更新区域 '${data.areaTitle || data.areaId.slice(0,8)}': ${changedProps}`;
          if (Object.keys(data.newValues).length === 1) {
            const propKey = Object.keys(data.newValues)[0];
            description = `更新区域 '${data.areaTitle || data.areaId.slice(0,8)}': ${propKey} 从 ${formatHistoryValue(data.oldValues[propKey])} 到 ${formatHistoryValue(data.newValues[propKey])}`;
          }
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.CREATE_NODE_GROUP: {
          finalDetails = {
            nodeGroupId: data.nodeGroupId,
            nodeGroupName: data.nodeGroupName,
            nodeIdsInGroup: data.nodeIdsInGroup,
            count: data.nodeIdsInGroup?.length || 0,
          };
          description = `创建节点组: '${data.nodeGroupName}' (包含 ${data.nodeIdsInGroup?.length || 0} 个节点)`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.PASTE_NODE_GROUP: {
            finalDetails = {
                nodeGroupId: data.nodeGroupId,
                nodeGroupName: data.nodeGroupName,
                nodeActionTargets: data.nodeActionTargets, 
                count: data.nodeActionTargets?.length || 0,
                pastePositionX: data.pastePositionX,
                pastePositionY: data.pastePositionY,
            };
            description = `粘贴节点组: '${data.nodeGroupName}' (实例化 ${data.nodeActionTargets?.length || 0} 个节点)`;
            snapshotToStore = getCurrentCanvasSnapshot();
            break;
        }
        case HistoryActionType.UPDATE_SUBWORKFLOW_INTERFACE_NAME: {
          const { interfaceType, oldName, newName, dataType } = data;
          finalDetails = { interfaceType, oldName, newName, dataType, affectedNodeIds: data.affectedNodeIds };
          const typeDisplay = interfaceType === 'input' ? '输入' : '输出';
          description = `更新子程序${typeDisplay}接口 '${oldName}' (${dataType}) 为 '${newName}'`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.UPDATE_SUBWORKFLOW_INTERFACE_DETAILS: {
          const { interfaceType, interfaceName, updatedProperties, affectedNodeIds } = data;
          finalDetails = { interfaceType, interfaceName, updatedProperties, affectedNodeIds };
          const typeDisplay = interfaceType === 'input' ? '输入' : '输出';
          let propChanges: string[] = [];
          if (updatedProperties.dataType) {
            propChanges.push(`类型从 ${updatedProperties.dataType.old} 到 ${updatedProperties.dataType.new}`);
          }
          if (updatedProperties.isPortRequired !== undefined) {
            propChanges.push(`必需状态从 ${updatedProperties.isPortRequired.old} 到 ${updatedProperties.isPortRequired.new}`);
          }
          description = `更新子程序${typeDisplay}接口 '${interfaceName}': ${propChanges.join(', ')}`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        case HistoryActionType.DELETE_LOGICAL_PROGRAM_INTERFACE_ITEM: {
          const { interfaceName, interfaceType, dataType } = data;
          finalDetails = { interfaceName, interfaceType, dataType };
          const typeDisplay = interfaceType === 'input' ? '输入' : '输出';
          description = `删除逻辑程序${typeDisplay}接口: '${interfaceName}' (${dataType})`;
          snapshotToStore = getCurrentCanvasSnapshot();
          break;
        }
        default:
          description = `未知操作: ${actionType}`;
          finalDetails = { ...data };
          snapshotToStore = getCurrentCanvasSnapshot();
      }

      if (shouldCommit) {
        const newEntry: HistoryEntry = {
          id: `hist_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp,
          actionType,
          description,
          details: finalDetails,
          snapshot: snapshotToStore || getCurrentCanvasSnapshot(), 
        };
        
        setActiveTabHistory(prevHistory => {
          let updatedHistory = [...prevHistory];
          if (currentHistoryIndex > 0 && updatedHistory.length > 0) {
            updatedHistory = updatedHistory.slice(currentHistoryIndex);
          }
          const newFullHistory = [newEntry, ...updatedHistory];
          return newFullHistory;
        });
        setCurrentHistoryIndex(0);
        
        if (activeTabId) {
            onMarkTabUnsaved(activeTabId); 
        }
      }
      setHistoryActionToCommit(null);
    }
  }, [
    historyActionToCommit,
    nodes, 
    currentHistoryIndex, 
    // activeTabHistory, // Removed to avoid re-running effect when activeTabHistory itself changes due to this effect
    getCurrentCanvasSnapshot,
    setActiveTabHistory,
    setCurrentHistoryIndex,
    onMarkTabUnsaved,
    activeTabId,
  ]);

  const commitHistoryAction = useCallback((actionType: HistoryActionType, data: any, timestamp?: number) => {
    setHistoryActionToCommit({
      actionType,
      data,
      timestamp: timestamp || Date.now(),
    });
  }, []); 

  const canUndo = useMemo(() => {
    return activeTabHistory.length > 0 && currentHistoryIndex < activeTabHistory.length - 1;
  }, [currentHistoryIndex, activeTabHistory.length]);

  const canRedo = useMemo(() => currentHistoryIndex > 0, [currentHistoryIndex]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      const nextHistoryIndex = currentHistoryIndex + 1;
      const entryToRestoreId = activeTabHistory[nextHistoryIndex]?.id;
      if (entryToRestoreId) {
        restoreHistoryEntryById(entryToRestoreId);
        closeContextMenu();
      }
    }
  }, [canUndo, currentHistoryIndex, activeTabHistory, restoreHistoryEntryById, closeContextMenu]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      const prevHistoryIndex = currentHistoryIndex - 1;
      const entryToRestoreId = activeTabHistory[prevHistoryIndex]?.id;
      if (entryToRestoreId) {
        restoreHistoryEntryById(entryToRestoreId);
        closeContextMenu();
      }
    }
  }, [canRedo, currentHistoryIndex, activeTabHistory, restoreHistoryEntryById, closeContextMenu]);

  return {
    canUndo,
    canRedo,
    commitHistoryAction,
    handleUndo,
    handleRedo,
  };
};