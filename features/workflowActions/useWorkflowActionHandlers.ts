
import React, { useCallback } from 'react';
import { Node, NodeTypeDefinition, CanvasSnapshot, Connection as Types_Connection, ProgramInterfaceDisplayItem, PortDataType, NodePort } from '../../types'; // Renamed imports, Added ProgramInterfaceDisplayItem, PortDataType, NodePort
import { ConnectionPortIdentifier as Types_ConnectionPortIdentifier } from '../connections/types/connectionTypes'; // Direct import
import { HistoryActionType, HistoryEntryNodeActionTarget } from '../history/historyTypes';
import { useNodeManager } from '../nodes/hooks/useNodeManager'; // For ReturnType
import { useConnectionManager } from '../connections/hooks/useConnectionManager'; // For ReturnType
import { useClipboard } from '../clipboard/useClipboard'; // For ReturnType
import * as clipboardManager from '../clipboard/clipboardManager';
import { WorkflowHistoryManagerOutput } from '../history/useWorkflowHistoryManager';
import { ClipboardItemNodeData } from '../clipboard/clipboardTypes'; // Import for type casting if needed
import { MovedNodeInfo } from '../nodes/hooks/useNodeDraggingOnCanvas';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../nodes/SubworkflowOutput/Definition';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils'; 
import { HEADER_HEIGHT } from '../../components/renderingConstants';


interface UseWorkflowActionHandlersProps {
  nodeManager: ReturnType<typeof useNodeManager>;
  connectionManager: ReturnType<typeof useConnectionManager>;
  clipboardControls: ReturnType<typeof useClipboard>;
  workflowHistoryManager: WorkflowHistoryManagerOutput;
  pan: { x: number; y: number };
  scale: number;
  getCanvasBoundingClientRect: () => DOMRect | null;
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined;
  activeTabId: string | null; 
}

