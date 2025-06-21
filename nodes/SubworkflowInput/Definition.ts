
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';

export const SUBWORKFLOW_INPUT_NODE_TYPE_KEY = 'subworkflow-input-node';

const inputs: NodePort[] = [];
const outputs: NodePort[] = [
  { id: 'value_out', label: '输出值', shape: 'circle', dataType: PortDataType.ANY }
];

const defaultHeight = calculateNodeHeight([], outputs);

export const subworkflowInputDefinition = {
  type: SUBWORKFLOW_INPUT_NODE_TYPE_KEY,
  label: '子程序输入',
  description: '定义子工作流的一个输入参数接口。此节点本身不执行复杂逻辑，其主要作用是在子工作流的画布上声明一个输入点。\n\n配置要点：\n- **端口名称**: 在检查器中设置，此名称将作为父工作流中“子程序实例”节点上对应输入端口的标签。\n- **端口类型**: 决定此输入参数期望的数据类型。\n- **是否必须**: 若勾选（且非流程类型），则在“子程序实例”节点上对应的输入端口将显示为菱形，表示连接时必须提供数据。\n\n数据流：当父工作流运行到包含此子程序的“子程序实例”节点时，连接到实例节点上由此“子程序输入”节点定义的端口的数据，会被传递到此“子程序输入”节点的“输出值”端口，供子工作流内部使用。',
  defaultTitle: '子程序输入',
  width: 200,
  height: defaultHeight,
  headerColor: 'bg-sky-700',
  bodyColor: 'bg-slate-800',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    portName: '输入1',
    portDataType: PortDataType.ANY,
    isPortRequired: false,
  },
  customContentRenderer: undefined,
};

export type SubworkflowInputDefinitionType = typeof subworkflowInputDefinition;
    