
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Node, PortDataType, NodePort } from '../../../types';
import {
    DraggingConnectionState,
    HoveredTargetInfo,
    ConnectionPortIdentifier,
    PortInteractionInfo,
    Connection
} from '../types/connectionTypes';
import { calculatePortCenterWorldPosition } from '../utils/connectionUtils';
import { HEADER_HEIGHT } from '../../../components/renderingConstants';
import { isValidConnection } from '../validation/connectionValidation';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';

interface UseConnectionDraggingProps {
  draggingConnection: DraggingConnectionState | null;
  setDraggingConnection: React.Dispatch<React.SetStateAction<DraggingConnectionState | null>>;
  canvasRef: React.RefObject<HTMLDivElement>;
  panX: number;
  panY: number;
  scale: number;
  nodes: Node[];
  existingConnections: Connection[];
  onCompleteConnection: (
    source: ConnectionPortIdentifier,
    target: ConnectionPortIdentifier
  ) => void;
  onDeleteConnection: (connectionId: string) => void;
  selectedConnectionId: string | null; 
}

const getEffectivePortDataType = (node: Node, port: NodePort): PortDataType => {
  if (node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY && port.id === 'value_out') {
    return node.data?.portDataType || port.dataType;
  }
  if (node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY && port.id === 'value_in') {
    return node.data?.portDataType || port.dataType;
  }
  return port.dataType;
};

