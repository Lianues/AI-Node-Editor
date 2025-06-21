import { NodePort } from '../../../types'; // Assuming NodePort type from global types

// Represents the definitional content of a node within a group
// Does NOT store original node.id or node.executionState
export interface NodeGroupContentNode {
  internalId: string; // Unique ID within this group's content
  type: string;
  title: string;
  x: number; // Original absolute x, for relative positioning later
  y: number; // Original absolute y
  width: number;
  height: number;
  inputs: NodePort[]; // Deep cloned
  outputs: NodePort[]; // Deep cloned
  headerColor: string;
  bodyColor: string;
  data?: Record<string, any>; // Deep cloned
  customContentHeight?: number;
  customContentTitle?: string;
}

// Represents an internal connection within a group, using internalNodeIds
// Does NOT store original connection.id
export interface NodeGroupContentConnection {
  sourceInternalNodeId: string;
  targetInternalNodeId: string;
  sourcePortId: string;
  targetPortId: string;
  color?: string;
}

// Represents a saved node group in the library
export interface NodeGroupItem {
  id: string;
  name: string;
  description?: string;
  nodeCount: number; // Number of nodes in the group
  connectionCount: number; // Number of internal connections
  content: {
    nodes: NodeGroupContentNode[];
    connections: NodeGroupContentConnection[];
    sourceBoundingBox: { // Bounding box of the original selected nodes
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    };
  };
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
