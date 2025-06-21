
import { aiModelSelectionNodeDefinition, AI_MODEL_SELECTION_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import AiModelSelectionInspector from './Inspector';
import { executeAiModelSelectionNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
// AiModelSelectionNodeContent is imported in Definition.ts for customContentRenderer

export const AiModelSelectionNode: NodeTypeDefinition = {
  ...aiModelSelectionNodeDefinition, // Includes defaultData, customContentRenderer, etc.
  renderer: UniversalNodeRenderer,
  inspector: AiModelSelectionInspector,
  executor: executeAiModelSelectionNode,
};

export { AI_MODEL_SELECTION_NODE_TYPE_KEY };
export { aiModelSelectionNodeDefinition as AiModelSelectionNodeRawDefinition } from './Definition';
