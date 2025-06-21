
import { NodePort, PortDataType } from '../../types';

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true }
];
const inputs: NodePort[] = [];

export const START_NODE_TYPE_KEY = 'start-node';

export const startDefinition = {
  type: START_NODE_TYPE_KEY,
  label: '开始节点',
  description: '工作流程的唯一起点。当工作流程开始运行时，此节点会自动执行，并通过其“结束”流程端口触发后续连接的节点。一个工作流中必须包含此节点且只能有一个此类型的节点作为流程的开端。\n\n注意事项：\n- 无需特殊配置。\n- 确保其“结束”端口连接到您希望首先执行的后续节点。',
  defaultTitle: '开始节点',
  width: 200,
  headerColor: 'bg-sky-700',
  bodyColor: 'bg-slate-800',
  inputs: inputs,
  outputs: outputs,
};

export type StartDefinitionType = typeof startDefinition;
    