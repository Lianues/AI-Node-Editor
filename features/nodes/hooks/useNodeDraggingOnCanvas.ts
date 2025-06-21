import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node } from '../../../types';
import { HistoryEntryNodeActionTarget } from '../../history/historyTypes';


export interface MovedNodeInfo {
  nodeId: string;
  nodeType?: string; // Added for history description
  nodeTitle?: string; // Added for history description
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}
interface UseNodeDraggingOnCanvasProps {
  scale: number;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  onNodeMouseDownForSelection: (nodeId: string, event: React.MouseEvent<HTMLDivElement>) => void;
  isConnectionDraggingActive: boolean;
  onMultiNodeDragEnd?: (movedNodes: MovedNodeInfo[]) => void; // Changed signature
  onDragPerformed?: () => void;
  selectedNodeIds: string[]; 
  allNodes: Node[]; 
}

interface DragStartData {
  primaryNodeId: string;
  startX: number; 
  startY: number; 
  mouseStartX: number; 
  mouseStartY: number; 
  isMultiDrag: boolean;
  multiDragOffsets?: Map<string, { dx: number; dy: number }>; 
}

export const useNodeDraggingOnCanvas = ({
  scale,
  onNodeDrag,
  onNodeMouseDownForSelection,
  isConnectionDraggingActive,
  onMultiNodeDragEnd, // Changed prop name
  onDragPerformed,
  selectedNodeIds, 
  allNodes,      
}: UseNodeDraggingOnCanvasProps) => {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartDataRef = useRef<DragStartData | null>(null);
  const hasDraggedRef = useRef(false);

  const handleGlobalNodeMouseMove = useCallback((event: MouseEvent) => {
    if (!dragStartDataRef.current) return;
    
    const { primaryNodeId, startX, startY, mouseStartX, mouseStartY, isMultiDrag, multiDragOffsets } = dragStartDataRef.current;

    const dxViewport = event.clientX - mouseStartX;
    const dyViewport = event.clientY - mouseStartY;

    if (!hasDraggedRef.current && (Math.abs(dxViewport) > 5 || Math.abs(dyViewport) > 5)) {
        hasDraggedRef.current = true;
    }

    const dxWorld = dxViewport / scale;
    const dyWorld = dyViewport / scale;

    const newPrimaryNodeX = startX + dxWorld;
    const newPrimaryNodeY = startY + dyWorld;

    onNodeDrag(primaryNodeId, newPrimaryNodeX, newPrimaryNodeY);

    if (isMultiDrag && multiDragOffsets) {
      multiDragOffsets.forEach((offset, offsetNodeId) => {
        onNodeDrag(offsetNodeId, newPrimaryNodeX + offset.dx, newPrimaryNodeY + offset.dy);
      });
    }
  }, [scale, onNodeDrag]);

  const handleGlobalNodeMouseUp = useCallback(() => {
    if (dragStartDataRef.current && onMultiNodeDragEnd && hasDraggedRef.current) {
      const { primaryNodeId, startX, startY, isMultiDrag, multiDragOffsets } = dragStartDataRef.current;
      const movedNodesInfo: MovedNodeInfo[] = [];

      const primaryNodeAfterDrag = allNodes.find(n => n.id === primaryNodeId);
      if (primaryNodeAfterDrag) {
        movedNodesInfo.push({
          nodeId: primaryNodeId,
          nodeType: primaryNodeAfterDrag.type,
          nodeTitle: primaryNodeAfterDrag.title,
          oldX: startX,
          oldY: startY,
          newX: primaryNodeAfterDrag.x,
          newY: primaryNodeAfterDrag.y,
        });
      }

      if (isMultiDrag && multiDragOffsets && primaryNodeAfterDrag) {
        multiDragOffsets.forEach((offset, offsetNodeId) => {
          const otherNodeOriginal = allNodes.find(n => n.id === offsetNodeId); // Find original state for type/title
          const otherNodeAfterDrag = allNodes.find(n => n.id === offsetNodeId); // Position will be updated by onNodeDrag

          if (otherNodeOriginal && otherNodeAfterDrag) {
             const originalOtherX = startX + offset.dx;
             const originalOtherY = startY + offset.dy;
            movedNodesInfo.push({
              nodeId: offsetNodeId,
              nodeType: otherNodeOriginal.type,
              nodeTitle: otherNodeOriginal.title,
              oldX: originalOtherX,
              oldY: originalOtherY,
              newX: otherNodeAfterDrag.x,
              newY: otherNodeAfterDrag.y,
            });
          }
        });
      }
      if (movedNodesInfo.length > 0) {
        onMultiNodeDragEnd(movedNodesInfo);
      }
    }
    if (hasDraggedRef.current && onDragPerformed) {
      onDragPerformed();
    }
    setDraggingNodeId(null);
    dragStartDataRef.current = null;
    hasDraggedRef.current = false;
  }, [onMultiNodeDragEnd, onDragPerformed, allNodes]); // Added allNodes

  useEffect(() => {
    if (draggingNodeId) {
      document.addEventListener('mousemove', handleGlobalNodeMouseMove);
      document.addEventListener('mouseup', handleGlobalNodeMouseUp);
    } else {
      document.removeEventListener('mousemove', handleGlobalNodeMouseMove);
      document.removeEventListener('mouseup', handleGlobalNodeMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalNodeMouseMove);
      document.removeEventListener('mouseup', handleGlobalNodeMouseUp);
    };
  }, [draggingNodeId, handleGlobalNodeMouseMove, handleGlobalNodeMouseUp]);

  const createNodeDragStartHandler = useCallback((
    interactedNodeId: string, 
    initialInteractedNodeX: number,
    initialInteractedNodeY: number
  ) => {
    return (event: React.MouseEvent<HTMLDivElement>) => {
      const targetElement = event.target as HTMLElement;
      if (
        targetElement.tagName === 'TEXTAREA' ||
        targetElement.tagName === 'INPUT' ||
        targetElement.tagName === 'BUTTON' ||
        targetElement.closest('[contenteditable="true"]')
      ) {
        event.stopPropagation();
        return;
      }

      if (event.button !== 0 || isConnectionDraggingActive) return;
      
      // Call selection handler first with the node directly interacted with.
      // This updates selection state in NodeManager.
      onNodeMouseDownForSelection(interactedNodeId, event); 
      
      // Determine the primary node for the drag operation AFTER selection state might have changed.
      // If the interactedNodeId is part of the current selection (selectedNodeIds from props, which is pre-this-click),
      // and multiple nodes are selected, then the interactedNodeId can act as the primary.
      // Otherwise, if interactedNodeId wasn't selected before or only it was selected, it becomes the primary.
      
      const nodeIsCurrentlySelected = selectedNodeIds.includes(interactedNodeId);
      const multipleNodesAreSelected = selectedNodeIds.length > 1;
      const actualSelectedNodeIdsAfterClick = event.shiftKey 
        ? (nodeIsCurrentlySelected ? selectedNodeIds.filter(id => id !== interactedNodeId) : [...selectedNodeIds, interactedNodeId]) 
        : [interactedNodeId];

      const primaryNodeForDragId = interactedNodeId; // The node interacted with is always the anchor for dragging calculations.
      setDraggingNodeId(primaryNodeForDragId);
      hasDraggedRef.current = false;
      
      const primaryNodeData = allNodes.find(n => n.id === primaryNodeForDragId);
      if (!primaryNodeData) {
        console.error("Primary node for drag not found in allNodes.");
        setDraggingNodeId(null); return;
      }

      const isMultiDrag = actualSelectedNodeIdsAfterClick.length > 1 && actualSelectedNodeIdsAfterClick.includes(primaryNodeForDragId);
      let offsets: Map<string, { dx: number; dy: number }> | undefined = undefined;

      if (isMultiDrag) {
        offsets = new Map();
        actualSelectedNodeIdsAfterClick.forEach(selectedId => {
          if (selectedId !== primaryNodeForDragId) {
            const otherNode = allNodes.find(n => n.id === selectedId);
            if (otherNode) {
              offsets!.set(selectedId, { 
                dx: otherNode.x - primaryNodeData.x, 
                dy: otherNode.y - primaryNodeData.y 
              });
            }
          }
        });
      }

      dragStartDataRef.current = {
        primaryNodeId: primaryNodeForDragId,
        startX: primaryNodeData.x, // Use the actual position of the primary node for drag
        startY: primaryNodeData.y,
        mouseStartX: event.clientX,
        mouseStartY: event.clientY,
        isMultiDrag: isMultiDrag && !!offsets && offsets.size > 0,
        multiDragOffsets: offsets,
      };

      event.preventDefault();
      event.stopPropagation();
    };
  }, [
      isConnectionDraggingActive, 
      onNodeMouseDownForSelection, 
      selectedNodeIds, 
      allNodes,        
      scale, 
      onNodeDrag // onNodeDrag doesn't strictly need to be here if its definition is stable, but added for completeness
    ]);

  return {
    draggingNodeId,
    createNodeDragStartHandler,
  };
};