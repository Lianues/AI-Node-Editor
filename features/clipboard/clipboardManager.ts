
import { Node, Connection } from '../../types';
import { useClipboard } from './useClipboard';
import { ClipboardContent, ClipboardItemNodeData } from './clipboardTypes';

type ClipboardControls = ReturnType<typeof useClipboard>;

const PASTE_OFFSET = 20; // Fallback offset if not aligning group center

/**
 * Calculates the bounding box of a group of nodes.
 */
function calculateGroupBoundingBox(nodes: Node[]): ClipboardContent['groupBoundingBox'] {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x + n.width));
  const maxY = Math.max(...nodes.map(n => n.y + n.height));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Handles the logic for copying multiple nodes and their internal connections to the clipboard.
 */
export function handleCopy(
  nodeIds: string[],
  allNodes: Node[],
  allConnections: Connection[],
  clipboard: ClipboardControls
): boolean {
  const nodesToCopy = allNodes.filter(n => nodeIds.includes(n.id));
  if (nodesToCopy.length === 0) return false;

  const groupBoundingBox = calculateGroupBoundingBox(nodesToCopy);
  const selectedNodeIdSet = new Set(nodeIds);
  const internalConnections = allConnections.filter(
    conn => selectedNodeIdSet.has(conn.source.nodeId) && selectedNodeIdSet.has(conn.target.nodeId)
  );

  clipboard.copyNodesToClipboard(nodesToCopy, internalConnections, groupBoundingBox);
  return true;
}

/**
 * Handles the logic for cutting multiple nodes and their internal connections.
 */
export function handleCut(
  nodeIds: string[],
  allNodes: Node[],
  allConnections: Connection[],
  clipboard: ClipboardControls
): { success: boolean; nodeIdsToDelete: string[]; connectionIdsToDelete: string[] } {
  const nodesToCut = allNodes.filter(n => nodeIds.includes(n.id));
  if (nodesToCut.length === 0) {
    return { success: false, nodeIdsToDelete: [], connectionIdsToDelete: [] };
  }

  const groupBoundingBox = calculateGroupBoundingBox(nodesToCut);
  const selectedNodeIdSet = new Set(nodeIds);
  const internalConnections = allConnections.filter(
    conn => selectedNodeIdSet.has(conn.source.nodeId) && selectedNodeIdSet.has(conn.target.nodeId)
  );
  
  // Also find all connections connected to any of the cut nodes (not just internal) for deletion
  const allConnectionsToDelete = allConnections
    .filter(conn => selectedNodeIdSet.has(conn.source.nodeId) || selectedNodeIdSet.has(conn.target.nodeId))
    .map(conn => conn.id);


  clipboard.cutNodesToClipboard(nodesToCut, internalConnections, groupBoundingBox);
  return { success: true, nodeIdsToDelete: nodesToCut.map(n => n.id), connectionIdsToDelete: allConnectionsToDelete };
}

/**
 * Handles the logic for pasting nodes and their internal connections from the clipboard.
 * Aligns the center of the pasted group with the anchor point.
 */
export function handlePaste(
  clipboard: ClipboardControls,
  anchorX: number, // World X coordinate for the center of the paste
  anchorY: number  // World Y coordinate for the center of the paste
): {
  nodesToCreate: Array<{ 
    nodeWithNewId: Partial<Node>; // Contains the NEW ID and calculated x,y
    originalNodeData: ClipboardItemNodeData; // Contains originalId, title, type for history
    newPosition: { x: number; y: number }; // The calculated top-left for the new node
  }>;
  connectionsToCreate: Connection[];
} | null {
  const clipboardData = clipboard.getPasteData();
  if (!clipboardData || clipboardData.nodes.length === 0) return null;

  const { nodes: originalNodesWithMeta, internalConnections: originalInternalConnections, groupBoundingBox } = clipboardData;

  const originalGroupCenterX = groupBoundingBox.minX + groupBoundingBox.width / 2;
  const originalGroupCenterY = groupBoundingBox.minY + groupBoundingBox.height / 2;

  const nodeIdMap: Record<string, string> = {}; // Old ID -> New ID
  const nodesToCreate: Array<{ 
    nodeWithNewId: Partial<Node>; 
    originalNodeData: ClipboardItemNodeData; 
    newPosition: { x: number; y: number };
  }> = [];

  originalNodesWithMeta.forEach(nodeWithMeta => { // nodeWithMeta is ClipboardItemNodeData
    const newNodeId = `${nodeWithMeta.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    nodeIdMap[nodeWithMeta.originalId] = newNodeId; // nodeWithMeta.originalId is the true original ID

    const newNodeX = anchorX + (nodeWithMeta.x - originalGroupCenterX);
    const newNodeY = anchorY + (nodeWithMeta.y - originalGroupCenterY);
    
    const nodeDataWithNewId: Partial<Node> = {
      ...nodeWithMeta, // Spread original properties (title, type, data, etc.)
      id: newNodeId,   // Assign NEW ID
      x: newNodeX,     // Assign new X
      y: newNodeY,     // Assign new Y
      executionState: undefined, 
    };
    // originalId was part of nodeWithMeta, remove it from the final node data to be added to canvas
    delete (nodeDataWithNewId as any).originalId; 

    nodesToCreate.push({
      nodeWithNewId: nodeDataWithNewId,
      originalNodeData: nodeWithMeta, // Pass the original item which contains originalId, title, type for history
      newPosition: { x: newNodeX, y: newNodeY },
    });
  });

  const connectionsToCreate: Connection[] = originalInternalConnections.map(conn => {
    const newSourceNodeId = nodeIdMap[conn.source.nodeId];
    const newTargetNodeId = nodeIdMap[conn.target.nodeId];

    if (!newSourceNodeId || !newTargetNodeId) {
      console.warn("Could not map connection for pasted nodes, original node ID not found in map:", conn);
      return null; 
    }

    return {
      ...conn,
      id: `conn_${newSourceNodeId}:${conn.source.portId}_to_${newTargetNodeId}:${conn.target.portId}_${Date.now()}`,
      source: { ...conn.source, nodeId: newSourceNodeId },
      target: { ...conn.target, nodeId: newTargetNodeId },
    };
  }).filter(conn => conn !== null) as Connection[];

  return { nodesToCreate, connectionsToCreate };
}
