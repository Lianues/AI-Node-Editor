import { userInputDefinition, USER_INPUT_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import UserInputInspector from './Inspector';
import { executeUserInput } from './Executor';
import { NodeTypeDefinition } from '../../types';
// UserInputContent is part of the definition now, not directly imported here for the NodeTypeDefinition object.

export const UserInputNode: NodeTypeDefinition = {
  ...userInputDefinition, // This will include defaultData, customContentHeight, and customContentRenderer
  renderer: UniversalNodeRenderer, // Universal renderer handles custom content via definition
  inspector: UserInputInspector,
  executor: executeUserInput,
};

export { USER_INPUT_NODE_TYPE_KEY }; // Exporting the key directly
export { userInputDefinition as UserInputRawDefinition } from './Definition'; // Exporting raw definition if needed elsewhere