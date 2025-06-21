
import React, { useState, useCallback, useRef, useEffect } from 'react';

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;
const ZOOM_SENSITIVITY = 0.001;
const CLICK_THRESHOLD = 5; 

interface UseCanvasInteractionsProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  onNodeDrop: (nodeTypeKey: string, x: number, y: number) => void;
  onNodeGroupDrop: (nodeGroupId: string, x: number, y: number) => void;
  onSubWorkflowDrop: (subWorkflowId: string, x: number, y: number) => void; 
  onBackgroundMouseUp?: (worldX: number, worldY: number, event: MouseEvent) => void;
  gridDotColor: string;
  onWorldMouseMove?: (coords: { x: number; y: number } | null) => void;
  
  externalPan: { x: number; y: number };
  externalScale: number;
  onViewUpdate: (pan: { x: number; y: number }, scale: number) => void;
}

export const useCanvasInteractions = ({
  canvasRef,
  onNodeDrop,
  onNodeGroupDrop,
  onSubWorkflowDrop, 
  onBackgroundMouseUp,
  gridDotColor,
  onWorldMouseMove,
  externalPan,    
  externalScale,  
  onViewUpdate,   
}: UseCanvasInteractionsProps) => {
  const [internalPan, setInternalPan] = useState(externalPan);
  const [internalScale, setInternalScale] = useState(externalScale);
  const [isPanning, setIsPanning] = useState(false);
  
  const panStartRef = useRef<{ 
    mouseX: number; 
    mouseY: number; 
    initialPanX: number; 
    initialPanY: number; 
  } | null>(null);
  
  const lastClickWasDragRef = useRef(false);

  useEffect(() => {
    setInternalPan(externalPan);
  }, [externalPan]);

  useEffect(() => {
    setInternalScale(externalScale);
  }, [externalScale]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const targetElement = event.target as HTMLElement;

    if (event.button !== 0) return;

    const isCanvasDirectClick = targetElement === canvasRef.current;
    // Check if the click is within a DefinedAreaRenderer's main div
    const clickedDefinedAreaElement = targetElement.closest('[data-defined-area-id]');
    const clickedWithinDefinedArea = !!clickedDefinedAreaElement;
    
    let allowPan = false;
    if (isCanvasDirectClick) {
      allowPan = true;
    } else if (clickedWithinDefinedArea) {
      // If the click originated from within a defined area, and wasn't on an element
      // that should handle its own interaction (like a Node, which stops propagation),
      // then allow panning.
      allowPan = true;
    }
    
    if (!allowPan) {
      return;
    }
    
    event.preventDefault(); 
    
    setIsPanning(true);
    panStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      initialPanX: internalPan.x, 
      initialPanY: internalPan.y,
    };
    lastClickWasDragRef.current = false; 
  }, [canvasRef, internalPan, setIsPanning, panStartRef, lastClickWasDragRef]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const clientX = event.clientX;
    const clientY = event.clientY;

    if (onWorldMouseMove) {
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const worldX = (clientX - rect.left - internalPan.x) / internalScale;
        const worldY = (clientY - rect.top - internalPan.y) / internalScale;
        onWorldMouseMove({ x: worldX, y: worldY });
      } else {
        onWorldMouseMove(null);
      }
    }
  }, [canvasRef, internalPan.x, internalPan.y, internalScale, onWorldMouseMove]);

  const handleMouseLeave = useCallback(() => {
    if (onWorldMouseMove) {
      onWorldMouseMove(null);
    }
  }, [onWorldMouseMove]);


  useEffect(() => {
    const canvasElement = canvasRef.current; 

    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isPanning || !panStartRef.current) return;

      const { mouseX, mouseY, initialPanX, initialPanY } = panStartRef.current;
      
      const dx = event.clientX - mouseX;
      const dy = event.clientY - mouseY;

      const newPan = {
        x: initialPanX + dx,
        y: initialPanY + dy,
      };
      setInternalPan(newPan);
      onViewUpdate(newPan, internalScale);


      if (!lastClickWasDragRef.current) {
        const dxAbs = Math.abs(event.clientX - mouseX);
        const dyAbs = Math.abs(event.clientY - mouseY);
        if (dxAbs > CLICK_THRESHOLD || dyAbs > CLICK_THRESHOLD) {
            lastClickWasDragRef.current = true;
        }
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (!isPanning) return; 

      const panStartedData = panStartRef.current;
      setIsPanning(false); 

      if (panStartedData && onBackgroundMouseUp && canvasElement) {
        const totalDx = Math.abs(event.clientX - panStartedData.mouseX);
        const totalDy = Math.abs(event.clientY - panStartedData.mouseY);

        if (totalDx <= CLICK_THRESHOLD && totalDy <= CLICK_THRESHOLD) {
          const rect = canvasElement.getBoundingClientRect();
          const clickIsInsideCanvas = event.clientX >= rect.left && event.clientX <= rect.right &&
                                      event.clientY >= rect.top && event.clientY <= rect.bottom;

          if (clickIsInsideCanvas) {
             const worldX = (event.clientX - rect.left - internalPan.x) / internalScale;
             const worldY = (event.clientY - rect.top - internalPan.y) / internalScale;
             onBackgroundMouseUp(worldX, worldY, event);
          }
        }
      }
      panStartRef.current = null;
    };

    if (isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, internalPan, internalScale, onBackgroundMouseUp, canvasRef, onViewUpdate, setIsPanning, panStartRef, lastClickWasDragRef]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const targetElement = event.target as HTMLElement;
    if (targetElement) {
        const tagName = targetElement.tagName.toLowerCase();
        let shouldPreventCanvasZoom = true;

        if (tagName === 'textarea' || tagName === 'pre') {
            const element = targetElement as HTMLTextAreaElement | HTMLPreElement;
            const isVerticallyScrollable = element.scrollHeight > element.clientHeight;
            const isHorizontallyScrollable = element.scrollWidth > element.clientWidth;

            if (isVerticallyScrollable || isHorizontallyScrollable) {
                const canElementScrollVertically =
                    (event.deltaY < 0 && element.scrollTop > 0) ||
                    (event.deltaY > 0 && element.scrollTop < element.scrollHeight - element.clientHeight);

                const canElementScrollHorizontally =
                    (event.deltaX < 0 && element.scrollLeft > 0) ||
                    (event.deltaX > 0 && element.scrollLeft < element.scrollWidth - element.clientWidth);
                
                if ((Math.abs(event.deltaY) > Math.abs(event.deltaX) && canElementScrollVertically) ||
                    (Math.abs(event.deltaX) >= Math.abs(event.deltaY) && canElementScrollHorizontally) ||
                    (event.deltaY !== 0 && canElementScrollVertically) || 
                    (event.deltaX !== 0 && canElementScrollHorizontally) 
                    ) {
                     shouldPreventCanvasZoom = false;
                }
            }
        }
        
        if (!shouldPreventCanvasZoom) {
            return; 
        }
    }

    event.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = 1 - event.deltaY * ZOOM_SENSITIVITY;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, internalScale * zoomFactor));

    const worldMouseX = (mouseX - internalPan.x) / internalScale;
    const worldMouseY = (mouseY - internalPan.y) / internalScale;

    const newPanX = mouseX - worldMouseX * newScale;
    const newPanY = mouseY - worldMouseY * newScale;

    setInternalScale(newScale);
    setInternalPan({ x: newPanX, y: newPanY });
    onViewUpdate({ x: newPanX, y: newPanY }, newScale);
  }, [internalScale, internalPan, canvasRef, onViewUpdate, setInternalScale, setInternalPan]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const types = event.dataTransfer.types;

    if (types.includes('application/ai-workflow-program-interface-item')) {
      event.dataTransfer.dropEffect = 'copy';
    } else if (types.includes('application/ai-workflow-subworkflow-id')) { 
      event.dataTransfer.dropEffect = 'copy'; 
    } else if (types.includes('application/ai-workflow-node-group-id')) {
      event.dataTransfer.dropEffect = 'copy'; 
    } else if (types.includes('application/reactflow-node-type')) {
      event.dataTransfer.dropEffect = 'move'; 
    } else {
      event.dataTransfer.dropEffect = 'none';
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canvasRef.current) return;

    const subWorkflowId = event.dataTransfer.getData('application/ai-workflow-subworkflow-id');
    const nodeGroupId = event.dataTransfer.getData('application/ai-workflow-node-group-id');
    const nodeTypeKey = event.dataTransfer.getData('application/reactflow-node-type');
    const programInterfaceItemDataString = event.dataTransfer.getData('application/ai-workflow-program-interface-item');


    const rect = canvasRef.current.getBoundingClientRect();
    const dropCanvasX = event.clientX - rect.left;
    const dropCanvasY = event.clientY - rect.top;

    const worldX = (dropCanvasX - internalPan.x) / internalScale;
    const worldY = (dropCanvasY - internalPan.y) / internalScale;
    
    if (programInterfaceItemDataString) {
      // Program interface drop has highest precedence if data exists
      onNodeDrop(nodeTypeKey /* This needs to be part of payload */, worldX, worldY); // Modify onNodeDrop or payload
    } else if (subWorkflowId) { 
      onSubWorkflowDrop(subWorkflowId, worldX, worldY);
    } else if (nodeGroupId) {
      onNodeGroupDrop(nodeGroupId, worldX, worldY);
    } else if (nodeTypeKey) {
      onNodeDrop(nodeTypeKey, worldX, worldY);
    }
  }, [internalPan.x, internalPan.y, internalScale, onNodeDrop, onNodeGroupDrop, onSubWorkflowDrop, canvasRef]); 
  
  const canvasBackgroundStyle = {
    backgroundSize: `${16 * internalScale}px ${16 * internalScale}px`,
    backgroundPosition: `${internalPan.x % (16 * internalScale)}px ${internalPan.y % (16 * internalScale)}px`,
  };

  return {
    pan: internalPan,   
    scale: internalScale, 
    isPanning, 
    lastClickWasDrag: lastClickWasDragRef.current, 
    canvasProps: {
      onMouseDown: handleMouseDown,
      onWheel: handleWheel,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
    canvasBackgroundStyle,
  };
};
