
import { dataSynchronizationNodeDefinition, DATA_SYNCHRONIZATION_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector'; // Uses Base Inspector
import { executeDataSynchronizationNode } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const DataSynchronizationNode: NodeTypeDefinition = {
  ...dataSynchronizationNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: BaseNodeInspector, // Standard inspector for port management
  executor: executeDataSynchronizationNode,
};

export { DATA_SYNCHRONIZATION_NODE_TYPE_KEY };
export { dataSynchronizationNodeDefinition as DataSynchronizationNodeRawDefinition } from './Definition';
