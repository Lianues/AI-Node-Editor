
import { aiTextGenerationDefinition } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer'; // Updated import
import AiTextGenerationInspector from './Inspector';
import { executeAiTextGeneration } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const AiTextGenerationNode: NodeTypeDefinition = {
  ...aiTextGenerationDefinition,
  renderer: UniversalNodeRenderer, // Use UniversalNodeRenderer
  inspector: AiTextGenerationInspector,
  executor: executeAiTextGeneration,
};

export { aiTextGenerationDefinition as AiTextGenerationRawDefinition, AI_TEXT_GENERATION_NODE_TYPE_KEY } from './Definition';
