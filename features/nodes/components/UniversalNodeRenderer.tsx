
import React from 'react';
import { SpecificNodeRendererProps, NodePort as NodePortType, NodeTypeDefinition, NodeExecutionState, PortDataType, Node as NodeType, ModelConfigGroup, EditableAiModelConfig } from '../../../types'; // Added ModelConfigGroup, EditableAiModelConfig
import { PortInteractionInfo, Connection } from '../../connections/types/connectionTypes';
import { Port } from './Port';
import { HEADER_HEIGHT, CUSTOM_CONTENT_TITLE_HEIGHT } from '../../../components/renderingConstants';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { calculatePortOffsetY, calculatePortSetHeight } from '../../../nodes/nodeLayoutUtils';
import { UpstreamNodeVisualStateManager, UpstreamDataState } from '../../execution/engine/UpstreamNodeVisualStateManager';
import { PortDataCacheEntry, UpstreamSourceInfo } from '../../execution/engine/PropagationEngine';
import { getContextColor } from '../../execution/utils/contextDisplayUtils';
import { calculateOutputPortState, OutputPortStateResult } from '../utils/outputPortStateCalculator';
import { NodeHeaderContent } from './NodeHeaderContent';
import { CUSTOM_UI_NODE_TYPE_KEY } from '../../../nodes/CustomUiNode/Definition';
import { AI_MODEL_SELECTION_NODE_TYPE_KEY } from '../../../nodes/AiModelSelectionNode/Definition'; // Import new node type

