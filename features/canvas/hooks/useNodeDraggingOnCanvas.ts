import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node } from '../../../types';
import { MovedNodeInfo } from '../../nodes/hooks/useNodeDraggingOnCanvas'; // Corrected import for MovedNodeInfo

interface UseNodeDraggingOnCanvasProps {
  scale: number;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  onNodeMouseDownForSelection: (nodeId: string, event: React.MouseEvent<HTMLDivElement>) => void;
  isConnectionDraggingActive: boolean;
  onMultiNodeDragEnd?: (movedNodes: MovedNodeInfo[]) => void; // Changed prop name and signature
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
  selectedNodeIds, // from props (state before this mousedown event's selection update)
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
          const otherNodeOriginal = allNodes.find(n => n.id === offsetNodeId); 
          const otherNodeAfterDrag = allNodes.find(n => n.id === offsetNodeId); 

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
  }, [onMultiNodeDragEnd, onDragPerformed, allNodes]); 

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
      
      // Call selection update first. `selectedNodeIds` from props is the state *before* this selection update.
      onNodeMouseDownForSelection(interactedNodeId, event); 
      
      const primaryNodeForDragId = interactedNodeId;
      setDraggingNodeId(primaryNodeForDragId);
      hasDraggedRef.current = false;
      
      const primaryNodeData = allNodes.find(n => n.id === primaryNodeForDragId);
      if (!primaryNodeData) {
        console.error("Primary node for drag not found in allNodes.");
        setDraggingNodeId(null); return;
      }

      let nodesToDragIds: string[];
      let isMultiDraggingThisTime = false;
      const isInteractedNodeAlreadySelected = selectedNodeIds.includes(primaryNodeForDragId);

      if (event.shiftKey) {
        // If Shift is held:
        // 1. If interacted node is already part of a multi-selection, drag all of them.
        if (isInteractedNodeAlreadySelected && selectedNodeIds.length > 1) {
            nodesToDragIds = [...selectedNodeIds];
            isMultiDraggingThisTime = true;
        } 
        // 2. If interacted node is not selected (or was the only one selected),
        //    and shift is held, it means we're adding it to the selection (or forming a new one).
        //    The group to drag is this new conceptual selection.
        else {
            // The selection manager (`onNodeMouseDownForSelection`) would have handled adding
            // `interactedNodeId` to the selection. For drag purposes, we consider the group
            // formed by the previous selection plus the new one (if not already included).
            nodesToDragIds = selectedNodeIds.includes(primaryNodeForDragId)
                                ? [...selectedNodeIds] // Already included
                                : [...selectedNodeIds, primaryNodeForDragId]; // Add it
            if (nodesToDragIds.length > 1) {
                isMultiDraggingThisTime = true;
            } else {
                nodesToDragIds = [primaryNodeForDragId]; // Only one node effectively selected for drag
                isMultiDraggingThisTime = false;
            }
        }
      } else {
        // No shift key: drag only the interacted node.
        // `onNodeMouseDownForSelection` would have made this the only selected node.
        nodesToDragIds = [primaryNodeForDragId];
        isMultiDraggingThisTime = false;
      }
      
      let offsets: Map<string, { dx: number; dy: number }> | undefined = undefined;
      if (isMultiDraggingThisTime && nodesToDragIds.length > 1) {
        offsets = new Map();
        nodesToDragIds.forEach(idInDragGroup => {
          if (idInDragGroup !== primaryNodeForDragId) {
            const otherNode = allNodes.find(n => n.id === idInDragGroup);
            if (otherNode && primaryNodeData) {
              offsets!.set(idInDragGroup, { 
                dx: otherNode.x - primaryNodeData.x, 
                dy: otherNode.y - primaryNodeData.y 
              });
            }
          }
        });
        // If after calculating offsets, no actual other nodes are included, it's not a multi-drag.
        if (offsets.size === 0) {
            isMultiDraggingThisTime = false;
            offsets = undefined;
        }
      } else {
        // If nodesToDragIds ended up being just one, ensure isMultiDraggingThisTime is false
        isMultiDraggingThisTime = false;
      }


      dragStartDataRef.current = {
        primaryNodeId: primaryNodeForDragId,
        startX: primaryNodeData.x, 
        startY: primaryNodeData.y,
        mouseStartX: event.clientX,
        mouseStartY: event.clientY,
        isMultiDrag: isMultiDraggingThisTime, // Relies on offsets being successfully created for >1 node
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
      // scale,  // scale is used in handleGlobalNodeMouseMove, not directly in create handler's decision logic
      // onNodeDrag // onNodeDrag is called by handleGlobalNodeMouseMove
    ]);

  return {
    draggingNodeId,
    createNodeDragStartHandler,
  };
};
