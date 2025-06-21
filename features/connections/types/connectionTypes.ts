
import { PortDataType, NodePort, Node } from '../../../types'; // Node, NodePort, PortDataType are general

export interface ConnectionPortIdentifier {
  nodeId: string;
  portId: string;
  portSide: 'input' | 'output';
  dataType: PortDataType;
}

export interface DraggingConnectionState {
  source: ConnectionPortIdentifier;
  sourcePosition: { x: number; y: number }; // World coordinates
  currentTargetMouseWorld: { x: number; y: number }; // World coordinates
}

export interface HoveredTargetInfo {
  node: Node;
  port: NodePort;
  portIndex: number;
  portSide: 'input' | 'output';
  dataType: PortDataType;
  isValid: boolean; 
}

export interface PortInteractionInfo {
  node: Node;
  port: NodePort;
  portIndex: number;
  portSide: 'input' | 'output';
}

export interface ConnectionTimingInfo {
  sendTimestamp?: number;
  arrivalTimestamp?: number;
  consumptionTimestamp?: number;
  timeToArrival?: number; 
  timeToConsumption?: number; 
  displayUntil?: number; // Timestamp after which this info should ideally not be displayed
}

export interface Connection {
  id: string;
  source: ConnectionPortIdentifier;
  target: ConnectionPortIdentifier;
  color: string;
  lastTimingInfo?: ConnectionTimingInfo; // Added for timing display
}
