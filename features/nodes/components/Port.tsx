
import React from 'react';
import { NodePort, PortDataType, Node as NodeType } from '../../../types'; // Added NodeType
import { PortInteractionInfo } from '../../connections/types/connectionTypes';
import { PORT_VISUAL_DIAMETER, DIAMOND_SIDE_SCALE_FACTOR } from '../../../components/renderingConstants'; 
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';


interface PortProps {
  port: NodePort;
  nodeWidth: number; 
  type: 'input' | 'output'; 
  portCenterYOffset: number; 
  node: NodeType; 
  
  isConnectionDraggingActive: boolean;
  isCurrentlyHoveredAsTarget: boolean; 
  isCurrentlyValidTarget: boolean;    
  isHighlightedAsSelectedEndpoint?: boolean; 
  isHighlightedAsGeneralDragTarget?: boolean; 
  
  portErrorDetails?: { message: string }; 
  isMissingData?: boolean; 
  isSatisfiedButWaiting?: boolean; 
  isDataQueuedDueToNodeBusy?: boolean;  
  
  queueRank?: number; 
  isPrimaryQueuedItem?: boolean; 
  isReflectingDownstreamError?: boolean; 
  isReflectingDownstreamWaiting?: boolean; 
  reflectingDownstreamSatisfiedWaitingRank?: number; 


  onStartConnection?: (event: React.MouseEvent<HTMLDivElement>) => void; 
  onPortPointerEnter?: () => void; 
  onPortPointerLeave?: () => void; 
  onPortPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void; 
}

