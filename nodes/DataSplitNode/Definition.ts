
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const DATA_SPLIT_NODE_TYPE_KEY = 'data-split-node';

const defaultInputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_collection_in', label: '数据集合输入', shape: 'circle', dataType: PortDataType.DATA_COLLECTION, isPortRequired: true },
];

const defaultOutputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_out_1', label: '数据输出1', shape: 'circle', dataType: PortDataType.ANY, isPortRequired: false },
];

const defaultCustomContentHeight = 100;
const defaultHeight = calculateNodeHeight(defaultInputs, defaultOutputs, HEADER_HEIGHT, defaultCustomContentHeight, "输入的数据集合");

export const dataSplitNodeDefinition = {
  type: DATA_SPLIT_NODE_TYPE_KEY,
  label: '数据拆分',
  description: '接收一个JSON字符串数组（通常来自“数据组合”节点）作为其“数据集合输入”。该数组期望的结构是 `[{ "label": "some_label", "value": "some_value", ... }, ...]`。\n节点会根据其每个数据输出端口（非流程端口）在检查器“端口管理”中配置的“源JSON集合项标签”，从输入数组中查找 `label` 属性与该配置标签匹配的项，并将其对应的 `value` 从该输出端口输出。\n如果找不到匹配 `label` 的项，或者输入不是预期的JSON数组格式，则对应输出端口会输出 `undefined`。\n节点上的内容区域会实时展示接收到的“数据集合输入”的原始内容。\n\n注意事项：\n- 确保“数据集合输入”端口接收的是符合上述结构的JSON字符串。\n- 在检查器的“端口管理”中，为每个希望提取数据的输出端口正确配置“源JSON集合项标签”，使其与“数据组合”节点中对应原始输入端口的“标签”一致。',
  defaultTitle: '数据拆分',
  width: 250,
  height: defaultHeight,
  headerColor: 'bg-green-600',
  bodyColor: 'bg-slate-700',
  inputs: defaultInputs,
  outputs: defaultOutputs,
  defaultData: {
    displayTitle: "输入的数据集合",
    displayedValue: "等待数据集合...",
    portConfigs: {},
  },
  customContentHeight: defaultCustomContentHeight,
  customContentTitle: "输入的数据集合",
};

export type DataSplitDefinitionType = typeof dataSplitNodeDefinition;
    