
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Node } from '../../types';

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseMarqueeSelectionProps {
  isCurrentlyActive: boolean;
  onDeactivateOneShot?: () => void;
  isKeyHoldModeActive: boolean; // True if M key is held, false otherwise
  canvasRef: React.RefObject<HTMLDivElement>;
  nodes: Node[];
  pan: { x: number; y: number };
  scale: number;
  onNodesSelectedByMarquee: (selectedNodeIds: string[]) => void;
  onMarqueeSelectionCancelled?: () => void; // Callback when marquee is cancelled (e.g., by Escape or M key release)
}

export interface MarqueeSelectionHookApi {
  marqueeRect: MarqueeRect | null;
  handleMarqueeMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  isCurrentlyDragging: () => boolean;
  cancelCurrentDrag: () => void;
}

export const useMarqueeSelection = ({
  isCurrentlyActive,
  onDeactivateOneShot,
  isKeyHoldModeActive,
  canvasRef,
  nodes,
  pan,
  scale,
  onNodesSelectedByMarquee,
  onMarqueeSelectionCancelled,
}: UseMarqueeSelectionProps): MarqueeSelectionHookApi => {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const marqueeStartPointRef = useRef<{ x: number; y: number } | null>(null);

  const isCurrentlyDragging = useCallback(() => !!marqueeStartPointRef.current, []);

  const cancelCurrentDrag = useCallback(() => {
    if (marqueeStartPointRef.current) {
      setMarqueeRect(null);
      marqueeStartPointRef.current = null;
      if (onMarqueeSelectionCancelled) {
        onMarqueeSelectionCancelled();
      }
    }
  }, [onMarqueeSelectionCancelled]);


  const intersects = (rect1: MarqueeRect, rect2: MarqueeRect) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  const handleMarqueeMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCurrentlyActive || event.button !== 0 || event.target !== canvasRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();

    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    marqueeStartPointRef.current = { x: startX, y: startY };
    setMarqueeRect({ x: startX, y: startY, width: 0, height: 0 });
  }, [isCurrentlyActive, canvasRef]);

  const handleMouseMoveGlobal = useCallback((event: MouseEvent) => {
    if (!isCurrentlyActive || !marqueeStartPointRef.current || !canvasRef.current) {
      return;
    }
    // No preventDefault here as it might interfere with other global listeners
    // if not carefully managed. The mousedown should handle initial prevention.

    const canvasElement = canvasRef.current;
    const rect = canvasElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = marqueeStartPointRef.current.x;
    const startY = marqueeStartPointRef.current.y;

    const newRectX = Math.min(startX, currentX);
    const newRectY = Math.min(startY, currentY);
    const newRectWidth = Math.abs(startX - currentX);
    const newRectHeight = Math.abs(startY - currentY);

    setMarqueeRect({ x: newRectX, y: newRectY, width: newRectWidth, height: newRectHeight });
  }, [isCurrentlyActive, canvasRef]); // Removed marqueeStartPointRef from deps as it's a ref

  const handleMouseUpGlobal = useCallback((event: MouseEvent) => {
    if (!isCurrentlyActive || !marqueeStartPointRef.current) {
      // If marquee was not active or drag not started, but mode is on (e.g. one-shot from menu),
      // a simple click (without drag to form a rect) might still trigger deactivation for one-shot.
      // Check if it was a one-shot mode and M key is NOT pressed.
      if (isCurrentlyActive && !marqueeStartPointRef.current && !isKeyHoldModeActive && onDeactivateOneShot) {
        onDeactivateOneShot(); // Deactivate menu one-shot if it was a click without drag
        if (onMarqueeSelectionCancelled) onMarqueeSelectionCancelled();
      }
      return;
    }
    // No preventDefault here, as it's a global listener. Original mousedown should handle.

    const selectedNodeIds: string[] = [];
    // marqueeRect can be null if Escape was pressed right before mouseup, or if it was a click
    // So, ensure marqueeRect exists and has dimensions before proceeding.
    if (marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0)) {
        const worldMarqueeX = (marqueeRect.x - pan.x) / scale;
        const worldMarqueeY = (marqueeRect.y - pan.y) / scale;
        const worldMarqueeWidth = marqueeRect.width / scale;
        const worldMarqueeHeight = marqueeRect.height / scale;

        const marqueeWorldRect: MarqueeRect = {
            x: worldMarqueeX,
            y: worldMarqueeY,
            width: worldMarqueeWidth,
            height: worldMarqueeHeight,
        };

        nodes.forEach(node => {
            const nodeWorldRect: MarqueeRect = {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            };
            if (intersects(marqueeWorldRect, nodeWorldRect)) {
            selectedNodeIds.push(node.id);
            }
        });
        onNodesSelectedByMarquee(selectedNodeIds);
    } else if (marqueeRect && marqueeRect.width === 0 && marqueeRect.height === 0) {
        // It was a click without drag, but selection logic still needs to run for consistency (empty selection)
        onNodesSelectedByMarquee([]);
    }


    setMarqueeRect(null);
    marqueeStartPointRef.current = null;

    // Deactivate one-shot mode if M key is not held
    if (!isKeyHoldModeActive && onDeactivateOneShot) {
      onDeactivateOneShot();
    }
  }, [
    isCurrentlyActive,
    isKeyHoldModeActive,
    marqueeRect,
    nodes,
    pan,
    scale,
    onNodesSelectedByMarquee,
    onDeactivateOneShot,
    onMarqueeSelectionCancelled
  ]); // Removed marqueeStartPointRef from deps

  const handleKeyDownGlobal = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isCurrentlyActive) {
      cancelCurrentDrag();
      if (!isKeyHoldModeActive && onDeactivateOneShot) {
          onDeactivateOneShot();
      }
    }
  }, [isCurrentlyActive, isKeyHoldModeActive, onDeactivateOneShot, cancelCurrentDrag]);


  useEffect(() => {
    if (isCurrentlyActive) {
      // Add global listeners when the marquee mode is active.
      // The handlers (handleMouseMoveGlobal, handleMouseUpGlobal) will internally
      // check if a drag is in progress (marqueeStartPointRef.current).
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      document.addEventListener('keydown', handleKeyDownGlobal);
    }

    return () => {
      // Cleanup: remove global listeners when the mode is no longer active or component unmounts.
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, [isCurrentlyActive, handleMouseMoveGlobal, handleMouseUpGlobal, handleKeyDownGlobal]);


  return {
    marqueeRect,
    handleMarqueeMouseDown,
    isCurrentlyDragging,
    cancelCurrentDrag,
  };
};
