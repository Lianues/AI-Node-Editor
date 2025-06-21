
import { dataTriggerNodeDefinition, DATA_TRIGGER_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector'; // Uses Base Inspector
import { executeDataTriggerNode } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const DataTriggerNode: NodeTypeDefinition = {
  ...dataTriggerNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: BaseNodeInspector, // Standard inspector for port management (inputs only)
  executor: executeDataTriggerNode,
};

export { DATA_TRIGGER_NODE_TYPE_KEY };
export { dataTriggerNodeDefinition as DataTriggerNodeRawDefinition } from './Definition';