const UniversalNodeRenderer: React.FC<SpecificNodeRendererProps & { mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig> }> = ({ // Add mergedModelConfigs to props
  node,
  onMouseDown,
  onSelect,
  isSelected,
  isDragging,
  isConnectionDraggingActive,
  onPortMouseDownForConnection,
  onPortPointerEnterForConnection,
  onPortPointerLeaveForConnection,
  onPortPointerUpForConnection,
  hoveredPortIdAsTarget,
  isHoveredPortValidTarget,
  portIdToHighlightAsSelectedConnectionEndpoint,
  generalValidDragTargetPortIds,
  updateNodeData,
  getNodeDefinition,
  executionState,
  upstreamDataState,
  getUpstreamNodeVisualStateManager,
  connections,
  getQueuedInputsForDownstreamPort,
  nodeExecutionStates,
  allNodes,
  onOpenCustomUiPreview,
  mergedModelConfigs, // Destructure mergedModelConfigs
}) => {
  const themeNodeColors = vscodeDarkTheme.nodes;

  const customHeaderHexColor = node.data?.customHeaderColor;
  const definitionHeaderBgClass = node.headerColor || themeNodeColors.common.fallbackHeaderBg;

  let headerStyle: React.CSSProperties = { height: `${HEADER_HEIGHT}px` };
  let headerClassName = `rounded-t-md px-3 py-0 flex flex-col justify-center border-b ${themeNodeColors.common.borderUnselected} overflow-hidden`;

  if (typeof node.headerColor === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(node.headerColor)) {
    headerStyle.backgroundColor = node.headerColor;
  } else {
    headerClassName += ` ${definitionHeaderBgClass}`;
  }

  let rawBodyColor = node.bodyColor || themeNodeColors.common.fallbackBodyBg;
  const opacityRegex = /\s*opacity-(\d+)\s*/;
  let finalBodyBgClass = rawBodyColor;

  const opacityMatch = rawBodyColor.match(opacityRegex);

  if (opacityMatch && opacityMatch[1]) {
    const opacityValueStr = opacityMatch[1];
    const baseColorClassCandidate = rawBodyColor.replace(opacityRegex, '').trim();

    if (baseColorClassCandidate) {
      finalBodyBgClass = `${baseColorClassCandidate}/${opacityValueStr}`;
    } else {
      finalBodyBgClass = themeNodeColors.common.fallbackBodyBg;
      console.warn(`Node ${node.id} has invalid bodyColor (only opacity): "${rawBodyColor}". Using fallback background.`);
    }
  }


  const currentVisualStateManager = getUpstreamNodeVisualStateManager ? getUpstreamNodeVisualStateManager() : null;

  let currentBorderColorClass: string;

  if (isSelected) {
    currentBorderColorClass = themeNodeColors.common.borderSelected;
  } else if (executionState?.status === 'running') {
    currentBorderColorClass = 'border-yellow-400';
  } else if (executionState?.status === 'warning') {
    currentBorderColorClass = themeNodeColors.common.borderWarning || 'border-amber-400';
  } else if (executionState?.status === 'error') {
    currentBorderColorClass = 'border-red-500';
  } else if (upstreamDataState === 'queued_at_downstream') {
    currentBorderColorClass = 'border-teal-500';
  } else if (upstreamDataState === 'waiting_for_downstream_others') {
    currentBorderColorClass = 'border-blue-500';
  } else if (executionState?.status === 'completed' || upstreamDataState === 'consumed_by_downstream') {
    currentBorderColorClass = 'border-green-400';
  } else if (executionState?.status === 'paused') {
    currentBorderColorClass = 'border-orange-400';
  } else if (executionState?.status === 'waiting') {
    currentBorderColorClass = executionState.needsFlowSignal ? 'border-blue-400' : 'border-orange-400';
  } else {
    currentBorderColorClass = themeNodeColors.common.borderUnselected;
  }


  let shadowClasses = `${themeNodeColors.common.baseNodeShadow || 'shadow-lg'}`;
  if (isSelected || isDragging || executionState?.status === 'running' || executionState?.status === 'warning' || executionState?.status === 'error' || upstreamDataState === 'queued_at_downstream' || upstreamDataState === 'waiting_for_downstream_others') {
    shadowClasses += ` ${themeNodeColors.common.shadowSelected} ${themeNodeColors.common.shadowSelectedColor || ''}`;
  } else {
    shadowClasses += ` ${themeNodeColors.common.hoverShadow}`;
  }

  const transformClasses = isDragging ? `${themeNodeColors.common.draggingScale || ''} z-10` : 'z-1';
  const cursorClass = isDragging
    ? themeNodeColors.common.draggingCursor
    : (isConnectionDraggingActive ? 'default' : themeNodeColors.common.defaultCursor);

  const overallNodeBodyHeight = node.height - HEADER_HEIGHT;

  const handleNodeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const targetElement = event.target as HTMLElement;
    if (
       targetElement.tagName === 'TEXTAREA' ||
       targetElement.tagName === 'INPUT' ||
       targetElement.tagName === 'SELECT' || // Added SELECT for AiModelSelectionNodeContent
       targetElement.tagName === 'BUTTON' ||
       targetElement.closest('[contenteditable="true"]') ||
       targetElement.closest('button')
     ) {
       event.stopPropagation();
       return;
     }
  };

  const createPortInteractionHandler = (port: NodePortType, portIndex: number, portSide: 'input' | 'output') => {
    const portInfo: PortInteractionInfo = { node, port, portIndex, portSide };
    return {
      onPointerEnter: onPortPointerEnterForConnection ? () => onPortPointerEnterForConnection(portInfo) : undefined,
      onPointerLeave: onPortPointerLeaveForConnection ? () => onPortPointerLeaveForConnection(portInfo) : undefined,
      onPointerUp: onPortPointerUpForConnection ? (e: React.PointerEvent<HTMLDivElement>) => onPortPointerUpForConnection(portInfo) : undefined,
    };
  };

  const definition = getNodeDefinition(node.type);
  const CustomContentRenderer = definition?.customContentRenderer;
  const customContentDesignHeight = definition?.customContentHeight || 0;
  const customContentTitleFromDef = (node.type === CUSTOM_UI_NODE_TYPE_KEY || node.type === AI_MODEL_SELECTION_NODE_TYPE_KEY)
    ? undefined
    : definition?.customContentTitle;

  const portsSectionRenderHeight = (node.inputs.length > 0 || node.outputs.length > 0)
    ? Math.max(calculatePortSetHeight(node.inputs.length), calculatePortSetHeight(node.outputs.length))
    : 0;

  const titleAreaHeight = (customContentTitleFromDef && customContentDesignHeight > 0) ? CUSTOM_CONTENT_TITLE_HEIGHT : 0;

  const shortContextId = executionState?.activeExecutionContextId
    ? executionState.activeExecutionContextId.slice(-6)
    : null;
  const contextIdColorClass = shortContextId && executionState?.status === 'running'
    ? getContextColor(executionState.activeExecutionContextId!)
    : 'text-zinc-400';

  let ariaStatusLabel = "";
  if (isSelected) {
    ariaStatusLabel = ", Status: Selected";
  } else if (executionState?.status === 'running') {
    ariaStatusLabel = ", Status: Running";
    if (executionState.activeExecutionContextId) {
      ariaStatusLabel += `, Context: ${shortContextId}`;
    }
  } else if (executionState?.status === 'warning') {
    ariaStatusLabel = `, Status: Warning${executionState.warningMessage ? ` - ${executionState.warningMessage}` : ''}`;
  } else if (executionState?.status === 'error') {
    ariaStatusLabel = `, Status: Error${executionState.error ? ` - ${executionState.error}` : ''}`;
  } else if (upstreamDataState === 'queued_at_downstream') {
    ariaStatusLabel = ", Status: Output Queued Downstream";
  } else if (upstreamDataState === 'waiting_for_downstream_others') {
    ariaStatusLabel = ", Status: Output Waiting for Downstream Dependencies";
  } else if (executionState?.status === 'completed' || upstreamDataState === 'consumed_by_downstream') {
    ariaStatusLabel = ", Status: Completed or Output Consumed";
  } else if (executionState?.status === 'paused') {
    ariaStatusLabel = `, Status: Paused${executionState.missingInputs && executionState.missingInputs.length > 0 ? ` - Waiting for inputs: ${executionState.missingInputs.join(', ')}` : ''}`;
  } else if (executionState?.status === 'waiting') {
    ariaStatusLabel = `, Status: Waiting${executionState.needsFlowSignal ? ' for flow signal' : (executionState.missingInputs && executionState.missingInputs.length > 0 ? ` for inputs: ${executionState.missingInputs.join(', ')}` : '')}`;
  }

  const mainTitleToDisplay = node.title?.trim() ? node.title : (definition?.label || '');

  const isCustomAiNodeCheck = node.type.startsWith('custom_ai_node_');
  const subTitleToDisplay = isCustomAiNodeCheck ? "自定义 AI 节点" : (definition?.label || '');
  const displaySubtitle = (isCustomAiNodeCheck && mainTitleToDisplay !== "自定义 AI 节点") || (!isCustomAiNodeCheck && node.title?.trim() && node.title?.trim() !== subTitleToDisplay);


  return (
    <div
      onMouseDown={onMouseDown}
      onClick={handleNodeClick}
      className={`absolute ${finalBodyBgClass} border-2 ${currentBorderColorClass} ${shadowClasses} ${transformClasses} ${cursorClass} rounded-md transition-all duration-150 ease-in-out pointer-events-auto`}
      style={{
        width: `${node.width}px`,
        height: `${node.height}px`,
        touchAction: 'none',
        userSelect: 'none',
        outline: 'none',
      }}
      aria-label={`Node ${mainTitleToDisplay} (${subTitleToDisplay})${ariaStatusLabel}`}
      aria-selected={isSelected}
      role="button"
      tabIndex={0}
    >
      <div
        className={headerClassName}
        style={headerStyle}
      >
        <NodeHeaderContent
          mainTitle={mainTitleToDisplay}
          subTitle={subTitleToDisplay}
          displaySubtitle={displaySubtitle}
          themeClasses={{
            textHeader: themeNodeColors.common.textHeader,
            textSubtitle: 'text-slate-400',
          }}
          shortContextId={shortContextId}
          contextIdColorClass={contextIdColorClass}
          customMainTitleColor={node.data?.customMainTitleColor}
          customSubtitleColor={node.data?.customSubtitleColor}
          nodeDefinition={definition}
        />
      </div>

      <div
        className="relative"
        style={{
          height: `${overallNodeBodyHeight}px`,
        }}
      >
        {/* Input Ports */}
        {node.inputs?.map((port, index) => {
          const portHandlers = createPortInteractionHandler(port, index, 'input');
          const isHighlightedAsGeneralTarget = generalValidDragTargetPortIds?.includes(port.id) ?? false;

          const isPortMissingData = (executionState?.status === 'paused' || executionState?.status === 'waiting') &&
                                    (executionState?.missingInputs?.includes(port.id) ||
                                     (executionState?.needsFlowSignal && port.dataType === PortDataType.FLOW && !executionState?.satisfiedInputPortIds?.includes(port.id) ));

          const isSatisfied = executionState?.satisfiedInputPortIds?.includes(port.id);
          const isNodeWaitingForOtherInputs = (executionState?.status === 'paused' || executionState?.status === 'waiting') &&
                                             ((executionState?.missingInputs?.length ?? 0) > 0 || !!executionState?.needsFlowSignal);
          const isSatisfiedButWaiting = !!(isSatisfied && isNodeWaitingForOtherInputs && !isPortMissingData);

          const portErrorDetails = executionState?.portSpecificErrors?.find(pe => pe.portId === port.id);

          let finalPortYOffset = calculatePortOffsetY(index);

          const isDataQueuedDueToNodeBusy = currentVisualStateManager?.getIsInputPortDataQueued(node.id, port.id) ?? false;

          return (
            <Port
              key={port.id}
              node={node}
              port={port}
              nodeWidth={node.width}
              type="input"
              portCenterYOffset={finalPortYOffset}
              isConnectionDraggingActive={isConnectionDraggingActive}
              isCurrentlyHoveredAsTarget={hoveredPortIdAsTarget === port.id}
              isCurrentlyValidTarget={hoveredPortIdAsTarget === port.id && !!isHoveredPortValidTarget}
              onStartConnection={(event) => onPortMouseDownForConnection(node, port, index, 'input', event)}
              onPortPointerEnter={portHandlers.onPointerEnter}
              onPortPointerLeave={portHandlers.onPointerLeave}
              onPortPointerUp={portHandlers.onPointerUp as any}
              isHighlightedAsSelectedEndpoint={portIdToHighlightAsSelectedConnectionEndpoint === port.id}
              isHighlightedAsGeneralDragTarget={isHighlightedAsGeneralTarget}
              isMissingData={isPortMissingData}
              isSatisfiedButWaiting={isSatisfiedButWaiting}
              portErrorDetails={portErrorDetails}
              isDataQueuedDueToNodeBusy={isDataQueuedDueToNodeBusy}
            />
          );
        })}

        {/* Output Ports */}
        {node.outputs?.map((port, index) => {
          const portHandlers = createPortInteractionHandler(port, index, 'output');
          const isHighlightedAsGeneralTarget = generalValidDragTargetPortIds?.includes(port.id) ?? false;
          const portErrorDetailsForThisOutput = executionState?.portSpecificErrors?.find(pe => pe.portId === port.id);

          let finalPortYOffset = calculatePortOffsetY(index);

          const portState: OutputPortStateResult = calculateOutputPortState(
            port,
            node,
            connections,
            allNodes,
            nodeExecutionStates,
            getQueuedInputsForDownstreamPort,
            getNodeDefinition
          );

          return (
            <Port
              key={port.id}
              node={node}
              port={port}
              nodeWidth={node.width}
              type="output"
              portCenterYOffset={finalPortYOffset}
              isConnectionDraggingActive={isConnectionDraggingActive}
              isCurrentlyHoveredAsTarget={hoveredPortIdAsTarget === port.id}
              isCurrentlyValidTarget={hoveredPortIdAsTarget === port.id && !!isHoveredPortValidTarget}
              onStartConnection={(event) => onPortMouseDownForConnection(node, port, index, 'output', event)}
              onPortPointerEnter={portHandlers.onPointerEnter}
              onPortPointerLeave={portHandlers.onPointerLeave}
              onPortPointerUp={portHandlers.onPointerUp as any}
              isHighlightedAsSelectedEndpoint={portIdToHighlightAsSelectedConnectionEndpoint === port.id}
              isHighlightedAsGeneralDragTarget={isHighlightedAsGeneralTarget}
              portErrorDetails={portErrorDetailsForThisOutput}
              queueRank={portState.queueRank}
              isPrimaryQueuedItem={portState.isPrimaryQueuedItem}
              isReflectingDownstreamError={portState.isReflectingDownstreamError}
              isReflectingDownstreamWaiting={portState.isReflectingDownstreamWaiting}
              reflectingDownstreamSatisfiedWaitingRank={portState.reflectingDownstreamSatisfiedWaitingRank}
            />
          );
        })}

        {CustomContentRenderer && customContentDesignHeight > 0 && (
          <>
            {customContentTitleFromDef && (
              <div
                style={{
                  position: 'absolute',
                  top: `${portsSectionRenderHeight}px`,
                  left: '4px',
                  right: '4px',
                  height: `${CUSTOM_CONTENT_TITLE_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '4px',
                }}
                className="text-xs text-zinc-400 truncate select-none"
                title={customContentTitleFromDef}
              >
                {customContentTitleFromDef}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: `${portsSectionRenderHeight + titleAreaHeight}px`,
                left: '4px',
                right: '4px',
                width: `calc(100% - 8px)`,
                height: `${customContentDesignHeight}px`,
              }}
            >
              {node.type === AI_MODEL_SELECTION_NODE_TYPE_KEY ? (
                <CustomContentRenderer
                  node={node}
                  updateNodeData={updateNodeData}
                  mergedModelConfigs={mergedModelConfigs} // Pass mergedModelConfigs
                />
              ) : (
                <CustomContentRenderer
                  node={node}
                  updateNodeData={updateNodeData}
                  onOpenCustomUiPreview={node.type === CUSTOM_UI_NODE_TYPE_KEY ? onOpenCustomUiPreview : undefined}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UniversalNodeRenderer;
