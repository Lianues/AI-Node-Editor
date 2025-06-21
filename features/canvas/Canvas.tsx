
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, NodeTypeDefinition, PortDataType, NodeExecutionState, ModelConfigGroup, EditableAiModelConfig } from '../../types'; 
import { DraggingConnectionState, HoveredTargetInfo, Connection, ConnectionPortIdentifier } from '../connections/types/connectionTypes';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { useConnectionDragging } from '../connections/hooks/useConnectionDragging';
import { HEADER_HEIGHT } from '../../components/renderingConstants';
import { ConnectionRenderer } from '../connections/components/ConnectionRenderer';
import { buildContextMenuItems } from '../../components/ContextMenu/contextMenuUtils'; 
import { useNodeDraggingOnCanvas } from './hooks/useNodeDraggingOnCanvas'; 
import { MovedNodeInfo } from '../nodes/hooks/useNodeDraggingOnCanvas'; 
import { NodeLayer } from './components/NodeLayer';
import { useCanvasCursor } from './hooks/useCanvasCursor';
import { UpstreamNodeVisualStateManager } from '../execution/engine/UpstreamNodeVisualStateManager'; 
import { PortDataCacheEntry, UpstreamSourceInfo } from '../execution/engine/PropagationEngine';
import { useMarqueeSelection, MarqueeSelectionHookApi } from '../marquee/useMarqueeSelection'; 
import { MarqueeRectangle } from '../marquee/MarqueeRectangle'; 
import { useAreaDefinitionDrawing } from '../areaDefinition/hooks/useAreaDefinitionDrawing';
import { DefiningAreaScreenRect, DefinedArea } from '../areaDefinition/types/areaDefinitionTypes';
import { DefinedAreaRenderer } from '../areaDefinition/components/DefinedAreaRenderer';
import { DefiningAreaRectangle } from '../areaDefinition/components/DefiningAreaRectangle';


interface CanvasProps {
  // Node Props
  nodes: Node[];
  onNodeDrag: (id: string, x: number, y: number) => void;
  onNodeDragEnd?: (movedNodes: MovedNodeInfo[]) => void; 
  selectedNodeIds: string[]; 
  onSelectNode: (id: string | null, shiftKey?: boolean) => void; 
  appHandleSelectNodesByMarquee: (nodeIds: string[]) => void; 
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined; 
  onNodeDrop: (nodeTypeKey: string, x: number, y: number, overrideData?: Partial<Node>) => void; // Updated signature
  onNodeGroupDrop: (nodeGroupId: string, x: number, y: number) => void;
  onSubWorkflowDrop: (subWorkflowId: string, x: number, y: number) => void; 
  nodeTypeToPlace: string | null;
  onBackgroundClick: (worldX: number, worldY: number, shiftKey?: boolean) => void; 
  updateNodeData: (nodeId: string, data: Record<string, any>) => void; 
  nodeExecutionStates: Map<string, NodeExecutionState>; 
  appHandleDragPerformed: () => void; 


  // Connection Props
  draggingConnection: DraggingConnectionState | null;
  setDraggingConnection: React.Dispatch<React.SetStateAction<DraggingConnectionState | null>>;
  connections: Connection[];
  onCompleteConnection: (
    source: ConnectionPortIdentifier,
    target: ConnectionPortIdentifier,
    modifiedConnectionId?: string
  ) => void; 
  selectedConnectionId: string | null;
  onSelectConnection: (connectionId: string | null) => void;

  // Defined Area Props
  definedAreas: DefinedArea[]; 
  selectedDefinedAreaId: string | null; 

  // Context Menu related props
  onCanvasContextMenu: (event: React.MouseEvent) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  onConnectionContextMenu: (event: React.MouseEvent, connectionId: string) => void;
  onDefinedAreaContextMenu: (event: React.MouseEvent, area: DefinedArea) => void; 

