
import { NodeTypeDefinition } from '../types';
import { StartNode, START_NODE_TYPE_KEY } from './Start';
// DefaultNode and DefaultRawDefinition removed
import { AiTextGenerationNode } from './AiTextGeneration';
import { UserInputNode } from './UserInput'; 
import { DataViewerNode } from './DataViewerNode'; 
import { SubworkflowInputNode } from './SubworkflowInput';
import { SubworkflowOutputNode } from './SubworkflowOutput';
import { SubworkflowInstanceNode } from './SubworkflowInstance';
import { DocumentNode, DOCUMENT_NODE_TYPE_KEY } from './DocumentNode';
import { FiniteChoiceNode } from './FiniteChoiceNode';
import { CustomUiNode } from './CustomUiNode'; 
import { CustomDataProcessingNode } from './CustomDataProcessingNode';
import { DataCombinationNode } from './DataCombinationNode'; 
import { DataSplitNode } from './DataSplitNode'; 
import { AiModelSelectionNode } from './AiModelSelectionNode'; 
import { DataMergeNode } from './DataMergeNode'; 
import { DataSynchronizationNode } from './DataSynchronizationNode'; 
import { DataTriggerNode } from './DataTriggerNode'; 
import { ConditionalNode, CONDITIONAL_NODE_TYPE_KEY } from './ConditionalNode';
import { DataDelayNode, DATA_DELAY_NODE_TYPE_KEY } from './DataDelayNode'; // New Import

export const ALL_NODE_DEFINITIONS: NodeTypeDefinition[] = [
  StartNode,
  UserInputNode, 
  DataTriggerNode,
  ConditionalNode, 
  DataCombinationNode, 
  DataSplitNode,       
  DataMergeNode, 
  DataSynchronizationNode, 
  DataDelayNode, // Added DataDelayNode
  DocumentNode,
  DataViewerNode, 
  CustomUiNode, 
  CustomDataProcessingNode, 
  AiModelSelectionNode, 
  AiTextGenerationNode,
  FiniteChoiceNode, 
  SubworkflowInputNode,
  SubworkflowOutputNode,
  SubworkflowInstanceNode,
];

// Fallback key updated to StartNode's type
export const DEFAULT_NODE_TYPE_FALLBACK_KEY = START_NODE_TYPE_KEY; 

// Renamed to avoid conflict with the combined getter in App.tsx
export const getStaticNodeDefinition = (type: string): NodeTypeDefinition | undefined => {
  return ALL_NODE_DEFINITIONS.find(def => def.type === type);
};

// This is now the main getter that App.tsx will override/provide.
// For components still importing from here directly, they'll get the static one.
// Ideally, all consumers will get it from App.tsx or context.
// export const getNodeDefinition = (type: string): NodeTypeDefinition | undefined => {
//     // In a real scenario, this would check custom definitions too.
//     // For now, it will just call the static one.
//     // App.tsx will provide a combined version that includes custom nodes.
//     return getStaticNodeDefinition(type);
// };


export { DOCUMENT_NODE_TYPE_KEY, CONDITIONAL_NODE_TYPE_KEY, DATA_DELAY_NODE_TYPE_KEY }; // Export new key
