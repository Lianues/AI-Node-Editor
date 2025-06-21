import { NodePort } from '../types';
import {
  HEADER_HEIGHT as globalHeaderHeight, // Renamed to avoid conflict if passed as param
  PORT_VISUAL_DIAMETER,
  PORT_AREA_PADDING_TOP,
  PORT_AREA_PADDING_BOTTOM,
  VERTICAL_GAP_BETWEEN_PORTS,
  NODE_BODY_CONTENT_PADDING_BOTTOM,
  CUSTOM_CONTENT_TITLE_HEIGHT
} from '../components/renderingConstants';

// Calculate height required for a single set of ports (either inputs or outputs)
export const calculatePortSetHeight = (numPorts: number): number => {
  if (numPorts === 0) return 0;
  // If ports exist, they need their top/bottom padding within their designated area.
  return PORT_AREA_PADDING_TOP +
         (numPorts * PORT_VISUAL_DIAMETER) +
         Math.max(0, numPorts - 1) * VERTICAL_GAP_BETWEEN_PORTS +
         PORT_AREA_PADDING_BOTTOM;
};

export const calculateNodeHeight = (
  inputs: NodePort[],
  outputs: NodePort[],
  headerHeight: number = globalHeaderHeight,
  definedCustomContentBlockHeight: number = 0,
  definedCustomContentTitle?: string 
): number => {
  const numInputPorts = inputs.length;
  const numOutputPorts = outputs.length;

  const portsAreaHeight = (numInputPorts > 0 || numOutputPorts > 0)
    ? Math.max(calculatePortSetHeight(numInputPorts), calculatePortSetHeight(numOutputPorts))
    : 0;

  let customContentTitleAreaHeight = 0;
  if (definedCustomContentTitle && definedCustomContentBlockHeight > 0) {
    customContentTitleAreaHeight = CUSTOM_CONTENT_TITLE_HEIGHT;
  }

  let finalBodyHeight: number;

  if (portsAreaHeight === 0 && definedCustomContentBlockHeight === 0 && customContentTitleAreaHeight === 0) {
    finalBodyHeight = NODE_BODY_CONTENT_PADDING_BOTTOM;
  } else {
    finalBodyHeight = portsAreaHeight + 
                      customContentTitleAreaHeight + 
                      definedCustomContentBlockHeight + 
                      NODE_BODY_CONTENT_PADDING_BOTTOM;
  }
  
  return headerHeight + finalBodyHeight;
};


export const calculatePortOffsetY = (
  portIndex: number,
): number => {
  return PORT_AREA_PADDING_TOP + 
         (portIndex * (PORT_VISUAL_DIAMETER + VERTICAL_GAP_BETWEEN_PORTS)) + 
         (PORT_VISUAL_DIAMETER / 2);
};