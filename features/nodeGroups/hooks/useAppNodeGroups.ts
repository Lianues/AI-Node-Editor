

import { useState, useCallback } from 'react';
import { NodeGroupItem, NodeGroupContentNode, NodeGroupContentConnection } from '../types/nodeGroupTypes';
import { Node, NodeTypeDefinition, WorkflowServices, DefinedArea } from '../../../types'; // Added WorkflowServices, DefinedArea
import { Connection } from '../../connections/types/connectionTypes';
import { getPortColorByDataType } from '../../connections/utils/connectionUtils';
import { HistoryActionType, HistoryEntryNodeActionTarget } from '../../history/historyTypes';
import { WorkflowHistoryManagerOutput }  from '../../history/useWorkflowHistoryManager';
// Removed direct import of NodeManagerAccess, ConnectionManagerAccess as they are complex
import { AppUIManagerOutput } from '../../../hooks/useAppUIManager';
import { SidebarItemId } from '../../../types';
import { WorkflowExecutionManager } from '../../execution/WorkflowExecutionManager'; // For type if needed

// Define a more specific type for what nodeManagerHook prop expects within useAppNodeGroups
export interface NodeManagerAccessForNodeGroups {
  getNodes: () => Node[]; // Changed to getter
  getSelectedNodeIds: () => string[]; // Changed to getter
  addNode: (nodeTypeKey?: string, position?: { x: number; y: number }, existingNodeData?: Partial<Node>, skipSelection?: boolean) => Node | null;
  selectNode: (id: string | null, shiftKey?: boolean) => void;
}

const NODE_GROUP_AREA_PADDING = 20; // Padding for the auto-created area


export interface UseAppNodeGroupsProps {
  nodeManagerHook: NodeManagerAccessForNodeGroups; // Use the more specific type
  connectionManagerHookRef: React.MutableRefObject<{
    connections: Connection[]; // Stays as direct property access
    setConnectionsDirectly: (connections: Connection[]) => void;
  } | null>;
  workflowHistoryManager: WorkflowHistoryManagerOutput;
  appUIManager: AppUIManagerOutput;
  getNodeDefinitionProp: (type: string) => NodeTypeDefinition | undefined;
  executionManager?: WorkflowExecutionManager;
  workflowServices?: WorkflowServices;
  shouldCreateAreaOnGroupDrop: boolean; // New prop
  addAreaAndCommit: ( // New prop for creating defined area
    worldRect: { x: number; y: number; width: number; height: number; },
    title: string
  ) => DefinedArea | null;
}

