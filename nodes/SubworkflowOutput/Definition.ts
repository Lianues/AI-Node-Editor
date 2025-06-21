
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';

export const SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY = 'subworkflow-output-node';

const inputs: NodePort[] = [
  { id: 'value_in', label: '输入值', shape: 'circle', dataType: PortDataType.ANY }
];
const outputs: NodePort[] = [];

const defaultHeight = calculateNodeHeight(inputs, outputs);

export const subworkflowOutputDefinition = {
  type: SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY,
  label: '子程序输出',
  description: '定义子工作流的一个输出结果接口。此节点本身不执行复杂逻辑，其主要作用是在子工作流的画布上声明一个输出点。\n\n配置要点：\n- **端口名称**: 在检查器中设置，此名称将作为父工作流中“子程序实例”节点上对应输出端口的标签。\n- **端口类型**: 决定此输出结果的数据类型。\n- **是否必须**: 若勾选（且非流程类型），则在“子程序实例”节点上对应的输出端口将显示为菱形，表示下游通常期望从此端口获得数据。\n\n数据流：当子工作流内部有数据连接到此“子程序输出”节点的“输入值”端口时，该数据将被视为子程序的执行结果之一，并从父工作流中对应的“子程序实例”节点的相应输出端口流出。',
  defaultTitle: '子程序输出',
  width: 200,
  height: defaultHeight,
  headerColor: 'bg-pink-700',
  bodyColor: 'bg-slate-800',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    portName: '输出1',
    portDataType: PortDataType.ANY,
    isPortRequired: false,
  },
  customContentRenderer: undefined,
};

export type SubworkflowOutputDefinitionType = typeof subworkflowOutputDefinition;
    