  canPaste: boolean;
  onCopyNode: (nodeId?: string) => void; 
  onCutNode: (nodeId?: string) => void;   
  onPasteNode: (worldX?: number, worldY?: number) => void;
  onDelete: (ids?: { nodeId?: string; connectionId?: string }) => void; 
  onShowProperties: (type: 'node' | 'connection' | 'canvas' | 'defined-area', id?: string) => void; 
  getUpstreamNodeVisualStateManager: () => UpstreamNodeVisualStateManager; 
  getQueuedInputsForDownstreamPort: (downstreamNodeId: string, downstreamInputPortId: string, dataType: PortDataType) => Array<PortDataCacheEntry | UpstreamSourceInfo> | undefined; 
  onWorldMouseMove: (coords: { x: number; y: number } | null) => void;

  canvasRef: React.RefObject<HTMLDivElement>; 
  externalPan: { x: number; y: number };
  externalScale: number;
  onViewUpdate: (pan: { x: number; y: number }, scale: number) => void;
  activeTabId: string | null; 

  // Marquee selection props
  isMarqueeSelectModeActive: boolean; 
  setIsMarqueeSelectModeActive: (isActive: boolean) => void; 
  isMKeyPressed: boolean; 

  // Define Area props
  isDefiningAreaActive: boolean; 
  appHandleEndDefiningArea: (rect: DefiningAreaScreenRect | null) => void; 
  onOpenCustomUiPreview?: (html: string, height: number, nodeId: string, inputData?: Record<string, any>) => void; 
  mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig>; // New prop
}

