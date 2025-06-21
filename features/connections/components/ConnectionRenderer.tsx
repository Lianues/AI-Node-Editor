
import React, { useEffect, useRef } from 'react';
import { Node } from '../../../types';
import { Connection, DraggingConnectionState, ConnectionTimingInfo } from '../types/connectionTypes'; // Added ConnectionTimingInfo
import { ConnectionPath } from './ConnectionPath';
import { 
  calculatePortCenterWorldPosition, 
  calculateBezierPathDAttribute, 
  getPortColorByDataType,
  BezierPathResult // Import the new interface
} from '../utils/connectionUtils';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';


const BASE_STROKE_WIDTH = 2;
const TIMING_TEXT_COLOR = '#a0aec0'; // zinc-500
const TIMING_FONT_SIZE = '9px';

// Helper to calculate a point along the Bezier curve (e.g., midpoint t=0.5)
const getPointOnBezierCurve = (
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
};


interface ConnectionRendererProps {
  nodes: Node[];
  connections: Connection[];
  draggingConnection: DraggingConnectionState | null;
  headerHeight: number;
  selectedConnectionId: string | null;
  onSelectConnection: (connectionId: string | null) => void;
  onConnectionContextMenu: (event: React.MouseEvent, connectionId: string) => void; 
  // No onConnectionUpdate needed here, WEM handles updates, this just renders
}

export const ConnectionRenderer: React.FC<ConnectionRendererProps> = ({
  nodes,
  connections,
  draggingConnection,
  headerHeight,
  selectedConnectionId,
  onSelectConnection,
  onConnectionContextMenu, 
}) => {

  return (
    <>
      {connections.map(conn => {
        const sourceNode = nodes.find(n => n.id === conn.source.nodeId);
        const targetNode = nodes.find(n => n.id === conn.target.nodeId);

        if (!sourceNode || !targetNode) return null;

        let sourcePortIndex = (conn.source.portSide === 'input')
          ? sourceNode.inputs.findIndex(p => p.id === conn.source.portId)
          : sourceNode.outputs.findIndex(p => p.id === conn.source.portId);

        let targetPortIndex = (conn.target.portSide === 'input')
          ? targetNode.inputs.findIndex(p => p.id === conn.target.portId)
          : targetNode.outputs.findIndex(p => p.id === conn.target.portId);
        
        if (sourcePortIndex === -1 || targetPortIndex === -1) return null;

        const startPos = calculatePortCenterWorldPosition(sourceNode, sourcePortIndex, conn.source.portSide, headerHeight);
        const endPos = calculatePortCenterWorldPosition(targetNode, targetPortIndex, conn.target.portSide, headerHeight);
        
        const pathResult: BezierPathResult = calculateBezierPathDAttribute(
          startPos.x, startPos.y, endPos.x, endPos.y,
          conn.source.portSide, conn.target.portSide
        );
        const { pathD, controlPoints } = pathResult;

        const isSelected = conn.id === selectedConnectionId;
        const timingInfo = conn.lastTimingInfo;
        let showTiming = false;
        let timingText1 = "";
        let timingText2 = "";

        if (timingInfo) {
          if (timingInfo.displayUntil && Date.now() < timingInfo.displayUntil) {
            showTiming = true;
            if (timingInfo.timeToArrival !== undefined) {
              timingText1 = `到达: ${timingInfo.timeToArrival}ms`;
            }
            if (timingInfo.timeToConsumption !== undefined) {
              timingText2 = `使用: ${timingInfo.timeToConsumption}ms`;
            }
          }
        }
        
        // Calculate text position (midpoint of the Bezier curve)
        const textPos = getPointOnBezierCurve(startPos, controlPoints.cp1, controlPoints.cp2, endPos, 0.5);

        const handleContextMenu = (event: React.MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          onConnectionContextMenu(event, conn.id);
        };

        return (
          <g key={conn.id}>
            <ConnectionPath
              pathD={pathD}
              color={conn.color} 
              strokeWidth={BASE_STROKE_WIDTH} 
              isSelected={isSelected}
              onClick={() => onSelectConnection(conn.id)}
              onContextMenu={handleContextMenu} 
              cursor="pointer"
            />
            {showTiming && timingText1 && (
              <text
                x={textPos.x}
                y={textPos.y - (timingText2 ? 5 : 0)} // Offset if two lines
                dominantBaseline="middle"
                textAnchor="middle"
                style={{ fontSize: TIMING_FONT_SIZE, fill: TIMING_TEXT_COLOR, pointerEvents: 'none' }}
              >
                {timingText1}
              </text>
            )}
            {showTiming && timingText2 && (
              <text
                x={textPos.x}
                y={textPos.y + (timingText1 ? 5 : 0)} // Offset if two lines
                dominantBaseline="middle"
                textAnchor="middle"
                style={{ fontSize: TIMING_FONT_SIZE, fill: TIMING_TEXT_COLOR, pointerEvents: 'none' }}
              >
                {timingText2}
              </text>
            )}
          </g>
        );
      })}

      {draggingConnection && (
          <ConnectionPath
            pathD={calculateBezierPathDAttribute( // Also apply to this call
              draggingConnection.sourcePosition.x,
              draggingConnection.sourcePosition.y,
              draggingConnection.currentTargetMouseWorld.x,
              draggingConnection.currentTargetMouseWorld.y,
              draggingConnection.source.portSide
            ).pathD}
            color={getPortColorByDataType(draggingConnection.source.dataType, draggingConnection.source.portSide)}
            strokeWidth={BASE_STROKE_WIDTH}
          />
      )}
    </>
  );
};
