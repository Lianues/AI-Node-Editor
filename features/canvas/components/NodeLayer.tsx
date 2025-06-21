
import React from 'react';
import { Node, NodeTypeDefinition, PortDataType as Types_PortDataType, NodePort as Types_NodePort, NodeExecutionState, ModelConfigGroup, EditableAiModelConfig } from '../../../types'; 
import { HoveredTargetInfo, ConnectionPortIdentifier, PortInteractionInfo, Connection } from '../../connections/types/connectionTypes';
import UniversalNodeRenderer from '../../nodes/components/UniversalNodeRenderer';
import { getSelectedConnectionEndpointPortId } from '../../connections/utils/connectionUtils';
import { UpstreamNodeVisualStateManager, UpstreamDataState } from '../../execution/engine/UpstreamNodeVisualStateManager'; 
import { PortDataCacheEntry, UpstreamSourceInfo } from '../../execution/engine/PropagationEngine'; // Corrected import path

interface NodeLayerProps {
  nodes: Node[];
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined; 
  createNodeDragStartHandler: (nodeId: string, initialNodeX: number, initialNodeY: number) => (event: React.MouseEvent<HTMLDivElement>) => void;
  selectedNodeIds: string[]; 
  draggingNodeId: string | null;
  onSelectNode: (id: string | null, shiftKey?: boolean) => void; 
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void; 
  nodeExecutionStates: Map<string, NodeExecutionState>; 

  // Connection related props
  isConnectionDraggingActive: boolean;
  onPortMouseDownForConnection: (
    node: Node,
    port: Types_NodePort,
    portIndex: number,
    portSide: 'input' | 'output',
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
  onPortPointerEnterForConnection?: (portInfo: PortInteractionInfo) => void;
  onPortPointerLeaveForConnection?: (portInfo: PortInteractionInfo) => void;
  onPortPointerUpForConnection?: (portInfo: PortInteractionInfo) => void;
  hoveredTargetPortInfo: HoveredTargetInfo | null;
  allValidTargetPorts: ConnectionPortIdentifier[];
  connections: Connection[]; 
  selectedConnectionId: string | null;
  getUpstreamNodeVisualStateManager: () => UpstreamNodeVisualStateManager; 
  getQueuedInputsForDownstreamPort: (downstreamNodeId: string, downstreamInputPortId: string, dataType: Types_PortDataType) => Array<PortDataCacheEntry | UpstreamSourceInfo> | undefined; 
  onOpenCustomUiPreview?: (html: string, height: number, nodeId: string, inputData?: Record<string, any>) => void; 
  mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig>; // New prop
}

export const NodeLayer: React.FC<NodeLayerProps> = ({
  nodes,
  getNodeDefinition: getNodeDefinitionProp, 
  createNodeDragStartHandler,
  selectedNodeIds, 
  draggingNodeId,
  onSelectNode,
  onNodeContextMenu,
  updateNodeData, 
  nodeExecutionStates, 
  isConnectionDraggingActive,
  onPortMouseDownForConnection,
  onPortPointerEnterForConnection,
  onPortPointerLeaveForConnection,
  onPortPointerUpForConnection,
  hoveredTargetPortInfo,
  allValidTargetPorts,
  connections,
  selectedConnectionId,
  getUpstreamNodeVisualStateManager, 
  getQueuedInputsForDownstreamPort, 
  onOpenCustomUiPreview, // Destructure new prop
  mergedModelConfigs, // Destructure new prop
}) => {
  const visualStateManager = getUpstreamNodeVisualStateManager(); 

  return (
    <>
      {nodes.map(node => {
        const definition = getNodeDefinitionProp(node.type); 
        const NodeSpecificRenderer = definition ? definition.renderer : UniversalNodeRenderer; 
        const nodeDragStartHandler = createNodeDragStartHandler(node.id, node.x, node.y);

        let hoveredPortOnThisNodeId: string | null = null;
        let isHoveredPortValidForThisNode: boolean | null = null;

        if (hoveredTargetPortInfo && hoveredTargetPortInfo.node.id === node.id) {
          hoveredPortOnThisNodeId = hoveredTargetPortInfo.port.id;
          isHoveredPortValidForThisNode = hoveredTargetPortInfo.isValid;
        }

        const portIdToHighlightAsSelectedEndpoint = getSelectedConnectionEndpointPortId(node.id, connections, selectedConnectionId);

        const nodeGeneralValidDragTargetPortIds = allValidTargetPorts
          .filter(p => p.nodeId === node.id)
          .map(p => p.portId);
        
        const executionState = nodeExecutionStates.get(node.id);
        const upstreamDataState = visualStateManager.getUpstreamNodeOverallVisualState(node.id); 

        const isSelected = selectedNodeIds.includes(node.id); 

        return (
          <div
            key={node.id}
            className="absolute pointer-events-auto" 
            style={{
              left: node.x,
              top: node.y,
            }}
            onContextMenu={(e) => onNodeContextMenu(e, node)}
          >
            <NodeSpecificRenderer
              node={node}
              onMouseDown={nodeDragStartHandler}
              onSelect={(event: React.MouseEvent<HTMLDivElement>) => {
                onSelectNode(node.id, event.shiftKey); 
              }}
              isSelected={isSelected} 
              isDragging={node.id === draggingNodeId}
              executionState={executionState} 
              upstreamDataState={upstreamDataState} 
              isConnectionDraggingActive={isConnectionDraggingActive}
              onPortMouseDownForConnection={onPortMouseDownForConnection}
              onPortPointerEnterForConnection={onPortPointerEnterForConnection}
              onPortPointerLeaveForConnection={onPortPointerLeaveForConnection}
              onPortPointerUpForConnection={onPortPointerUpForConnection}
              hoveredPortIdAsTarget={hoveredPortOnThisNodeId}
              isHoveredPortValidTarget={isHoveredPortValidForThisNode}
              portIdToHighlightAsSelectedConnectionEndpoint={portIdToHighlightAsSelectedEndpoint}
              generalValidDragTargetPortIds={nodeGeneralValidDragTargetPortIds}
              updateNodeData={updateNodeData} 
              getNodeDefinition={getNodeDefinitionProp} 
              getUpstreamNodeVisualStateManager={getUpstreamNodeVisualStateManager} 
              connections={connections} 
              getQueuedInputsForDownstreamPort={getQueuedInputsForDownstreamPort} 
              nodeExecutionStates={nodeExecutionStates} 
              allNodes={nodes} 
              onOpenCustomUiPreview={onOpenCustomUiPreview} // Pass new prop
              mergedModelConfigs={mergedModelConfigs} // Pass mergedModelConfigs down
            />
          </div>
        );
      })}
    </>
  );
};
