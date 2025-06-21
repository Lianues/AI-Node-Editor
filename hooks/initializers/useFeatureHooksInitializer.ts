
import { useNodeManager } from '../../features/nodes/hooks/useNodeManager';
import { useConnectionManager } from '../../features/connections/hooks/useConnectionManager';
import { useDefinedAreaManager, UseDefinedAreaManagerOutput } from '../../features/areaDefinition/hooks/useDefinedAreaManager';
import { NodeTypeDefinition } from '../../types'; // Added NodeTypeDefinition

// Props for NodeManager initialization
export interface NodeManagerInitializerCallbacks {
  onNodeSelected: (primaryNodeId: string | null, nodeTypeToPlaceCleared: boolean) => void;
  onBeforeNodeDeleted: (nodeId: string) => void;
  onNodeTypeToPlaceChanged: (typeKey: string | null) => void;
  onNodeDataUpdated: (nodeId: string, nodeTitle: string, propertyKey: string, oldValue: any, newValue: any) => void;
  onDeselectConnections: () => void;
}

// Props for ConnectionManager initialization
export interface ConnectionManagerInitializerCallbacks {
  onConnectionSelected: (connectionId: string | null) => void;
}

// Props for the feature hooks initializer
export interface UseFeatureHooksInitializerProps {
  nodeManagerCallbacks: NodeManagerInitializerCallbacks;
  connectionManagerCallbacks: ConnectionManagerInitializerCallbacks;
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined; // Added prop
}

export interface FeatureHooksInstances {
  nodeManager: ReturnType<typeof useNodeManager>;
  connectionManager: ReturnType<typeof useConnectionManager>;
  definedAreaManager: UseDefinedAreaManagerOutput;
}

export const useFeatureHooksInitializer = ({
  nodeManagerCallbacks,
  connectionManagerCallbacks,
  getNodeDefinition, // Destructure new prop
}: UseFeatureHooksInitializerProps): FeatureHooksInstances => {
  const nodeManager = useNodeManager({ ...nodeManagerCallbacks, getNodeDefinition }); // Pass it to useNodeManager
  const connectionManager = useConnectionManager(connectionManagerCallbacks);
  const definedAreaManager = useDefinedAreaManager();

  return {
    nodeManager,
    connectionManager,
    definedAreaManager,
  };
};
