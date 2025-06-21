
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';

export const SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY = 'subworkflow-instance-node';

const inputs: NodePort[] = [];
const outputs: NodePort[] = [];

const defaultHeight = calculateNodeHeight(inputs, outputs);

export const subworkflowInstanceDefinition = {
  type: SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY,
  label: '子程序实例',
  description: '在当前工作流中嵌入并执行一个已定义的子程序。通过其检查器面板选择要链接的子程序后，此节点的输入和输出端口将根据所选子程序的“子程序输入”和“子程序输出”节点动态生成。父工作流的数据通过这些动态生成的输入端口传入子程序内部，子程序的执行结果则通过动态生成的输出端口传出至父工作流。\n\n注意事项：\n- 必须在检查器中链接一个已存在的子程序定义。\n- 如果链接的子程序接口发生变化（例如，增删输入/输出），此实例节点的端口也会相应更新。可能需要重新连接相关连线。\n- 节点标题会自动设置为链接子程序的名称。',
  defaultTitle: '子程序',
  width: 220,
  height: defaultHeight,
  headerColor: 'bg-green-700',
  bodyColor: 'bg-slate-800',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    subWorkflowId: null,
    subWorkflowName: '未链接',
    portMappings: {},
  },
  customContentRenderer: undefined,
};

export type SubworkflowInstanceDefinitionType = typeof subworkflowInstanceDefinition;
    