export const useWorkflowActionHandlers = ({
  nodeManager,
  connectionManager,
  clipboardControls,
  workflowHistoryManager,
  pan,
  scale,
  getCanvasBoundingClientRect,
  getNodeDefinition,
  activeTabId, 
}: UseWorkflowActionHandlersProps) => {
  const { selectedNodeIds, nodes: allManagedNodes, addNode: nmAddNode, deleteNodeCompletely: nmDeleteNodeCompletely, selectNode: nmSelectNode, updateNodeData: nmUpdateNodeData, updateNodesWithNewProperties: nmUpdateNodesWithNewProperties } = nodeManager; // Destructure states, Added nmUpdateNodeData and nmUpdateNodesWithNewProperties

  const appHandleNodeMoveEnd = useCallback((movedNodes: MovedNodeInfo[]) => {
    if (movedNodes.length === 0) return;

    if (movedNodes.length === 1) {
      const singleNode = movedNodes[0];
      workflowHistoryManager.commitHistoryAction(HistoryActionType.MOVE_NODE, { 
        nodeId: singleNode.nodeId, 
        fromX: singleNode.oldX, 
        fromY: singleNode.oldY,
      });
    } else {
      const historyNodeTargets: HistoryEntryNodeActionTarget[] = movedNodes.map(info => ({
        nodeId: info.nodeId,
        nodeType: info.nodeType,
        nodeTitle: info.nodeTitle,
        fromX: info.oldX,
        fromY: info.oldY,
        newX: info.newX,
        newY: info.newY,
      }));
      workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_MOVE, { 
        movedNodesInfo: historyNodeTargets 
      });
    }
  }, [workflowHistoryManager]);

  const appOrchestrationAddNode = useCallback((
    typeKey?: string,
    position?: { x: number; y: number },
    existingNodeData?: Partial<Node>,
    skipSelectionDuringAdd?: boolean 
  ) => {
    const newNode = nmAddNode(typeKey, position, existingNodeData, skipSelectionDuringAdd); 
    return newNode;
  }, [nmAddNode]);

  const appOrchestrationAddConnection = useCallback((connectionData: Types_Connection) => {
    const newConnection = connectionManager.completeConnection(connectionData.source, connectionData.target);
    if (newConnection) {
      workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_CONNECTION, {
          connectionId: newConnection.id,
          sourceNodeId: newConnection.source.nodeId,
          sourcePortId: newConnection.source.portId,
          sourceNodeTitle: allManagedNodes.find(n => n.id === newConnection.source.nodeId)?.title,
          targetNodeId: newConnection.target.nodeId,
          targetPortId: newConnection.target.portId,
          targetNodeTitle: allManagedNodes.find(n => n.id === newConnection.target.nodeId)?.title,
      });
    }
    return newConnection;
  }, [connectionManager, workflowHistoryManager, allManagedNodes]);


  const appOrchestrationAddNodeAtPosition = useCallback((worldX: number, worldY: number) => {
    if (activeTabId === null) return; 
    if (!nodeManager.nodeTypeToPlace) return;
    const nodeDefinition = getNodeDefinition(nodeManager.nodeTypeToPlace);
    if (!nodeDefinition) return;

    const newNode = appOrchestrationAddNode(nodeManager.nodeTypeToPlace, { x: worldX, y: worldY });
    
    if (newNode) {
        workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_NODE, {
            newNodeId: newNode.id, 
            newNodeType: newNode.type, 
            newNodeTitle: newNode.title,
            committedNewNodeInstance: JSON.parse(JSON.stringify(newNode)),
        });
    }
  }, [activeTabId, nodeManager.nodeTypeToPlace, getNodeDefinition, appOrchestrationAddNode, workflowHistoryManager]);


  const appOrchestrationAddNodeOnDrop = useCallback((nodeTypeKey: string, x: number, y: number, overrideData?: Partial<Node>) => {
    if (activeTabId === null) return;
    const newNode = appOrchestrationAddNode(nodeTypeKey, { x, y }, overrideData);
    if (newNode) {
        workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_NODE, {
            newNodeId: newNode.id, 
            newNodeType: newNode.type, 
            newNodeTitle: newNode.title,
            committedNewNodeInstance: JSON.parse(JSON.stringify(newNode)),
        });
    }
  }, [activeTabId, appOrchestrationAddNode, workflowHistoryManager]);

  const completeConnectionAndCommit = useCallback((source: Types_ConnectionPortIdentifier, target: Types_ConnectionPortIdentifier) => {
    appOrchestrationAddConnection({ 
        id: '', 
        source, 
        target, 
        color: '' 
    });
  }, [appOrchestrationAddConnection]);

  const appHandleCopyNode = useCallback((nodeIdFromContextMenu?: string) => {
    const currentGlobalSelectedIds = [...selectedNodeIds]; 
    let nodesToProcessIds: string[] = [];

    if (nodeIdFromContextMenu) {
      if (currentGlobalSelectedIds.includes(nodeIdFromContextMenu) && currentGlobalSelectedIds.length > 1) {
        nodesToProcessIds = currentGlobalSelectedIds;
      } else {
        const node = allManagedNodes.find(n => n.id === nodeIdFromContextMenu);
        if (node) {
          nodesToProcessIds = [node.id];
        }
      }
    } else if (currentGlobalSelectedIds.length > 0) {
      nodesToProcessIds = currentGlobalSelectedIds;
    }

    if (nodesToProcessIds.length > 0) {
      const nodesDetails = nodesToProcessIds.map(id => {
        const n = allManagedNodes.find(node => node.id === id);
        return n ? { nodeId: n.id, nodeType: n.type, nodeTitle: n.title } : null;
      }).filter(Boolean) as HistoryEntryNodeActionTarget[];

      if (nodesDetails.length > 0) {
        if (nodesDetails.length > 1) {
          workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_COPY, {
            copiedNodesInfo: nodesDetails
          });
        } else {
          workflowHistoryManager.commitHistoryAction(HistoryActionType.COPY_NODE, nodesDetails[0]);
        }
        clipboardManager.handleCopy(nodesToProcessIds, allManagedNodes, connectionManager.connections, clipboardControls);
      }
    }
  }, [selectedNodeIds, allManagedNodes, connectionManager.connections, clipboardControls, workflowHistoryManager]);

  const appHandleCutNode = useCallback((nodeIdFromContextMenu?: string) => {
    const currentGlobalSelectedIds = [...selectedNodeIds]; 
    let nodesToProcessIds: string[] = [];

    if (nodeIdFromContextMenu) {
      if (currentGlobalSelectedIds.includes(nodeIdFromContextMenu) && currentGlobalSelectedIds.length > 1) {
        nodesToProcessIds = currentGlobalSelectedIds;
      } else {
        const node = allManagedNodes.find(n => n.id === nodeIdFromContextMenu);
        if (node) {
          nodesToProcessIds = [node.id];
        }
      }
    } else if (currentGlobalSelectedIds.length > 0) {
      nodesToProcessIds = currentGlobalSelectedIds;
    }
    
    if (nodesToProcessIds.length > 0) {
      const nodesDetailsForHistory = nodesToProcessIds.map(id => {
        const n = allManagedNodes.find(node => node.id === id);
        return n ? { nodeId: n.id, nodeType: n.type, nodeTitle: n.title } : null;
      }).filter(Boolean) as HistoryEntryNodeActionTarget[];
      
      const result = clipboardManager.handleCut(nodesToProcessIds, allManagedNodes, connectionManager.connections, clipboardControls);
      
      if (result.success && nodesDetailsForHistory.length > 0) {
        if (nodesDetailsForHistory.length > 1) {
           workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_CUT, {
            cutNodesInfo: nodesDetailsForHistory
          });
        } else {
           workflowHistoryManager.commitHistoryAction(HistoryActionType.CUT_NODE, nodesDetailsForHistory[0]);
        }

        if (result.connectionIdsToDelete.length > 0) {
            result.connectionIdsToDelete.forEach(connId => {
                 const connToDelete = connectionManager.connections.find(c => c.id === connId);
                 if (connToDelete) {
                    connectionManager.deleteConnection(connId); 
                 }
            });
        }
        if (result.nodeIdsToDelete.length > 0) {
            result.nodeIdsToDelete.forEach(id => {
                nmDeleteNodeCompletely(id);
            });
        }
      }
    }
  }, [selectedNodeIds, allManagedNodes, connectionManager, clipboardControls, workflowHistoryManager, nmDeleteNodeCompletely]);

  const appHandlePasteNode = useCallback((worldX?: number, worldY?: number) => {
    let pasteAnchorX = worldX;
    let pasteAnchorY = worldY;

    if (pasteAnchorX === undefined || pasteAnchorY === undefined) {
      const rect = getCanvasBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        pasteAnchorX = (rect.width / 2 - pan.x) / scale;
        pasteAnchorY = (rect.height / 2 - pan.y) / scale;
      } else { 
        pasteAnchorX = 100; 
        pasteAnchorY = 100;
      }
    }
    
    const pasteResult = clipboardManager.handlePaste(clipboardControls, pasteAnchorX, pasteAnchorY);
    const newlyPastedNodeIds: string[] = [];
    const pastedNodesHistoryInfo: HistoryEntryNodeActionTarget[] = [];
    
    if (pasteResult) {
      pasteResult.nodesToCreate.forEach(item => {
        const addedNode = appOrchestrationAddNode(undefined, undefined, item.nodeWithNewId, true); 
        
        if (addedNode) {
            newlyPastedNodeIds.push(addedNode.id);
            pastedNodesHistoryInfo.push({
                nodeId: item.nodeWithNewId.id!, 
                nodeType: addedNode.type,
                nodeTitle: addedNode.title,
                originalId: item.originalNodeData.originalId,
                originalNodeType: item.originalNodeData.type, 
                originalNodeTitle: item.originalNodeData.title,
                toX: item.newPosition.x,
                toY: item.newPosition.y,
            });
        }
      });
      pasteResult.connectionsToCreate.forEach(conn => {
        appOrchestrationAddConnection(conn); 
      });

      if (pastedNodesHistoryInfo.length > 1) {
        workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_PASTE, {
            pastedNodesInfo: pastedNodesHistoryInfo,
            pasteAnchorX: pasteAnchorX,
            pasteAnchorY: pasteAnchorY,
        });
      } else if (pastedNodesHistoryInfo.length === 1) {
         const singlePasted = pastedNodesHistoryInfo[0];
         const originalNodeDataFromClipboard = pasteResult.nodesToCreate.find(item => item.nodeWithNewId.id === singlePasted.nodeId)?.originalNodeData;
         workflowHistoryManager.commitHistoryAction(HistoryActionType.PASTE_NODE, {
            newNodeId: singlePasted.nodeId,
            originalNodeId: singlePasted.originalId,
            originalNodeTitle: originalNodeDataFromClipboard?.title, 
            originalNodeType: originalNodeDataFromClipboard?.type,
            pastePositionX: singlePasted.toX,
            pastePositionY: singlePasted.toY,
         });
      }

      if (newlyPastedNodeIds.length > 0) {
        nmSelectNode(newlyPastedNodeIds[0], false); 
        for (let i = 1; i < newlyPastedNodeIds.length; i++) {
          nmSelectNode(newlyPastedNodeIds[i], true); 
        }
      }
    }
  }, [clipboardControls, pan, scale, getCanvasBoundingClientRect, appOrchestrationAddNode, appOrchestrationAddConnection, workflowHistoryManager, nmSelectNode]);


  const appHandleDelete = useCallback((
    idsArg?: { nodeId?: string; connectionId?: string },
    menuTargetId?: string 
  ) => {
    const currentGlobalSelectedIds = [...selectedNodeIds]; 
    const currentNodesFromHook = [...allManagedNodes]; 

    if (menuTargetId) { 
      const nodeTargetFromMenu = idsArg?.nodeId === menuTargetId ? currentNodesFromHook.find(n => n.id === menuTargetId) : null;
      const connectionTargetFromMenu = idsArg?.connectionId === menuTargetId ? connectionManager.connections.find(c => c.id === menuTargetId) : null;

      if (nodeTargetFromMenu && currentGlobalSelectedIds.includes(menuTargetId) && currentGlobalSelectedIds.length > 1) {
        const nodesToDeleteDetails: HistoryEntryNodeActionTarget[] = [];
        currentGlobalSelectedIds.forEach(nodeId => {
          const node = currentNodesFromHook.find(n => n.id === nodeId);
          if (node) {
            nodesToDeleteDetails.push({ nodeId: node.id, nodeType: node.type, nodeTitle: node.title });
          }
        });

        const selectedNodeIdSet = new Set(currentGlobalSelectedIds);
        const connectionsAssociatedWithSelectedNodes = connectionManager.connections.filter(
            conn => selectedNodeIdSet.has(conn.source.nodeId) || selectedNodeIdSet.has(conn.target.nodeId)
        );
        connectionsAssociatedWithSelectedNodes.forEach(conn => connectionManager.deleteConnection(conn.id));
        
        workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_DELETE, {
          deletedNodesInfo: nodesToDeleteDetails
        });
        
        currentGlobalSelectedIds.forEach(nodeId => {
          nmDeleteNodeCompletely(nodeId);
        });

      } else if (nodeTargetFromMenu) {
        const connectionsToDelete = connectionManager.connections.filter(
            c => c.source.nodeId === menuTargetId || c.target.nodeId === menuTargetId
        );
        connectionsToDelete.forEach(conn => connectionManager.deleteConnection(conn.id));
        
        workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_NODE, {
          nodeId: nodeTargetFromMenu.id, nodeType: nodeTargetFromMenu.type, nodeTitle: nodeTargetFromMenu.title
        });
        nmDeleteNodeCompletely(menuTargetId);

      } else if (connectionTargetFromMenu) {
        const sourceNode = currentNodesFromHook.find(n => n.id === connectionTargetFromMenu.source.nodeId);
        const targetNode = currentNodesFromHook.find(n => n.id === connectionTargetFromMenu.target.nodeId);
        workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_CONNECTION, {
          connectionId: connectionTargetFromMenu.id,
          sourceNodeId: connectionTargetFromMenu.source.nodeId, sourcePortId: connectionTargetFromMenu.source.portId, sourceNodeTitle: sourceNode?.title,
          targetNodeId: connectionTargetFromMenu.target.nodeId, targetPortId: connectionTargetFromMenu.target.portId, targetNodeTitle: targetNode?.title,
        });
        connectionManager.deleteConnection(menuTargetId);
      }
      return; 
    }

    if (currentGlobalSelectedIds.length > 0) {
        const nodesToDeleteDetails: HistoryEntryNodeActionTarget[] = [];
        currentGlobalSelectedIds.forEach(nodeId => {
          const node = currentNodesFromHook.find(n => n.id === nodeId);
          if (node) {
            nodesToDeleteDetails.push({ nodeId: node.id, nodeType: node.type, nodeTitle: node.title });
          }
        });

        const selectedNodeIdSet = new Set(currentGlobalSelectedIds);
        const connectionsAssociatedWithSelectedNodes = connectionManager.connections.filter(
            conn => selectedNodeIdSet.has(conn.source.nodeId) || selectedNodeIdSet.has(conn.target.nodeId)
        );
        connectionsAssociatedWithSelectedNodes.forEach(conn => connectionManager.deleteConnection(conn.id)); 
        
        if (nodesToDeleteDetails.length > 1) {
          workflowHistoryManager.commitHistoryAction(HistoryActionType.MULTI_NODE_DELETE, {
            deletedNodesInfo: nodesToDeleteDetails
          });
        } else if (nodesToDeleteDetails.length === 1) {
          workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_NODE, nodesToDeleteDetails[0]);
        }
        
        currentGlobalSelectedIds.forEach(nodeId => {
          nmDeleteNodeCompletely(nodeId);
        });

    } else if (connectionManager.selectedConnectionId) { 
        const connToDelete = connectionManager.connections.find(c => c.id === connectionManager.selectedConnectionId);
        if (connToDelete) {
          const sourceNode = currentNodesFromHook.find(n => n.id === connToDelete.source.nodeId);
          const targetNode = currentNodesFromHook.find(n => n.id === connToDelete.target.nodeId);
          workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_CONNECTION, {
            connectionId: connToDelete.id,
            sourceNodeId: connToDelete.source.nodeId, sourcePortId: connToDelete.source.portId, sourceNodeTitle: sourceNode?.title,
            targetNodeId: connToDelete.target.nodeId, targetPortId: connToDelete.target.portId, targetNodeTitle: targetNode?.title,
          });
          connectionManager.deleteConnection(connectionManager.selectedConnectionId);
        }
    }
  }, [selectedNodeIds, allManagedNodes, connectionManager, workflowHistoryManager, nmDeleteNodeCompletely]);

  const appOrchestrationUpdateProgramInterfaceName = useCallback((
    originalItem: ProgramInterfaceDisplayItem,
    newName: string
  ) => {
    const nodesToUpdateDetails: Array<{ nodeId: string; oldName: string; newName: string; dataType: PortDataType }> = [];
    const nodesUpdatePayload: Array<{ nodeId: string; updates: Partial<Node> }> = [];


    allManagedNodes.forEach(node => {
      const nodeTypeMatches = (originalItem.nodeType === 'input' && node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY) ||
                              (originalItem.nodeType === 'output' && node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY);
      
      if (nodeTypeMatches) {
        const currentPortName = node.data?.portName;
        const currentPortDataType = node.data?.portDataType;

        if (currentPortName === originalItem.name && currentPortDataType === (originalItem.originalDataType || originalItem.dataType)) {
          const dataUpdates = { ...node.data, portName: newName };
          nodesUpdatePayload.push({ nodeId: node.id, updates: { data: dataUpdates } });
          nodesToUpdateDetails.push({ nodeId: node.id, oldName: originalItem.name, newName, dataType: currentPortDataType });
        }
      }
    });

    if (nodesUpdatePayload.length > 0) {
      nmUpdateNodesWithNewProperties(nodesUpdatePayload);
      workflowHistoryManager.commitHistoryAction(HistoryActionType.UPDATE_SUBWORKFLOW_INTERFACE_NAME, {
        interfaceType: originalItem.nodeType,
        interfaceName: originalItem.name, // Use the original name for grouping in history
        oldName: originalItem.name,
        newName: newName,
        dataType: originalItem.dataType, // Use current dataType for description
        affectedNodeIds: nodesToUpdateDetails.map(d => d.nodeId), 
      });
    }
  }, [allManagedNodes, nmUpdateNodesWithNewProperties, workflowHistoryManager]);

  const appOrchestrationUpdateProgramInterfaceDetails = useCallback((
    originalItem: ProgramInterfaceDisplayItem,
    updates: { dataType?: PortDataType; isPortRequired?: boolean }
  ) => {
    const nodePropertyUpdates: Array<{ nodeId: string; updates: Partial<Node> }> = [];
    const affectedNodeIds: string[] = [];
    const historyDetails: any = {
      interfaceType: originalItem.nodeType,
      interfaceName: originalItem.name,
      updatedProperties: {},
      affectedNodeIds: [],
    };
    
    let firstNodeUpdated = false;

    allManagedNodes.forEach(node => {
      const nodeTypeMatches = (originalItem.nodeType === 'input' && node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY) ||
                              (originalItem.nodeType === 'output' && node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY);

      if (nodeTypeMatches) {
        const currentPortName = node.data?.portName;
        // Use originalDataType from the display item for robust matching if it exists, otherwise current dataType
        const itemMatchDataType = originalItem.originalDataType || originalItem.dataType;

        if (currentPortName === originalItem.name && node.data?.portDataType === itemMatchDataType) {
          const singleNodeUpdates: Partial<Node> = {};
          const newData = { ...node.data };
          let portsChanged = false;

          if (updates.dataType !== undefined && updates.dataType !== node.data?.portDataType) {
            if (!firstNodeUpdated) { // Log old/new for history only once
              historyDetails.updatedProperties.dataType = { old: node.data?.portDataType, new: updates.dataType };
            }
            newData.portDataType = updates.dataType;
            portsChanged = true;
          }
          if (updates.isPortRequired !== undefined && updates.isPortRequired !== node.data?.isPortRequired) {
             if (!firstNodeUpdated) {
              historyDetails.updatedProperties.isPortRequired = { old: node.data?.isPortRequired, new: updates.isPortRequired };
            }
            newData.isPortRequired = updates.isPortRequired;
            portsChanged = true;
          }

          singleNodeUpdates.data = newData;

          // Update actual node ports
          const finalDataType = newData.portDataType || node.data?.portDataType;
          const finalIsRequired = newData.isPortRequired !== undefined ? newData.isPortRequired : node.data?.isPortRequired;
          const newShape: 'circle' | 'diamond' = (finalIsRequired && finalDataType !== PortDataType.FLOW) ? 'diamond' : 'circle';

          if (originalItem.nodeType === 'input' && node.outputs.length > 0) {
            const newOutputs: NodePort[] = [{ ...node.outputs[0], dataType: finalDataType, shape: newShape }];
            if(JSON.stringify(node.outputs) !== JSON.stringify(newOutputs)) {
              singleNodeUpdates.outputs = newOutputs;
              portsChanged = true;
            }
          } else if (originalItem.nodeType === 'output' && node.inputs.length > 0) {
            const newInputs: NodePort[] = [{ ...node.inputs[0], dataType: finalDataType, shape: newShape }];
             if(JSON.stringify(node.inputs) !== JSON.stringify(newInputs)) {
                singleNodeUpdates.inputs = newInputs;
                portsChanged = true;
            }
          }
          
          if (portsChanged) { // Only recalculate height if data affecting ports changed
            singleNodeUpdates.height = calculateNodeHeight(
              singleNodeUpdates.inputs || node.inputs,
              singleNodeUpdates.outputs || node.outputs,
              HEADER_HEIGHT,
              node.customContentHeight,
              node.customContentTitle
            );
          }
          
          if (Object.keys(singleNodeUpdates).length > 0) {
            nodePropertyUpdates.push({ nodeId: node.id, updates: singleNodeUpdates });
            affectedNodeIds.push(node.id);
            if (!firstNodeUpdated) firstNodeUpdated = true;
          }
        }
      }
    });

    if (nodePropertyUpdates.length > 0) {
      nmUpdateNodesWithNewProperties(nodePropertyUpdates);
      historyDetails.affectedNodeIds = affectedNodeIds;
      workflowHistoryManager.commitHistoryAction(HistoryActionType.UPDATE_SUBWORKFLOW_INTERFACE_DETAILS, historyDetails);
    }
  }, [allManagedNodes, nmUpdateNodesWithNewProperties, workflowHistoryManager]);


  return {
    appHandleNodeMoveEnd,
    appOrchestrationAddNode,
    appOrchestrationAddNodeAtPosition,
    appOrchestrationAddNodeOnDrop,
    completeConnectionAndCommit,
    appHandleCopyNode,
    appHandleCutNode,
    appHandlePasteNode,
    appHandleDelete,
    appOrchestrationAddConnection, 
    appOrchestrationUpdateProgramInterfaceName, 
    appOrchestrationUpdateProgramInterfaceDetails, // New handler
  };
};
