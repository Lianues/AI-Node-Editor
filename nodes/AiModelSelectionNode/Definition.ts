
import { NodePort, PortDataType, AiServiceConfig } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';
import { AiModelSelectionNodeContent } from './AiModelSelectionNodeContent';
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs';

export const AI_MODEL_SELECTION_NODE_TYPE_KEY = 'ai-model-selection-node';

const inputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
];

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'ai_config_out', label: 'AI配置', shape: 'circle', dataType: PortDataType.AI_CONFIG }
];

const defaultCustomContentHeight = 132;
const defaultHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT, defaultCustomContentHeight);

export const aiModelSelectionNodeDefinition = {
  type: AI_MODEL_SELECTION_NODE_TYPE_KEY,
  label: 'AI模型选择',
  description: '允许用户在节点内选择一个在“全局设置”中预定义的或用户自定义的“AI模型配置组”，并可选择性地在节点内覆盖该组的默认模型名称。当此节点执行时，它会从“AI配置”输出端口输出一个 `AiServiceConfig` 对象。这个对象包含了所选配置组的ID以及最终确定的模型名称，可连接到其他AI节点的“AI配置输入”端口，用于指定AI调用时使用的具体模型和可能的API密钥、API URL等（这些信息通常由所选配置组提供）。\n\n注意事项：\n- 模型配置组在应用的“全局设置”中进行管理（包括添加、编辑API密钥等）。\n- 如果在节点内覆盖了模型名称，请确保该模型与所选配置组的API格式（例如Gemini或OpenAI）兼容。',
  defaultTitle: 'AI模型选择',
  width: 250,
  height: defaultHeight,
  headerColor: 'bg-fuchsia-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    aiModelConfigGroupId: DEFAULT_ENV_GEMINI_CONFIG_ID,
    modelOverride: '',
  },
  customContentHeight: defaultCustomContentHeight,
  customContentRenderer: AiModelSelectionNodeContent,
};

export type AiModelSelectionDefinitionType = typeof aiModelSelectionNodeDefinition;
    