
import { startDefinition } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer'; // Updated import
import StartInspector from './Inspector';
import { executeStart } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const StartNode: NodeTypeDefinition = {
  ...startDefinition,
  renderer: UniversalNodeRenderer, // Use UniversalNodeRenderer
  inspector: StartInspector,
  executor: executeStart,
};

export { startDefinition as StartRawDefinition, START_NODE_TYPE_KEY } from './Definition';
