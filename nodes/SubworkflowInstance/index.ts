
import { subworkflowInstanceDefinition, SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import SubworkflowInstanceInspector from './Inspector';
import { executeSubworkflowInstance } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const SubworkflowInstanceNode: NodeTypeDefinition = {
  ...subworkflowInstanceDefinition,
  renderer: UniversalNodeRenderer,
  inspector: SubworkflowInstanceInspector,
  executor: executeSubworkflowInstance,
};

export { SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY };
export { subworkflowInstanceDefinition as SubworkflowInstanceRawDefinition } from './Definition';
