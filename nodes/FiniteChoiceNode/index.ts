
import { finiteChoiceNodeDefinition, FINITE_CHOICE_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import FiniteChoiceInspector from './Inspector';
import { executeFiniteChoiceNode } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const FiniteChoiceNode: NodeTypeDefinition = {
  ...finiteChoiceNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: FiniteChoiceInspector,
  executor: executeFiniteChoiceNode,
};

export { FINITE_CHOICE_NODE_TYPE_KEY };
export { finiteChoiceNodeDefinition as FiniteChoiceNodeRawDefinition } from './Definition';
