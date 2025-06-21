
import { conditionalNodeDefinition, CONDITIONAL_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import ConditionalNodeInspector from './Inspector';
import { executeConditionalNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
// ConditionalNodeContent is part of the definition.

export const ConditionalNode: NodeTypeDefinition = {
  ...conditionalNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: ConditionalNodeInspector,
  executor: executeConditionalNode,
};

export { CONDITIONAL_NODE_TYPE_KEY }; 
export { conditionalNodeDefinition as ConditionalNodeRawDefinition } from './Definition';
