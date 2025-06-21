
import { Node, PortDataType } from '../../../types';
import { Connection } from '../types/connectionTypes';
import { calculatePortOffsetY } from '../../../nodes/nodeLayoutUtils';
import { PORT_VISUAL_DIAMETER } from '../../../components/renderingConstants';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

/**
 * Calculates the world coordinates of the center of a port.
 * @param node The node the port belongs to.
 * @param portIndex The index of the port in its respective array (inputs or outputs).
 * @param portSide Indicates if it's an 'input' or 'output' port.
 * @param headerHeight The height of the node's header.
 * @returns The {x, y} world coordinates of the port's center.
 */
export const calculatePortCenterWorldPosition = (
  node: Node,
  portIndex: number,
  portSide: 'input' | 'output',
  headerHeight: number
): { x: number; y: number } => {
  const portCenterYInNodeBody = calculatePortOffsetY(portIndex);
  const worldY = node.y + headerHeight + portCenterYInNodeBody;

  let worldX: number;
  if (portSide === 'input') {
    worldX = node.x;
  } else { // 'output'
    worldX = node.x + node.width;
  }

  return { x: worldX, y: worldY };
};


/**
 * Gets the themed stroke color for a connection line based on its port's data type and role.
 * Reads directly from `vscodeDarkTheme.ports.dataTypeColors[dataType][portRole].strokeHex`.
 * @param dataType The PortDataType of the source port.
 * @param portRole Whether the source port is an 'input' or 'output'.
 * @returns A string representing the hex color for the connection path.
 */
export const getPortColorByDataType = (dataType: PortDataType, portRole: 'input' | 'output'): string => {
  const themeColors = vscodeDarkTheme.ports.dataTypeColors;
  const roleSpecificColors = themeColors[dataType]?.[portRole];
  
  if (roleSpecificColors?.strokeHex) {
    return roleSpecificColors.strokeHex;
  }
  
  const unknownRoleSpecificColors = themeColors[PortDataType.UNKNOWN]?.[portRole];
  if (unknownRoleSpecificColors?.strokeHex) {
    return unknownRoleSpecificColors.strokeHex;
  }
  
  const anyRoleForDataType = themeColors[dataType]?.input?.strokeHex || themeColors[dataType]?.output?.strokeHex;
  if (anyRoleForDataType) {
    return anyRoleForDataType;
  }
  
  const unknownAnyRole = themeColors[PortDataType.UNKNOWN]?.input?.strokeHex || themeColors[PortDataType.UNKNOWN]?.output?.strokeHex;
  if (unknownAnyRole) {
    return unknownAnyRole;
  }

  return '#A0A0A0'; 
};

export const determineConnectionColor = (
  sourceDataType: PortDataType,
  targetDataType: PortDataType
): string => {
  if (sourceDataType === PortDataType.ANY && targetDataType === PortDataType.ANY) {
    return getPortColorByDataType(PortDataType.STRING, 'output'); 
  } else if (sourceDataType === PortDataType.ANY && targetDataType !== PortDataType.ANY) {
    return getPortColorByDataType(targetDataType, 'input');
  } else if (sourceDataType !== PortDataType.ANY && targetDataType === PortDataType.ANY) {
    return getPortColorByDataType(sourceDataType, 'output');
  } else {
    return getPortColorByDataType(sourceDataType, 'output');
  }
};

export interface BezierPathResult {
  pathD: string;
  controlPoints: { cp1: { x: number; y: number }; cp2: { x: number; y: number } };
}

/**
 * Calculates the SVG path 'd' attribute for a cubic Bézier curve and its control points.
 * @returns An object containing the path 'd' attribute string and the control points.
 */
export const calculateBezierPathDAttribute = (
  startX: number, // start X
  startY: number, // start Y
  endX: number,   // end X
  endY: number,   // end Y
  sourceSide: 'input' | 'output', // Port side of the source
  targetSide?: 'input' | 'output' // Port side of the target
): BezierPathResult => { // Use the explicit interface as return type
  const dx = endX - startX;
  const dy = endY - startY;

  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 10) { 
    return {
      pathD: `M ${startX} ${startY} L ${endX} ${endY}`,
      controlPoints: { cp1: { x: startX, y: startY }, cp2: { x: endX, y: endY } } // Straight line approx.
    };
  }

  const horizontalOffsetFactor = 0.5; 
  let baseHorizontalOffset = Math.abs(dx) * horizontalOffsetFactor;

  const minOffset = 25;    
  const maxOffset = 150;   
  
  let horizontalOffset = Math.max(minOffset, Math.min(baseHorizontalOffset, maxOffset));

  if (Math.abs(dx) < Math.abs(dy) * 0.5 && Math.abs(dx) < minOffset * 2 ) {
    horizontalOffset = Math.max(minOffset, Math.min(Math.abs(dy) * 0.2, maxOffset, 75));
  }

  let cp1x: number;
  let cp2x: number;

  if (sourceSide === 'output') {
    cp1x = startX + horizontalOffset;
  } else { 
    cp1x = startX - horizontalOffset;
  }
  const cp1y = startY;

  const effectiveTargetSide = targetSide || (sourceSide === 'output' ? 'input' : 'output');

  if (effectiveTargetSide === 'input') {
    cp2x = endX - horizontalOffset;
  } else { 
    cp2x = endX + horizontalOffset;
  }
  const cp2y = endY;

  return {
    pathD: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
    controlPoints: { cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y } }
  };
};

export const getSelectedConnectionEndpointPortId = (
  nodeId: string,
  connections: Connection[],
  selectedConnectionId: string | null
): string | null => {
  if (!selectedConnectionId) return null;
  const selectedConn = connections.find(c => c.id === selectedConnectionId);
  if (!selectedConn) return null;
  if (selectedConn.source.nodeId === nodeId) return selectedConn.source.portId;
  if (selectedConn.target.nodeId === nodeId) return selectedConn.target.portId;
  return null;
};
