
import { useState, useCallback, useMemo } from 'react';
import { Node, Connection } from '../../types'; // Added Connection
import { ClipboardState, ClipboardContent, ClipboardItemNodeData } from './clipboardTypes';

export const useClipboard = () => {
  const [clipboard, setClipboard] = useState<ClipboardState>({
    clipboardContent: null,
  });

  const copyNodesToClipboard = useCallback((
    nodesToCopy: Node[],
    internalConnectionsToCopy: Connection[],
    groupBoundingBoxToCopy: ClipboardContent['groupBoundingBox']
  ) => {
    const clonedNodes: ClipboardItemNodeData[] = nodesToCopy.map(node => ({
      ...JSON.parse(JSON.stringify(node)),
      originalId: node.id, // Store original ID
    }));
    const clonedConnections: Connection[] = internalConnectionsToCopy.map(conn => JSON.parse(JSON.stringify(conn)));

    setClipboard({
      clipboardContent: {
        nodes: clonedNodes,
        internalConnections: clonedConnections,
        groupBoundingBox: groupBoundingBoxToCopy,
        isCutOperation: false,
      }
    });
  }, []);

  const cutNodesToClipboard = useCallback((
    nodesToCut: Node[],
    internalConnectionsToCut: Connection[],
    groupBoundingBoxToCut: ClipboardContent['groupBoundingBox']
  ) => {
    const clonedNodes: ClipboardItemNodeData[] = nodesToCut.map(node => ({
      ...JSON.parse(JSON.stringify(node)),
      originalId: node.id,
    }));
    const clonedConnections: Connection[] = internalConnectionsToCut.map(conn => JSON.parse(JSON.stringify(conn)));
    
    setClipboard({
      clipboardContent: {
        nodes: clonedNodes,
        internalConnections: clonedConnections,
        groupBoundingBox: groupBoundingBoxToCut,
        isCutOperation: true,
      }
    });
  }, []);

  const getPasteData = useCallback((): ClipboardContent | null => {
    if (!clipboard.clipboardContent) return null;
    
    // Return a deep copy of the content for pasting
    const contentToPaste: ClipboardContent = JSON.parse(JSON.stringify(clipboard.clipboardContent));
    
    // If it was a "cut" operation, clear the clipboard to ensure cut items are only pasted once.
    if (clipboard.clipboardContent.isCutOperation) {
      setClipboard({ clipboardContent: null });
    }
    return contentToPaste;
  }, [clipboard.clipboardContent]);

  const canPaste = useMemo(() => !!clipboard.clipboardContent && clipboard.clipboardContent.nodes.length > 0, [clipboard.clipboardContent]);

  return {
    clipboardContent: clipboard.clipboardContent,
    isCutOperation: clipboard.clipboardContent?.isCutOperation || false,
    copyNodesToClipboard,
    cutNodesToClipboard,
    getPasteData,
    canPaste,
  };
};
