
import { dataDelayNodeDefinition, DATA_DELAY_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import DataDelayNodeInspector from './Inspector';
import { executeDataDelayNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
// DataDelayNodeContent is used in the definition

export const DataDelayNode: NodeTypeDefinition = {
  ...dataDelayNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: DataDelayNodeInspector,
  executor: executeDataDelayNode,
};

export { DATA_DELAY_NODE_TYPE_KEY };
export { dataDelayNodeDefinition as DataDelayNodeRawDefinition } from './Definition';
