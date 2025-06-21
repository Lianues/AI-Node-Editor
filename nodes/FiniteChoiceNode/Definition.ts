
import { NodePort, PortDataType, AiServiceConfig } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const FINITE_CHOICE_NODE_TYPE_KEY = 'finite-choice-node';

const inputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'user_input', label: '判断内容', shape: 'circle', dataType: PortDataType.STRING, isPortRequired: true },
  { id: 'history_in', label: '历史记录输入', shape: 'circle', dataType: PortDataType.STRING, isPortRequired: false },
  { id: 'ai_config_in', label: 'AI配置', shape: 'circle', dataType: PortDataType.AI_CONFIG, isPortRequired: false },
];

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'history_out', label: '历史记录输出', shape: 'circle', dataType: PortDataType.STRING },
];

const defaultAiConfig: AiServiceConfig = {
  aiModelConfigGroupId: DEFAULT_ENV_GEMINI_CONFIG_ID,
  systemInstruction: "你是一个判断助手，请根据用户提供的内容和选项，准确地选择一个或多个选项。",
  temperature: 0.5,
  topP: 0.95,
  topK: 30,
  thinkingConfig: {
    thinkingBudget: undefined,
    includeThoughts: false,
  }
};

const initialHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT);

export const finiteChoiceNodeDefinition = {
  type: FINITE_CHOICE_NODE_TYPE_KEY,
  label: 'AI选择节点',
  description: 'AI模型根据“判断内容”端口的输入（或节点内配置的默认提示词），从用户定义的多个选项中选择一个或多个，并触发相应的流程输出端口。\n\n配置与使用：\n1. **定义选项**: 在检查器的“端口管理”中添加新的输出端口。每个希望AI选择的选项都应对应一个输出端口。\n2. **标记为AI选项**: 对于每个代表选项的输出端口，需在其属性中勾选“用作AI选项”。该端口的“标签”将作为AI识别的选项文本。\n3. **提示词**: 默认提示词或通过“判断内容”端口输入的提示词中，可以使用 `{{available_choices_as_string}}` 占位符。执行时，此占位符会被替换为一个包含所有已标记为“AI选项”的端口标签的JSON字符串数组（例如 `[\"同意\", \"拒绝\", \"不确定\"]`），供AI参考。\n4. **触发输出**: AI选择一个或多个选项后，对应输出端口会发出流程信号，从而驱动后续流程分支。\n\n支持聊天历史和AI参数配置的传入与传出。',
  defaultTitle: 'AI 选择',
  width: 250,
  height: initialHeight + 30,
  headerColor: 'bg-cyan-700',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    defaultPrompt: "请根据以下内容：\n{{user_input}}\n\n从以下选项中选择最合适的答案：{{available_choices_as_string}}",
    aiConfig: defaultAiConfig,
    portConfigs: {},
  },
};

export type FiniteChoiceNodeDefinitionType = typeof finiteChoiceNodeDefinition;
    