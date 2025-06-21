
import { NodePort, PortDataType, AiServiceConfig } from '../../types';
import { outputGeneratedTextFunctionDeclaration } from '../../features/ai/tools/definitions/textOutputTool';
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils'; // Import calculateNodeHeight
import { HEADER_HEIGHT } from '../../components/renderingConstants'; // Import HEADER_HEIGHT

export const AI_TEXT_GENERATION_NODE_TYPE_KEY = 'ai-text-generation-node';

const inputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { 
    id: 'system_instruction_in', 
    label: '系统指令输入', 
    shape: 'circle', 
    dataType: PortDataType.STRING, 
    isPortRequired: false,
    isDataRequiredOnConnection: false, // Data can be optional if connected
  },
  { id: 'user_input', label: '用户输入', shape: 'circle', dataType: PortDataType.STRING },
  {
    id: 'history_in',
    label: '历史记录输入',
    shape: 'circle',
    dataType: PortDataType.STRING,
    isPortRequired: false,
    isDataRequiredOnConnection: false
  },
  { id: 'ai_config_in', label: 'AI配置', shape: 'circle', dataType: PortDataType.AI_CONFIG },
];

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'result_out', label: '结果输出', shape: 'circle', dataType: PortDataType.STRING },
  { id: 'history_out', label: '历史记录输出', shape: 'circle', dataType: PortDataType.STRING },
  { id: 'ai_config_out', label: 'AI配置输出', shape: 'circle', dataType: PortDataType.AI_CONFIG },
];

// Recalculate height based on 5 inputs, 4 outputs. Max is 5.
const newHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT);

export const aiTextGenerationDefinition = {
  type: AI_TEXT_GENERATION_NODE_TYPE_KEY,
  label: 'AI文本生成',
  description: '利用AI大模型生成文本。提示词可来自“用户输入”端口的动态数据，或节点内配置的“默认提示词”（若前者未连接或无数据）。支持通过“AI配置输入”端口动态传入模型参数，最终使用的AI配置会从“AI配置输出”端口传出。聊天历史记录（JSON字符串格式）可以通过“历史记录输入”传入，更新后的历史记录则从“历史记录输出”端口传出。\n\n核心功能：\n- 提示词来源：优先使用“用户输入”端口的数据，若无则使用节点内“默认提示词”。\n- 动态配置：可通过“AI配置输入”端口或新增的“系统指令输入”端口覆盖或补充节点内及全局的AI设置。“系统指令输入”端口的优先级最高（但不会影响AI工具自身的系统指令后缀）。\n- 历史记录：支持JSON字符串格式的聊天历史传入与传出。\n- 模板替换：默认提示词和系统指令中支持 `{{port_id}}` 语法，用于动态插入来自其他输入端口的数据。\n- AI工具：默认情况下，“结果输出”端口会使用内置的 `output_generated_text` 工具输出文本。可在检查器的“端口管理”中为输出端口配置其他AI工具，以实现更复杂的结构化输出。AI将根据工具定义尝试调用相应的函数。',
  defaultTitle: 'AI文本生成',
  width: 250,
  height: newHeight, // Use dynamically calculated height
  headerColor: 'bg-purple-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    defaultPrompt: "请给我讲一个关于友好机器人的短故事。",
    aiConfig: {
      aiModelConfigGroupId: DEFAULT_ENV_GEMINI_CONFIG_ID,
      systemInstruction: "你是一个乐于助人的助手。",
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      thinkingConfig: {
        thinkingBudget: undefined,
        includeThoughts: false,
      }
    } as AiServiceConfig,
    portToolConfig: {
      'result_out': {
        useTool: true,
        toolName: outputGeneratedTextFunctionDeclaration.name,
      }
    }
  },
};

export type AiTextGenerationDefinitionType = typeof aiTextGenerationDefinition;
