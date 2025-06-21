
import { customDataProcessingNodeDefinition, CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import CustomDataProcessingInspector from './Inspector';
import { executeCustomDataProcessingNode } from './Executor';
import { NodeTypeDefinition } from '../../types';

// This is a 'template' definition. Specific instances created by the user will have their own
// executor and inspector functions assigned in App.tsx if they are dynamically generated.
// However, for the NodeListPanel to show a generic "Custom Data Processing Node" template,
// we can provide default executor/inspector here.
export const CustomDataProcessingNode: NodeTypeDefinition = {
  ...customDataProcessingNodeDefinition, // Spreads type, label, description, defaultTitle, width, headerColor, bodyColor, inputs, outputs, defaultData
  renderer: UniversalNodeRenderer, // All nodes use this
  inspector: CustomDataProcessingInspector, // The generic inspector for this type
  executor: executeCustomDataProcessingNode, // The generic executor for this type
};

export { CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY };
export { customDataProcessingNodeDefinition as CustomDataProcessingRawDefinition } from './Definition';
