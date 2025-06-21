
import { Node, Connection } from '../../types';

// Node data stored in clipboard, augmented with its original ID for remapping during paste.
export interface ClipboardItemNodeData extends Node {
  originalId: string;
}

// Rich content stored in the clipboard
export interface ClipboardContent {
  nodes: ClipboardItemNodeData[];
  internalConnections: Connection[]; // Connections only between the copied nodes
  groupBoundingBox: { // Bounding box of the original copied group
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  isCutOperation: boolean;
}

export interface ClipboardState {
  clipboardContent: ClipboardContent | null; // Changed from clipboardNodes
}
