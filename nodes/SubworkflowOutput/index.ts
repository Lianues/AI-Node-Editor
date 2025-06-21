
import { subworkflowOutputDefinition, SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import SubworkflowOutputInspector from './Inspector';
import { executeSubworkflowOutput } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const SubworkflowOutputNode: NodeTypeDefinition = {
  ...subworkflowOutputDefinition,
  renderer: UniversalNodeRenderer,
  inspector: SubworkflowOutputInspector,
  executor: executeSubworkflowOutput,
};

export { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY }; // Exporting the key directly
export { subworkflowOutputDefinition as SubworkflowOutputRawDefinition } from './Definition';
