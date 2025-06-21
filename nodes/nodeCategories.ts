
import { START_NODE_TYPE_KEY } from './Start/Definition';
import { AI_TEXT_GENERATION_NODE_TYPE_KEY } from './AiTextGeneration/Definition';
import { USER_INPUT_NODE_TYPE_KEY } from './UserInput/Definition';
import { DATA_VIEWER_NODE_TYPE_KEY } from './DataViewerNode/Definition';
import { DOCUMENT_NODE_TYPE_KEY } from './DocumentNode/Definition';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from './SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from './SubworkflowOutput/Definition';
import { SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY } from './SubworkflowInstance/Definition';
import { FINITE_CHOICE_NODE_TYPE_KEY } from './FiniteChoiceNode/Definition';
import { CUSTOM_UI_NODE_TYPE_KEY } from './CustomUiNode/Definition';
import { CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY } from './CustomDataProcessingNode/Definition';
import { DATA_COMBINATION_NODE_TYPE_KEY } from './DataCombinationNode/Definition';
import { DATA_SPLIT_NODE_TYPE_KEY } from './DataSplitNode/Definition';
import { DATA_MERGE_NODE_TYPE_KEY } from './DataMergeNode/Definition';
import { AI_MODEL_SELECTION_NODE_TYPE_KEY } from './AiModelSelectionNode/Definition';
import { DATA_SYNCHRONIZATION_NODE_TYPE_KEY } from './DataSynchronizationNode/Definition';
import { DATA_TRIGGER_NODE_TYPE_KEY } from './DataTriggerNode/Definition'; 
import { CONDITIONAL_NODE_TYPE_KEY } from './ConditionalNode/Definition';
import { DATA_DELAY_NODE_TYPE_KEY } from './DataDelayNode/Definition'; // New Import

export interface NodeCategory {
  id: string;
  label: string;
  order: number;
  nodeTypeKeys: string[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'core_flow_control',
    label: '核心与流程起点', // Renamed for clarity
    order: 1,
    nodeTypeKeys: [
      START_NODE_TYPE_KEY,
    ],
  },
  {
    id: 'logic_control', // Renamed for clarity
    label: '逻辑与流程控制',
    order: 2,
    nodeTypeKeys: [
      CONDITIONAL_NODE_TYPE_KEY,
      DATA_TRIGGER_NODE_TYPE_KEY, // Moved here
    ],
  },
  {
    id: 'io_interaction',
    label: '输入与交互',
    order: 3,
    nodeTypeKeys: [
      USER_INPUT_NODE_TYPE_KEY,
      CUSTOM_UI_NODE_TYPE_KEY,
    ],
  },
  {
    id: 'data_manipulation',
    label: '数据处理与转换', // Renamed for clarity
    order: 4,
    nodeTypeKeys: [
      DATA_COMBINATION_NODE_TYPE_KEY,
      DATA_SPLIT_NODE_TYPE_KEY,
      DATA_MERGE_NODE_TYPE_KEY,
      DOCUMENT_NODE_TYPE_KEY, 
      CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY,
    ],
  },
  {
    id: 'utilities_flow', // New category for utility and advanced flow nodes
    label: '工具与高级流程',
    order: 5,
    nodeTypeKeys: [
      DATA_SYNCHRONIZATION_NODE_TYPE_KEY, 
      DATA_DELAY_NODE_TYPE_KEY, // Added DataDelayNode
      DATA_VIEWER_NODE_TYPE_KEY, // Moved here
    ],
  },
  {
    id: 'ai_capabilities',
    label: 'AI 能力',
    order: 6,
    nodeTypeKeys: [
      AI_MODEL_SELECTION_NODE_TYPE_KEY,
      AI_TEXT_GENERATION_NODE_TYPE_KEY,
      FINITE_CHOICE_NODE_TYPE_KEY, 
    ],
  },
  {
    id: 'modularity_subflows',
    label: '模块化与子流程',
    order: 7,
    nodeTypeKeys: [
      SUBWORKFLOW_INPUT_NODE_TYPE_KEY,
      SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY,
      SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY,
    ],
  },
  {
    id: 'custom_ai_nodes', 
    label: '自定义 AI 节点',
    order: 8, 
    nodeTypeKeys: [], 
  },
];