export const Port: React.FC<PortProps> = ({
  port,
  nodeWidth,
  type,
  portCenterYOffset,
  node, 
  isConnectionDraggingActive,
  isCurrentlyHoveredAsTarget,
  isCurrentlyValidTarget,
  isHighlightedAsSelectedEndpoint, 
  isHighlightedAsGeneralDragTarget,
  
  portErrorDetails,
  isMissingData,
  isSatisfiedButWaiting,
  isDataQueuedDueToNodeBusy, 
  
  queueRank, 
  isPrimaryQueuedItem, 
  isReflectingDownstreamError,
  isReflectingDownstreamWaiting,
  reflectingDownstreamSatisfiedWaitingRank, 

  onStartConnection,
  onPortPointerEnter,
  onPortPointerLeave,
  onPortPointerUp,
}) => {
  let portCssWidth: string;
  let portCssHeight: string;
  let portHorizontalOffsetMagnitude: number;
  let portBorderRadius: string = '50%';
  let individualPortTransform: string = '';

  let effectiveShape = port.shape;
  let effectiveDataType = port.dataType;

  // Special handling for SubworkflowInput/Output nodes to derive shape and type from node.data
  const isSubworkflowInterfaceNode = node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY || node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY;
  if (isSubworkflowInterfaceNode) {
    effectiveDataType = node.data?.portDataType || port.dataType;
    const isActuallyRequired = node.data?.isPortRequired === true;
    if (isActuallyRequired && effectiveDataType !== PortDataType.FLOW) {
      effectiveShape = 'diamond';
    } else {
      effectiveShape = 'circle';
    }
  } else {
    // Shape determination based on isPortRequired and isDataRequiredOnConnection
    const isPortRequiredByDef = port.isPortRequired;
    // Default isDataRequiredOnConnection to true if undefined (maintains current circle behavior for optional connections)
    const isDataRequiredOnConnectionByDef = port.isDataRequiredOnConnection === undefined ? true : port.isDataRequiredOnConnection;

    if (port.dataType === PortDataType.FLOW) {
        effectiveShape = isPortRequiredByDef ? 'diamond' : 'circle';
    } else { // Data ports
        if (isPortRequiredByDef) { // Must connect, must have data
            effectiveShape = 'diamond';
        } else { // Optional connection
            if (isDataRequiredOnConnectionByDef) { // Optional connect, but if connected, data is required
                effectiveShape = 'circle';
            } else { // Optional connect, and if connected, data is also optional (can be undefined)
                effectiveShape = 'square';
            }
        }
    }
  }

  // Calculate diamondSquareSide once, as it's used by both 'diamond' and 'square' (now)
  const diamondSquareSide = PORT_VISUAL_DIAMETER * DIAMOND_SIDE_SCALE_FACTOR;

  if (effectiveShape === 'diamond') {
    portCssWidth = `${diamondSquareSide}px`;
    portCssHeight = `${diamondSquareSide}px`;
    portHorizontalOffsetMagnitude = diamondSquareSide / 2;
    portBorderRadius = '2px'; 
    individualPortTransform = 'rotate(45deg)';
  } else if (effectiveShape === 'square') {
    // Use diamondSquareSide for square's dimensions and offset calculation
    // to match the unrotated diamond's size.
    portCssWidth = `${diamondSquareSide}px`;
    portCssHeight = `${diamondSquareSide}px`;
    portHorizontalOffsetMagnitude = diamondSquareSide / 2;
    portBorderRadius = '2px'; // Slight rounding for squares
    individualPortTransform = ''; // No rotation for square
  } else { // Circle (default)
    portCssWidth = `${PORT_VISUAL_DIAMETER}px`;
    portCssHeight = `${PORT_VISUAL_DIAMETER}px`;
    portHorizontalOffsetMagnitude = PORT_VISUAL_DIAMETER / 2;
    portBorderRadius = '50%';
    individualPortTransform = '';
  }

  const portBaseClasses = "absolute border-2 cursor-pointer transition-all duration-100 ease-in-out"; 
  let portColorClasses = "";
  
  const themePorts = vscodeDarkTheme.ports;
  const themeDataTypeColors = themePorts.dataTypeColors;
  const portRole = type;

  let resolvedColors = themeDataTypeColors[effectiveDataType]?.[portRole];
  if (!resolvedColors) {
    resolvedColors = themeDataTypeColors[PortDataType.UNKNOWN]?.[portRole];
    if (!resolvedColors) { 
      resolvedColors = { 
        bg: 'bg-gray-500', 
        border: themePorts.portBaseBorder || 'border-gray-700', 
        hoverBg: 'hover:bg-gray-400',
        strokeHex: '#A0A0A0'
      }; 
    }
  }
  
  portColorClasses = `${resolvedColors.bg} ${resolvedColors.hoverBg}`; 
  
  let baseBorderClass = resolvedColors.border;
  let outerRingClasses = "";

  if (portErrorDetails) {
    outerRingClasses = 'ring-2 ring-red-600 ring-offset-2 ring-offset-zinc-800'; 
  } else if (type === 'output') {
    if (isReflectingDownstreamError) {
      outerRingClasses = `ring-2 ${themePorts.downstreamErrorReflectedRing || 'ring-red-600'} ring-offset-2 ring-offset-zinc-800`;
    } else if (isReflectingDownstreamWaiting) {
      outerRingClasses = `ring-2 ${themePorts.downstreamWaitingReflectedRing || 'ring-orange-500'} ring-offset-2 ring-offset-zinc-800`;
    } else if (reflectingDownstreamSatisfiedWaitingRank === 1) {
      outerRingClasses = `ring-2 ${themePorts.downstreamSatisfiedWaitingReflectedRingPrimary || 'ring-green-400'} ring-offset-2 ring-offset-zinc-800`;
    } else if (reflectingDownstreamSatisfiedWaitingRank && reflectingDownstreamSatisfiedWaitingRank > 1) {
      outerRingClasses = `ring-2 ${themePorts.downstreamSatisfiedWaitingReflectedRingSecondary || 'ring-green-600'} ring-offset-2 ring-offset-zinc-800`;
    } else if (isPrimaryQueuedItem) {
      outerRingClasses = `ring-2 ${themePorts.primaryQueuedRing || 'ring-cyan-400'} ring-offset-2 ring-offset-zinc-800`;
    } else if (queueRank && queueRank > 1) {
      outerRingClasses = `ring-2 ${themePorts.secondaryQueuedRing || 'ring-cyan-700'} ring-offset-2 ring-offset-zinc-800`;
    }
  } else if (type === 'input') {
    if (isDataQueuedDueToNodeBusy) {
      outerRingClasses = 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-800'; 
    } else if (isMissingData) {
      outerRingClasses = 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-800'; 
    } else if (isSatisfiedButWaiting) {
      outerRingClasses = 'ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-800'; 
    }
  }

  if (outerRingClasses === "") {
    if (isConnectionDraggingActive && isCurrentlyHoveredAsTarget) { 
      baseBorderClass = isCurrentlyValidTarget
        ? themePorts.validTargetHighlightBorder
        : themePorts.invalidTargetForbiddenBorder;
    } else if (isHighlightedAsSelectedEndpoint) {
      baseBorderClass = themePorts.selectedConnectionEndpointBorder || 'border-sky-300';
    } else if (isConnectionDraggingActive && isHighlightedAsGeneralDragTarget) { 
      baseBorderClass = themePorts.generalDragTargetHighlightBorder || 'border-blue-400'; 
    }
  }

  const finalAppliedClasses = `${portBaseClasses} ${portColorClasses} ${baseBorderClass} ${outerRingClasses}`.trim();

  const portStyle: React.CSSProperties = {
    width: portCssWidth,
    height: portCssHeight,
    borderRadius: portBorderRadius,
    top: `${portCenterYOffset}px`,
    transform: `translateY(-50%) ${individualPortTransform}`, 
    transformOrigin: 'center center',
    boxSizing: 'border-box', 
  };

  if (type === 'input') {
    portStyle.left = `-${portHorizontalOffsetMagnitude}px`;
  } else { 
    portStyle.right = `-${portHorizontalOffsetMagnitude}px`;
  }

  const labelBaseClasses = `absolute pointer-events-none whitespace-nowrap ${themePorts.label}`;
  const labelStyle: React.CSSProperties = {
    top: `${portCenterYOffset}px`,
    transform: 'translateY(-50%)',
    fontSize: '10px', 
  };
  
  const portDisplayName = (isSubworkflowInterfaceNode ? (node.data?.portName || port.label) : (port.label));


  if (portDisplayName) {
    const labelGap = 4; 
    // Label offset is consistently based on PORT_VISUAL_DIAMETER / 2 from the node edge.
    // This ensures labels align visually even if port symbols have slightly different effective radii.
    const labelOffsetFromNodeEdge = (PORT_VISUAL_DIAMETER / 2) + labelGap;
    if (type === 'input') {
      labelStyle.left = `${labelOffsetFromNodeEdge}px`;
    } else {
      labelStyle.right = `${labelOffsetFromNodeEdge}px`;
    }
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onStartConnection) {
      onStartConnection(event);
    }
  };
  
  const handlePointerEnter = () => {
    if (isConnectionDraggingActive && onPortPointerEnter) {
      onPortPointerEnter();
    }
  };
  
  const handlePointerLeave = () => {
    if (isConnectionDraggingActive && onPortPointerLeave) {
      onPortPointerLeave();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isConnectionDraggingActive && onPortPointerUp) {
      event.stopPropagation(); 
      onPortPointerUp(event); 
    }
  };

  let titleText = `${portDisplayName} (${effectiveDataType} ${type})`;
  if (portErrorDetails) {
    titleText += ` - 错误: ${portErrorDetails.message}`;
  } else if (type === 'output') {
    if (isReflectingDownstreamError) {
      titleText += ' - 反映下游错误';
    } else if (isReflectingDownstreamWaiting) {
      titleText += ' - 反映下游等待中';
    } else if (reflectingDownstreamSatisfiedWaitingRank !== undefined) {
      let rankSuffix = 'th';
      if (reflectingDownstreamSatisfiedWaitingRank === 1) rankSuffix = 'st';
      else if (reflectingDownstreamSatisfiedWaitingRank === 2) rankSuffix = 'nd';
      else if (reflectingDownstreamSatisfiedWaitingRank === 3) rankSuffix = 'rd';
      titleText += ` - 反映下游已就绪 (等待其他, 队列 #${reflectingDownstreamSatisfiedWaitingRank}${rankSuffix})`;
    } else if (queueRank !== undefined) {
      let rankSuffix = 'th';
      if (queueRank === 1) rankSuffix = 'st';
      else if (queueRank === 2) rankSuffix = 'nd';
      else if (queueRank === 3) rankSuffix = 'rd';
      titleText += ` - 排队: ${queueRank}${rankSuffix}`;
    }
  } else if (type === 'input') {
    if (isDataQueuedDueToNodeBusy) {
      titleText += ' - 数据已到达，节点运行中，等待处理';
    } else if (isMissingData) {
      titleText += ' - 等待数据';
    } else if (isSatisfiedButWaiting) {
      titleText += ' - 已就绪, 等待其他输入';
    }
  }

  return (
    <>
      <div
        title={titleText}
        className={finalAppliedClasses}
        style={portStyle}
        aria-label={`${type === 'input' ? 'Input' : 'Output'} port ${portDisplayName}, type ${effectiveDataType}, shape ${effectiveShape || 'circle'}${titleText.substring(titleText.indexOf(' - ') === -1 ? titleText.length : titleText.indexOf(' - '))}`}
        onMouseDown={handleMouseDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
      />
      {portDisplayName && (
        <span style={labelStyle} className={labelBaseClasses}>{portDisplayName}</span>
      )}
    </>
  );
};