export const useConnectionDragging = ({
  draggingConnection,
  setDraggingConnection,
  canvasRef,
  panX,
  panY,
  scale,
  nodes,
  existingConnections,
  onCompleteConnection,
  onDeleteConnection,
  selectedConnectionId, 
}: UseConnectionDraggingProps) => {
  const [hoveredTargetPortInfo, setHoveredTargetPortInfo] = useState<HoveredTargetInfo | null>(null);

  const allValidTargetPorts = useMemo(() => {
    if (!draggingConnection) { 
      return [];
    }
    const validTargets: ConnectionPortIdentifier[] = [];
    const currentSource = draggingConnection.source;
    
    const connectionsForValidation = existingConnections;

    nodes.forEach(node => {
      node.inputs.forEach(port => {
        const effectiveDataType = getEffectivePortDataType(node, port);
        const targetCandidate: ConnectionPortIdentifier = {
          nodeId: node.id,
          portId: port.id,
          portSide: 'input',
          dataType: effectiveDataType,
        };
        if (isValidConnection({ source: currentSource, target: targetCandidate, existingConnections: connectionsForValidation })) {
          validTargets.push(targetCandidate);
        }
      });
      node.outputs.forEach(port => {
        const effectiveDataType = getEffectivePortDataType(node, port);
        const targetCandidate: ConnectionPortIdentifier = {
          nodeId: node.id,
          portId: port.id,
          portSide: 'output',
          dataType: effectiveDataType,
        };
        if (isValidConnection({ source: currentSource, target: targetCandidate, existingConnections: connectionsForValidation })) {
          validTargets.push(targetCandidate);
        }
      });
    });
    return validTargets;
  }, [draggingConnection, nodes, existingConnections]);


  const initiateConnectionDrag = useCallback((
    node: Node,
    port: NodePort,
    portIndex: number,
    portSide: 'input' | 'output',
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    if (event.button !== 0 || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const initialMouseWorldX = (event.clientX - canvasRect.left - panX) / scale;
    const initialMouseWorldY = (event.clientY - canvasRect.top - panY) / scale;

    let connectionToDeleteId: string | undefined = undefined;
    let sourceIdentifierForNewDrag: ConnectionPortIdentifier | undefined = undefined;

    if (selectedConnectionId) { 
      for (const conn of existingConnections) {
          if (conn.id !== selectedConnectionId) { 
              continue;
          }

          let isEndpoint = false;
          let otherEndIdentifier: ConnectionPortIdentifier | undefined = undefined;

          if (conn.source.nodeId === node.id && conn.source.portId === port.id) {
              isEndpoint = true;
              otherEndIdentifier = conn.target;
          } else if (conn.target.nodeId === node.id && conn.target.portId === port.id) {
              isEndpoint = true;
              otherEndIdentifier = conn.source;
          }

          if (isEndpoint && otherEndIdentifier) {
              connectionToDeleteId = conn.id; 
              sourceIdentifierForNewDrag = otherEndIdentifier;
              break; 
          }
      }
    }

    const effectiveDataTypeForSourceDrag = getEffectivePortDataType(node, port);

    if (connectionToDeleteId && sourceIdentifierForNewDrag) {
        onDeleteConnection(connectionToDeleteId);

        const anchoredNode = nodes.find(n => n.id === sourceIdentifierForNewDrag!.nodeId);
        if (!anchoredNode) {
            
            setDraggingConnection(null); return;
        }
        const anchoredPortDefinitionOriginal = (sourceIdentifierForNewDrag.portSide === 'input'
            ? anchoredNode.inputs.find(p => p.id === sourceIdentifierForNewDrag!.portId)
            : anchoredNode.outputs.find(p => p.id === sourceIdentifierForNewDrag!.portId));
        if (!anchoredPortDefinitionOriginal) {
             
             setDraggingConnection(null); return;
        }
        const anchoredPortIndex = (sourceIdentifierForNewDrag.portSide === 'input'
            ? anchoredNode.inputs.indexOf(anchoredPortDefinitionOriginal)
            : anchoredNode.outputs.indexOf(anchoredPortDefinitionOriginal));
        if (anchoredPortIndex === -1) {
             
             setDraggingConnection(null); return;
        }
        
        const newDragSourcePosition = calculatePortCenterWorldPosition(
            anchoredNode, anchoredPortIndex, sourceIdentifierForNewDrag.portSide, HEADER_HEIGHT
        );
        
        const effectiveDataTypeForNewDragSource = getEffectivePortDataType(anchoredNode, anchoredPortDefinitionOriginal);

        setDraggingConnection({
            source: { ...sourceIdentifierForNewDrag, dataType: effectiveDataTypeForNewDragSource },
            sourcePosition: newDragSourcePosition,
            currentTargetMouseWorld: { x: initialMouseWorldX, y: initialMouseWorldY },
        });

    } else {
        const sourcePosition = calculatePortCenterWorldPosition(node, portIndex, portSide, HEADER_HEIGHT);
        setDraggingConnection({
            source: { nodeId: node.id, portId: port.id, portSide: portSide, dataType: effectiveDataTypeForSourceDrag },
            sourcePosition: sourcePosition,
            currentTargetMouseWorld: { x: initialMouseWorldX, y: initialMouseWorldY },
        });
    }
    setHoveredTargetPortInfo(null);
  }, [
    canvasRef, panX, panY, scale, existingConnections, nodes, selectedConnectionId, 
    setDraggingConnection, onDeleteConnection,
  ]);

  useEffect(() => {
    const canvasElem = canvasRef.current;

    if (!draggingConnection || !canvasElem) {
        return; 
    }

    const handleGlobalMouseMoveWhileDragging = (event: MouseEvent) => {
        const rect = canvasElem.getBoundingClientRect();
        const worldX = (event.clientX - rect.left - panX) / scale;
        const worldY = (event.clientY - rect.top - panY) / scale;
        setDraggingConnection(prev => {
            if (!prev) return null; 
            return { ...prev, currentTargetMouseWorld: { x: worldX, y: worldY } };
        });
    };

    const handleGlobalMouseUpGeneral = (event: MouseEvent) => {
        setDraggingConnection(null); 
        setHoveredTargetPortInfo(null); 
    };

    document.addEventListener('mousemove', handleGlobalMouseMoveWhileDragging);
    document.addEventListener('mouseup', handleGlobalMouseUpGeneral);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMoveWhileDragging);
      document.removeEventListener('mouseup', handleGlobalMouseUpGeneral);
    };
  }, [draggingConnection, panX, panY, scale, canvasRef, setDraggingConnection, setHoveredTargetPortInfo]);


  const handlePortPointerEnter = useCallback((portInfo: PortInteractionInfo) => {
    if (!draggingConnection) return; 

    const effectiveTargetDataType = getEffectivePortDataType(portInfo.node, portInfo.port);
    const targetIdentifier: ConnectionPortIdentifier = {
      nodeId: portInfo.node.id,
      portId: portInfo.port.id,
      portSide: portInfo.portSide,
      dataType: effectiveTargetDataType,
    };
    
    const connectionsForValidation = existingConnections;

    const isValid = isValidConnection({
      source: draggingConnection.source, 
      target: targetIdentifier,
      existingConnections: connectionsForValidation,
    });

    // Explicitly create and type the object to help TypeScript
    const newHoveredTargetInfo: HoveredTargetInfo = {
      node: portInfo.node,
      port: portInfo.port,
      portIndex: portInfo.portIndex,
      portSide: portInfo.portSide,
      dataType: effectiveTargetDataType, // Store effective type in hovered info
      isValid,
    };
    setHoveredTargetPortInfo(newHoveredTargetInfo);

  }, [existingConnections, draggingConnection]); 

  const handlePortPointerLeave = useCallback((portInfo: PortInteractionInfo) => {
    if (hoveredTargetPortInfo && hoveredTargetPortInfo.node.id === portInfo.node.id && hoveredTargetPortInfo.port.id === portInfo.port.id) {
      setHoveredTargetPortInfo(null);
    }
  }, [hoveredTargetPortInfo]);

  const handlePortPointerUp = useCallback((portInfo: PortInteractionInfo) => {
    const currentDraggingConn = draggingConnection; 

    if (currentDraggingConn && hoveredTargetPortInfo && hoveredTargetPortInfo.isValid &&
        hoveredTargetPortInfo.node.id === portInfo.node.id &&
        hoveredTargetPortInfo.port.id === portInfo.port.id) {
      
      const effectiveTargetDataTypeOnUp = getEffectivePortDataType(portInfo.node, portInfo.port);
      const targetIdentifier: ConnectionPortIdentifier = {
        nodeId: portInfo.node.id,
        portId: portInfo.port.id,
        portSide: portInfo.portSide,
        dataType: effectiveTargetDataTypeOnUp,
      };
      onCompleteConnection(
          currentDraggingConn.source,
          targetIdentifier
      );
    }
    setDraggingConnection(null);
    setHoveredTargetPortInfo(null);
  }, [hoveredTargetPortInfo, onCompleteConnection, setDraggingConnection, setHoveredTargetPortInfo, draggingConnection]); 

  let connectionCursorStyle: string | null = null;
  if (draggingConnection) { 
    if (hoveredTargetPortInfo) {
      connectionCursorStyle = hoveredTargetPortInfo.isValid ? 'crosshair' : 'not-allowed';
    } else {
      connectionCursorStyle = 'crosshair';
    }
  }

  return {
    initiateConnectionDrag,
    hoveredTargetPortInfo, 
    handlePortPointerEnterForConnection: handlePortPointerEnter,
    handlePortPointerLeaveForConnection: handlePortPointerLeave,
    handlePortPointerUpForConnection: handlePortPointerUp,
    connectionCursorStyle, 
    allValidTargetPorts, 
  };
};
