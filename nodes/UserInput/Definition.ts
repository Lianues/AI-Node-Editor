
import { NodePort, PortDataType } from '../../types';
import { UserInputContent } from './UserInputContent';

export const USER_INPUT_NODE_TYPE_KEY = 'user-input-node';

const inputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true }
];

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'content_out', label: '内容输出', shape: 'circle', dataType: PortDataType.STRING }
];

export const userInputDefinition = {
  type: USER_INPUT_NODE_TYPE_KEY,
  label: '用户输入',
  description: '提供一个文本输入区域，允许用户在工作流设计时直接编辑内容。当此节点的“开始”流程端口接收到信号时，节点会执行，并将其内部编辑区域的文本内容从“内容输出”端口作为字符串输出。同时，“结束”流程端口也会被触发。\n\n注意事项：\n- 内容直接在节点上的文本框中编辑。\n- “开始”端口用于触发此节点的执行和数据输出。',
  defaultTitle: '用户输入',
  width: 200,
  headerColor: 'bg-teal-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: { userInput: "" },
  customContentHeight: 60,
  customContentRenderer: UserInputContent,
  customContentTitle: '输入内容',
};

export type UserInputDefinitionType = typeof userInputDefinition;
    