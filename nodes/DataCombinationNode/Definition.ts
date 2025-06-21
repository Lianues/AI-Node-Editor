
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const DATA_COMBINATION_NODE_TYPE_KEY = 'data-combination-node';

const defaultInputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_in_1', label: '数据输入1', shape: 'circle', dataType: PortDataType.ANY, isPortRequired: false },
];

const defaultOutputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_collection_out', label: '数据集合', shape: 'circle', dataType: PortDataType.DATA_COLLECTION, isPortRequired: false },
];

const defaultCustomContentHeight = 100;
const defaultHeight = calculateNodeHeight(defaultInputs, defaultOutputs, HEADER_HEIGHT, defaultCustomContentHeight, "组合结果");

export const dataCombinationNodeDefinition = {
  type: DATA_COMBINATION_NODE_TYPE_KEY,
  label: '数据组合',
  description: '将所有连接到其数据输入端口（非流程端口）的数据项收集起来，并组合成一个JSON字符串数组。数组中的每个成员是一个对象，详细记录了该数据项的来源信息和内容，其结构为：\n`{ "portId": "来源输入端口ID", "label": "来源输入端口标签", "type": "原始数据类型", "value": "实际数据值" }`。\n例如：`[ { "portId": "data_in_1", "label": "用户名称", "type": "string", "value": "张三" }, ... ]`。\n组合后的JSON字符串从“数据集合”输出端口输出。节点上的内容区域会实时展示此组合结果的预览。\n\n注意事项：\n- 可以在检查器的“端口管理”部分动态添加、删除和配置数据输入端口。\n- 此节点通常与“数据拆分”节点配合使用，用于后续分别处理集合中的各项数据。',
  defaultTitle: '数据组合',
  width: 250,
  height: defaultHeight,
  headerColor: 'bg-yellow-600',
  bodyColor: 'bg-slate-700',
  inputs: defaultInputs,
  outputs: defaultOutputs,
  defaultData: {
    displayTitle: "组合结果",
    displayedValue: "[]",
  },
  customContentHeight: defaultCustomContentHeight,
  customContentTitle: "组合结果",
};

export type DataCombinationDefinitionType = typeof dataCombinationNodeDefinition;
    