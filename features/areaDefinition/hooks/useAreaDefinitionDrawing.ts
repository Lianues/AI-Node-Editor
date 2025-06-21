
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DefiningAreaScreenRect, UseAreaDefinitionDrawingProps, AreaDefinitionDrawingHookApi } from '../types/areaDefinitionTypes';

export const useAreaDefinitionDrawing = ({
  isCurrentlyActive,
  canvasRef,
  onAreaDefined,
  onDeactivate,
}: UseAreaDefinitionDrawingProps): AreaDefinitionDrawingHookApi => {
  const [definingAreaRect, setDefiningAreaRect] = useState<DefiningAreaScreenRect | null>(null);
  const areaStartPointRef = useRef<{ x: number; y: number } | null>(null);

  const isDrawing = useCallback(() => !!areaStartPointRef.current, []);

  const cancelCurrentDrawing = useCallback(() => {
    if (areaStartPointRef.current) {
      setDefiningAreaRect(null);
      areaStartPointRef.current = null;
      // No onDeactivate here, as Escape should handle full deactivation.
      // This is for programmatic cancellation if needed.
    }
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
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

    areaStartPointRef.current = { x: startX, y: startY };
    setDefiningAreaRect({ x: startX, y: startY, width: 0, height: 0 });
  }, [isCurrentlyActive, canvasRef]);

  const handleMouseMoveGlobal = useCallback((event: MouseEvent) => {
    if (!isCurrentlyActive || !areaStartPointRef.current || !canvasRef.current) {
      return;
    }

    const canvasElement = canvasRef.current;
    const rect = canvasElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = areaStartPointRef.current.x;
    const startY = areaStartPointRef.current.y;

    const newRectX = Math.min(startX, currentX);
    const newRectY = Math.min(startY, currentY);
    const newRectWidth = Math.abs(startX - currentX);
    const newRectHeight = Math.abs(startY - currentY);

    setDefiningAreaRect({ x: newRectX, y: newRectY, width: newRectWidth, height: newRectHeight });
  }, [isCurrentlyActive, canvasRef]);

  const handleMouseUpGlobal = useCallback((event: MouseEvent) => {
    if (!isCurrentlyActive || !areaStartPointRef.current) {
      // If mode is active but no drag started (e.g. simple click), still deactivate.
      if (isCurrentlyActive && !areaStartPointRef.current) {
        onDeactivate();
      }
      return;
    }

    if (definingAreaRect && (definingAreaRect.width > 0 || definingAreaRect.height > 0)) {
      onAreaDefined(definingAreaRect);
    }
    
    setDefiningAreaRect(null);
    areaStartPointRef.current = null;
    onDeactivate(); // Always deactivate after mouse up
  }, [isCurrentlyActive, definingAreaRect, onAreaDefined, onDeactivate]);

  const handleKeyDownGlobal = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isCurrentlyActive) {
      cancelCurrentDrawing();
      onDeactivate(); // Escape fully deactivates the mode
    }
  }, [isCurrentlyActive, onDeactivate, cancelCurrentDrawing]);

  useEffect(() => {
    if (isCurrentlyActive) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      document.addEventListener('keydown', handleKeyDownGlobal);
    } else {
      // Ensure state is reset if mode is deactivated externally
      setDefiningAreaRect(null);
      areaStartPointRef.current = null;
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, [isCurrentlyActive, handleMouseMoveGlobal, handleMouseUpGlobal, handleKeyDownGlobal]);

  return {
    definingAreaRect,
    handleMouseDown,
    isDrawing,
    cancelCurrentDrawing,
  };
};