export const Canvas: React.FC<CanvasProps> = (props) => {
  const {
    // Node Props
    nodes,
    onNodeDrag,
    onNodeDragEnd,
    selectedNodeIds,
    onSelectNode, 
    appHandleSelectNodesByMarquee, 
    getNodeDefinition,
    onNodeDrop,
    onNodeGroupDrop,
    onSubWorkflowDrop, 
    nodeTypeToPlace,
    onBackgroundClick,
    updateNodeData,
    nodeExecutionStates, 
    appHandleDragPerformed, 
    // Connection Props
    draggingConnection,
    setDraggingConnection,
    connections,
    onCompleteConnection,
    selectedConnectionId,
    onSelectConnection,
    // Defined Area props
    definedAreas, 
    selectedDefinedAreaId, 
    // Context Menu related props
    onCanvasContextMenu,
    onNodeContextMenu,
    onConnectionContextMenu,
    onDefinedAreaContextMenu, 
    // Other props
    canPaste,
    onCopyNode,
    onCutNode,
    onPasteNode,
    onDelete, 
    onShowProperties,
    getUpstreamNodeVisualStateManager, 
    getQueuedInputsForDownstreamPort, 
    onWorldMouseMove,
    canvasRef, 
    externalPan,    
    externalScale,  
    onViewUpdate,   
    activeTabId,  
    // Marquee props
    isMarqueeSelectModeActive,
    setIsMarqueeSelectModeActive,
    isMKeyPressed, 
    // Define Area props
    isDefiningAreaActive, 
    appHandleEndDefiningArea, 
    onOpenCustomUiPreview, // Destructure new prop
    mergedModelConfigs, // Destructure new prop
  } = props;

  const {
    pan,      
    scale,    
    isPanning,
    lastClickWasDrag,
    canvasProps: baseCanvasProps, 
    canvasBackgroundStyle,
  } = useCanvasInteractions({
    canvasRef, 
    onNodeDrop: (nodeTypeKey, x, y) => onNodeDrop(nodeTypeKey, x, y), 
    onNodeGroupDrop,
    onSubWorkflowDrop, 
    onBackgroundMouseUp: (worldX, worldY, event) => {
      if (!isMarqueeSelectModeActive && !isMKeyPressed && !isDefiningAreaActive) { 
        onBackgroundClick(worldX, worldY, event.shiftKey);
      }
    },
    gridDotColor: vscodeDarkTheme.canvas.gridDotColorHex,
    onWorldMouseMove,
    externalPan,  
    externalScale,
    onViewUpdate, 
  });

  const isConnectionDraggingActive = !!draggingConnection;

  const {
    draggingNodeId,
    createNodeDragStartHandler,
  } = useNodeDraggingOnCanvas({ 
    scale, 
    onNodeDrag,
    onNodeMouseDownForSelection: (nodeId, event) => {
      if (!isMarqueeSelectModeActive && !isMKeyPressed && !isDefiningAreaActive) { 
        props.onSelectNode(nodeId, event.shiftKey);
      }
    },
    isConnectionDraggingActive: isConnectionDraggingActive,
    onMultiNodeDragEnd: onNodeDragEnd, 
    onDragPerformed: appHandleDragPerformed, 
    selectedNodeIds: props.selectedNodeIds, 
    allNodes: props.nodes, 
  });


  const {
    initiateConnectionDrag,
    hoveredTargetPortInfo,
    handlePortPointerEnterForConnection,
    handlePortPointerLeaveForConnection,
    handlePortPointerUpForConnection,
    connectionCursorStyle,
    allValidTargetPorts,
  } = useConnectionDragging({
    draggingConnection,
    setDraggingConnection,
    canvasRef, 
    panX: pan.x,  
    panY: pan.y,  
    scale,        
    nodes,
    existingConnections: connections,
    onCompleteConnection,
    onDeleteConnection: (connectionId) => onDelete({ connectionId }), 
    selectedConnectionId, 
  });
  
  const isOverallMarqueeActive = isMarqueeSelectModeActive || isMKeyPressed;

  const marqueeHook = useMarqueeSelection({
    isCurrentlyActive: isOverallMarqueeActive,
    onDeactivateOneShot: () => setIsMarqueeSelectModeActive(false),
    isKeyHoldModeActive: isMKeyPressed, 
    canvasRef,
    nodes,
    pan,
    scale,
    onNodesSelectedByMarquee: appHandleSelectNodesByMarquee,
    onMarqueeSelectionCancelled: () => {}
  });

  const prevIsMKeyPressedRef = useRef(isMKeyPressed);
  useEffect(() => {
    if (prevIsMKeyPressedRef.current && !isMKeyPressed && marqueeHook.isCurrentlyDragging()) {
      marqueeHook.cancelCurrentDrag();
    }
    prevIsMKeyPressedRef.current = isMKeyPressed;
  }, [isMKeyPressed, marqueeHook]); 

  const areaDefinitionHook = useAreaDefinitionDrawing({
    isCurrentlyActive: isDefiningAreaActive,
    canvasRef,
    onAreaDefined: (rect) => {
      appHandleEndDefiningArea(rect); 
    },
    onDeactivate: () => {
      appHandleEndDefiningArea(null); 
    },
  });

  const finalCursorStyle = useCanvasCursor({
    connectionCursorStyle,
    nodeTypeToPlace,
    draggingNodeId,
    isPanning,
    lastClickWasDrag,
    isMarqueeSelectActive: isOverallMarqueeActive,
    isDefiningAreaActive, 
  });
  
  const handleCanvasMouseDownCombined = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDefiningAreaActive) { 
      areaDefinitionHook.handleMouseDown(event);
    } else if (isOverallMarqueeActive) {
      marqueeHook.handleMarqueeMouseDown(event); 
    } else {
      baseCanvasProps.onMouseDown(event); 
    }
  };

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

    const rect = canvasRef.current.getBoundingClientRect();
    const dropCanvasX = event.clientX - rect.left;
    const dropCanvasY = event.clientY - rect.top;
    const worldX = (dropCanvasX - pan.x) / scale;
    const worldY = (dropCanvasY - pan.y) / scale;

    const programInterfaceItemDataString = event.dataTransfer.getData('application/ai-workflow-program-interface-item');
    const subWorkflowId = event.dataTransfer.getData('application/ai-workflow-subworkflow-id');
    const nodeGroupId = event.dataTransfer.getData('application/ai-workflow-node-group-id');
    const nodeTypeKey = event.dataTransfer.getData('application/reactflow-node-type');

    if (programInterfaceItemDataString) {
      try {
        const payload = JSON.parse(programInterfaceItemDataString);
        const overrideData: Partial<Node> = {
          data: payload.dataToApply, 
          title: payload.titleToApply, 
        };
        onNodeDrop(payload.nodeTypeToCreate, worldX, worldY, overrideData);
      } catch (e) {
        console.error("Failed to parse program interface item data:", e);
      }
    } else if (subWorkflowId) { 
      onSubWorkflowDrop(subWorkflowId, worldX, worldY);
    } else if (nodeGroupId) {
      onNodeGroupDrop(nodeGroupId, worldX, worldY);
    } else if (nodeTypeKey) {
      onNodeDrop(nodeTypeKey, worldX, worldY); 
    }
  }, [pan.x, pan.y, scale, onNodeDrop, onNodeGroupDrop, onSubWorkflowDrop, canvasRef]);


  const placeholderText = activeTabId === null 
    ? "沒有打开的页面。点击上方 '+' 号新建页面。" 
    : "(将节点从左侧列表拖动到此处放置，或点选左侧节点再于此处点击放置。单击画布空白处可取消节点选中或放置节点。右键单击画布空白处可打开上下文菜单。使用滚轮缩放视图，拖动空白区域平移视图。按住 M 键激活框选模式。)";
  
  const showPlaceholder = activeTabId === null || (nodes.length === 0 && definedAreas.length === 0 && !isPanning && !draggingNodeId && !nodeTypeToPlace && !draggingConnection && !marqueeHook.marqueeRect && !areaDefinitionHook.definingAreaRect);

  return (
    <div
      ref={canvasRef} 
      {...baseCanvasProps} 
      onDragOver={handleDragOver} 
      onDrop={handleDrop} 
      onMouseDown={handleCanvasMouseDownCombined} 
      onContextMenu={onCanvasContextMenu}
      className={`flex-1 ${vscodeDarkTheme.canvas.bg} p-0 overflow-hidden relative select-none
                 bg-[radial-gradient(${vscodeDarkTheme.canvas.gridDotColorHex}_0.5px,transparent_0.5px)]`}
      style={{
        ...canvasBackgroundStyle, 
        cursor: finalCursorStyle,
      }}
      role="application"
      aria-label="Workflow Canvas"
    >
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className={`${vscodeDarkTheme.canvas.placeholderText} text-center text-sm max-w-md ${vscodeDarkTheme.canvas.placeholderBg} ${vscodeDarkTheme.canvas.placeholderBgOpacity} p-4 ${vscodeDarkTheme.canvas.placeholderRounded} ${vscodeDarkTheme.canvas.placeholderShadow}`}>
            {placeholderText}
          </p>
        </div>
      )}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none" 
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, 
          transformOrigin: '0 0',
        }}
      >
        
        {definedAreas.map(area => (
          <DefinedAreaRenderer 
            key={area.id} 
            area={area} 
            onContextMenu={props.onDefinedAreaContextMenu} 
            isSelected={area.id === selectedDefinedAreaId} 
          />
        ))}

        <svg
          width="100%"
          height="100%"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            pointerEvents: 'none', 
            zIndex: 0, 
          }}
        >
          <ConnectionRenderer
            nodes={nodes}
            connections={connections}
            draggingConnection={draggingConnection}
            headerHeight={HEADER_HEIGHT}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={onSelectConnection}
            onConnectionContextMenu={onConnectionContextMenu}
          />
        </svg>

        <NodeLayer
          nodes={nodes}
          getNodeDefinition={getNodeDefinition}
          createNodeDragStartHandler={createNodeDragStartHandler}
          selectedNodeIds={selectedNodeIds} 
          draggingNodeId={draggingNodeId}
          onSelectNode={props.onSelectNode} 
          onNodeContextMenu={onNodeContextMenu}
          nodeExecutionStates={nodeExecutionStates}
          isConnectionDraggingActive={isConnectionDraggingActive}
          onPortMouseDownForConnection={initiateConnectionDrag}
          onPortPointerEnterForConnection={handlePortPointerEnterForConnection}
          onPortPointerLeaveForConnection={handlePortPointerLeaveForConnection}
          onPortPointerUpForConnection={handlePortPointerUpForConnection}
          hoveredTargetPortInfo={hoveredTargetPortInfo}
          allValidTargetPorts={allValidTargetPorts}
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          updateNodeData={updateNodeData}
          getUpstreamNodeVisualStateManager={getUpstreamNodeVisualStateManager} 
          getQueuedInputsForDownstreamPort={getQueuedInputsForDownstreamPort} 
          onOpenCustomUiPreview={onOpenCustomUiPreview} // Pass new prop
          mergedModelConfigs={mergedModelConfigs} // Pass mergedModelConfigs to NodeLayer
        />
      </div>
      
      <MarqueeRectangle rect={marqueeHook.marqueeRect} />
      <DefiningAreaRectangle rect={areaDefinitionHook.definingAreaRect} /> 
    </div>
  );
};
