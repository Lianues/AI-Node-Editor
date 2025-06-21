
import { subworkflowInputDefinition, SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import SubworkflowInputInspector from './Inspector';
import { executeSubworkflowInput } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const SubworkflowInputNode: NodeTypeDefinition = {
  ...subworkflowInputDefinition,
  renderer: UniversalNodeRenderer,
  inspector: SubworkflowInputInspector,
  executor: executeSubworkflowInput,
};

export { SUBWORKFLOW_INPUT_NODE_TYPE_KEY }; // Exporting the key directly
export { subworkflowInputDefinition as SubworkflowInputRawDefinition } from './Definition';
