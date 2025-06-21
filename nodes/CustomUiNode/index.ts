
import { customUiNodeDefinition, CUSTOM_UI_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import CustomUiNodeInspector from './Inspector';
import { executeCustomUiNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
// CustomUiNodeContent is part of the definition now.

export const CustomUiNode: NodeTypeDefinition = {
  ...customUiNodeDefinition,
  renderer: UniversalNodeRenderer, // Universal renderer handles custom content via definition
  inspector: CustomUiNodeInspector,
  executor: executeCustomUiNode,
};

export { CUSTOM_UI_NODE_TYPE_KEY }; 
export { customUiNodeDefinition as CustomUiNodeRawDefinition } from './Definition';