export const useAppNodeGroups = ({
  nodeManagerHook,
  connectionManagerHookRef,
  workflowHistoryManager,
  appUIManager,
  getNodeDefinitionProp,
  shouldCreateAreaOnGroupDrop, // Destructure new prop
  addAreaAndCommit,         // Destructure new prop
}: UseAppNodeGroupsProps) => {
  const [nodeGroups, setNodeGroups] = useState<NodeGroupItem[]>([]);
  const [isCreatingNodeGroup, setIsCreatingNodeGroup] = useState(false);
  const [pendingNodeGroupName, setPendingNodeGroupName] = useState("");

  const handleCreateNodeGroup = useCallback((_event?: any, effectiveSelectedIdsOverride?: string[]) => {
    const idsForGroup = effectiveSelectedIdsOverride || nodeManagerHook.getSelectedNodeIds();

    if (idsForGroup.length === 0) {
      if (!effectiveSelectedIdsOverride) {
        alert("请先选择要组合的节点。");
      }
      return;
    }
    setIsCreatingNodeGroup(true);
    setPendingNodeGroupName("新的节点组");
    appUIManager.setActiveSidebarItemOptimized(SidebarItemId.NodeGroupLibrary);
  }, [nodeManagerHook, appUIManager]); // Updated dependency

  const handleSaveNodeGroup = useCallback((name: string) => {
    if (!name.trim()) {
      alert("节点组名称不能为空。");
      return;
    }

    const selectedNodeOriginalIds = nodeManagerHook.getSelectedNodeIds(); // Use getter
    const allNodesOnCanvas = nodeManagerHook.getNodes(); // Use getter
    const allConnectionsOnCanvas = connectionManagerHookRef.current?.connections || [];

    const nodesToGroup = allNodesOnCanvas.filter(n => selectedNodeOriginalIds.includes(n.id));

    if (nodesToGroup.length === 0) {
      alert("没有有效的选定节点来创建组。");
      setIsCreatingNodeGroup(false);
      setPendingNodeGroupName("");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodesToGroup.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    const sourceBoundingBox = {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY,
    };

    const nodeGroupContentNodes: NodeGroupContentNode[] = [];
    const nodeIdToInternalIdMap = new Map<string, string>();

    nodesToGroup.forEach((node, index) => {
      const internalId = `groupnode_${index}_${Date.now()}`;
      nodeIdToInternalIdMap.set(node.id, internalId);

      nodeGroupContentNodes.push({
        internalId,
        type: node.type,
        title: node.title,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        inputs: JSON.parse(JSON.stringify(node.inputs)),
        outputs: JSON.parse(JSON.stringify(node.outputs)),
        headerColor: node.headerColor,
        bodyColor: node.bodyColor,
        data: node.data ? JSON.parse(JSON.stringify(node.data)) : {},
        customContentHeight: node.customContentHeight,
        customContentTitle: node.customContentTitle,
      });
    });

    const nodeGroupContentConnections: NodeGroupContentConnection[] = [];
    const selectedNodeIdSet = new Set(selectedNodeOriginalIds);

    allConnectionsOnCanvas.forEach(conn => {
      if (selectedNodeIdSet.has(conn.source.nodeId) && selectedNodeIdSet.has(conn.target.nodeId)) {
        const sourceInternalId = nodeIdToInternalIdMap.get(conn.source.nodeId);
        const targetInternalId = nodeIdToInternalIdMap.get(conn.target.nodeId);

        if (sourceInternalId && targetInternalId) {
          nodeGroupContentConnections.push({
            sourceInternalNodeId: sourceInternalId,
            targetInternalNodeId: targetInternalId,
            sourcePortId: conn.source.portId,
            targetPortId: conn.target.portId,
            color: conn.color,
          });
        }
      }
    });

    const newGroupId = `nodegroup_${Date.now()}`;
    const newNodeGroup: NodeGroupItem = {
      id: newGroupId,
      name: name.trim(),
      description: "",
      nodeCount: nodeGroupContentNodes.length,
      connectionCount: nodeGroupContentConnections.length,
      content: {
        nodes: nodeGroupContentNodes,
        connections: nodeGroupContentConnections,
        sourceBoundingBox,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNodeGroups(prev => [newNodeGroup, ...prev]); // Changed to add to the beginning
    workflowHistoryManager.commitHistoryAction(HistoryActionType.CREATE_NODE_GROUP, {
      nodeGroupId: newGroupId,
      nodeGroupName: name.trim(),
      nodeIdsInGroup: [...selectedNodeOriginalIds],
    });

    setIsCreatingNodeGroup(false);
    setPendingNodeGroupName("");

  }, [
    nodeManagerHook, // Updated dependency
    connectionManagerHookRef,
    workflowHistoryManager
  ]);

  const handleCancelCreateNodeGroup = useCallback(() => {
    setIsCreatingNodeGroup(false);
    setPendingNodeGroupName("");
  }, []);

  const handleDropNodeGroupOntoCanvas = useCallback((nodeGroupId: string, dropX: number, dropY: number): { createdNodes: Node[], groupName: string } | null => {
    const groupToDrop = nodeGroups.find(g => g.id === nodeGroupId);
    if (!groupToDrop) {
      console.warn(`Node group with ID ${nodeGroupId} not found for dropping.`);
      return null;
    }

    const { content } = groupToDrop;
    const { nodes: groupNodesContent, connections: groupConnectionsContent, sourceBoundingBox } = content;

    const anchorX = dropX;
    const anchorY = dropY;
    const originalGroupCenterX = sourceBoundingBox.minX + sourceBoundingBox.width / 2;
    const originalGroupCenterY = sourceBoundingBox.minY + sourceBoundingBox.height / 2;

    const nodeIdMap: Record<string, string> = {};
    const nodesToCreateOnCanvas: Node[] = [];
    const connectionsToCreateOnCanvas: Connection[] = [];
    const historyNodeTargets: HistoryEntryNodeActionTarget[] = [];

    groupNodesContent.forEach(nodeContent => {
      const nodeDefinition = getNodeDefinitionProp(nodeContent.type);
      if (!nodeDefinition) {
        console.warn(`Definition not found for node type: ${nodeContent.type} in node group ${groupToDrop.name}`);
        return;
      }

      const newCanvasNodeId = `${nodeDefinition.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      nodeIdMap[nodeContent.internalId] = newCanvasNodeId;

      const newNodeX = anchorX + (nodeContent.x - originalGroupCenterX);
      const newNodeY = anchorY + (nodeContent.y - originalGroupCenterY);

      const resolvedCustomContentHeight = nodeContent.customContentHeight ?? nodeDefinition.customContentHeight ?? 0;
      const resolvedCustomContentTitle = nodeContent.customContentTitle ?? nodeDefinition.customContentTitle;

      const newNode: Node = {
        id: newCanvasNodeId,
        type: nodeContent.type,
        title: nodeContent.title,
        x: newNodeX,
        y: newNodeY,
        width: nodeContent.width,
        height: nodeContent.height,
        inputs: JSON.parse(JSON.stringify(nodeContent.inputs)),
        outputs: JSON.parse(JSON.stringify(nodeContent.outputs)),
        headerColor: nodeContent.headerColor,
        bodyColor: nodeContent.bodyColor,
        data: nodeContent.data ? JSON.parse(JSON.stringify(nodeContent.data)) : {},
        customContentHeight: resolvedCustomContentHeight > 0 ? resolvedCustomContentHeight : undefined,
        customContentTitle: resolvedCustomContentTitle || undefined,
        executionState: undefined,
      };

      const addedNodeInstance = nodeManagerHook.addNode(undefined, undefined, newNode, true);
      if (addedNodeInstance) {
        nodesToCreateOnCanvas.push(addedNodeInstance);
        historyNodeTargets.push({
          nodeId: addedNodeInstance.id,
          nodeType: addedNodeInstance.type,
          nodeTitle: addedNodeInstance.title,
          toX: addedNodeInstance.x,
          toY: addedNodeInstance.y,
          originalId: nodeContent.internalId,
        });
      }
    });

    groupConnectionsContent.forEach(connContent => {
      const newSourceNodeId = nodeIdMap[connContent.sourceInternalNodeId];
      const newTargetNodeId = nodeIdMap[connContent.targetInternalNodeId];

      const sourceNodeOnCanvas = nodesToCreateOnCanvas.find(n => n.id === newSourceNodeId);
      const targetNodeOnCanvas = nodesToCreateOnCanvas.find(n => n.id === newTargetNodeId);

      if (sourceNodeOnCanvas && targetNodeOnCanvas) {
        const sourcePortDef = sourceNodeOnCanvas.outputs.find(p => p.id === connContent.sourcePortId);
        const targetPortDef = targetNodeOnCanvas.inputs.find(p => p.id === connContent.targetPortId);

        if (sourcePortDef && targetPortDef) {
          const newConnectionId = `conn_${newSourceNodeId}:${connContent.sourcePortId}_to_${newTargetNodeId}:${connContent.targetPortId}_${Date.now()}`;
          const newConnection: Connection = {
            id: newConnectionId,
            source: { nodeId: newSourceNodeId, portId: connContent.sourcePortId, portSide: 'output', dataType: sourcePortDef.dataType },
            target: { nodeId: newTargetNodeId, portId: connContent.targetPortId, portSide: 'input', dataType: targetPortDef.dataType },
            color: connContent.color || getPortColorByDataType(sourcePortDef.dataType, 'output'),
          };
          connectionsToCreateOnCanvas.push(newConnection);
        }
      }
    });

    if (connectionsToCreateOnCanvas.length > 0 && connectionManagerHookRef.current) {
      connectionManagerHookRef.current.setConnectionsDirectly([
        ...(connectionManagerHookRef.current.connections || []), // Use direct access as per ref type
        ...connectionsToCreateOnCanvas
      ]);
    }

    if (nodesToCreateOnCanvas.length > 0) {
      nodeManagerHook.selectNode(null, false);
      nodesToCreateOnCanvas.forEach((n, idx) => {
        nodeManagerHook.selectNode(n.id, idx > 0);
      });

      workflowHistoryManager.commitHistoryAction(HistoryActionType.PASTE_NODE_GROUP, {
        nodeGroupId: groupToDrop.id,
        nodeGroupName: groupToDrop.name,
        nodeActionTargets: historyNodeTargets,
        pastePositionX: anchorX,
        pastePositionY: anchorY,
      });

      if (shouldCreateAreaOnGroupDrop && addAreaAndCommit) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesToCreateOnCanvas.forEach(node => {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x + node.width);
          maxY = Math.max(maxY, node.y + node.height);
        });

        if (minX !== Infinity) {
          const areaX = minX - NODE_GROUP_AREA_PADDING;
          const areaY = minY - NODE_GROUP_AREA_PADDING;
          const areaWidth = (maxX - minX) + (NODE_GROUP_AREA_PADDING * 2);
          const areaHeight = (maxY - minY) + (NODE_GROUP_AREA_PADDING * 2);
          addAreaAndCommit({ x: areaX, y: areaY, width: areaWidth, height: areaHeight }, groupToDrop.name);
        }
      }
      return { createdNodes: nodesToCreateOnCanvas, groupName: groupToDrop.name };
    }
    return null;
  }, [nodeGroups, getNodeDefinitionProp, nodeManagerHook, connectionManagerHookRef, workflowHistoryManager, shouldCreateAreaOnGroupDrop, addAreaAndCommit]);

  const handleDragStartNodeGroupFromLibrary = useCallback((event: React.DragEvent<HTMLDivElement>, nodeGroupId: string) => {
    event.dataTransfer.setData('application/ai-workflow-node-group-id', nodeGroupId);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const updateNodeGroupDescription = useCallback((groupId: string, newDescription: string) => {
    setNodeGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? { ...group, description: newDescription, updatedAt: new Date().toISOString() }
          : group
      )
    );
  }, []);

  const updateNodeGroupName = useCallback((groupId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert("Node group name cannot be empty.");
      return;
    }
    setNodeGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? { ...group, name: trimmedName, updatedAt: new Date().toISOString() }
          : group
      )
    );
  }, []);

  const reorderNodeGroupItem = useCallback((draggedItemId: string, targetItemId: string, position: 'before' | 'after') => {
    setNodeGroups(prevItems => {
      const newItems = [...prevItems];
      const draggedItemIndex = newItems.findIndex(item => item.id === draggedItemId);
      if (draggedItemIndex === -1) return prevItems;

      const [draggedItem] = newItems.splice(draggedItemIndex, 1);
      let targetItemIndex = newItems.findIndex(item => item.id === targetItemId);
      if (targetItemIndex === -1) return prevItems;

      if (position === 'before') {
        newItems.splice(targetItemIndex, 0, draggedItem);
      } else {
        newItems.splice(targetItemIndex + 1, 0, draggedItem);
      }
      return newItems;
    });
  }, []);


  return {
    nodeGroups,
    setNodeGroups, // Expose setter
    isCreatingNodeGroup,
    pendingNodeGroupName,
    setPendingNodeGroupName,
    handleCreateNodeGroup,
    handleSaveNodeGroup,
    handleCancelCreateNodeGroup,
    handleDropNodeGroupOntoCanvas,
    handleDragStartNodeGroupFromLibrary,
    updateNodeGroupDescription,
    updateNodeGroupName,
    reorderNodeGroupItem, // New
  };
};
