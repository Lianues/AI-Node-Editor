
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const DATA_MERGE_NODE_TYPE_KEY = 'data-merge-node';

const defaultInputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_in_1', label: '数据输入1', shape: 'circle', dataType: PortDataType.ANY, isPortRequired: false },
];

const defaultOutputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'merged_data_out', label: '合并数据', shape: 'circle', dataType: PortDataType.DATA_COLLECTION, isPortRequired: false },
];

const defaultCustomContentHeight = 100;
const defaultHeight = calculateNodeHeight(defaultInputs, defaultOutputs, HEADER_HEIGHT, defaultCustomContentHeight, "合并结果");

export const dataMergeNodeDefinition = {
  type: DATA_MERGE_NODE_TYPE_KEY,
  label: '数据合并',
  description: '将所有连接到其数据输入端口（非流程端口）的数据项，根据其有效的数据类型进行分组和合并。\n\n合并逻辑：\n- **字符串 (String)**: 所有输入端口的字符串类型数据会按照输入端口在节点定义中的顺序（从上到下）拼接成一个单一的长字符串。\n- **其他所有类型 (Number, Boolean, Object, Array, Any等)**: 同一类型的多个输入数据会被收集到一个数组中，数组内元素的顺序同样遵循输入端口的顺序。例如，两个数字输入会合并成一个包含这两个数字的数组 `[num1, num2]`。\n\n输出：合并后的结果从“合并数据”端口以JSON字符串数组的形式输出。每个数组成员是一个对象，记录了合并后的数据类型、合并值以及来源信息，结构为：\n`{ "type": "合并后的数据类型", "mergedValue": "合并后的值", "sourceLabels": ["来源端口标签1", ...], "sourcePortIds": ["来源端口ID1", ...] }`。\n节点上的内容区域会展示合并结果的预览，其格式可能与输出端口的原始JSON结构略有不同，更侧重于可读性（例如，直接显示合并后的字符串或数组，而不是外层的集合对象）。\n\n注意事项：\n- 可以在检查器的“端口管理”部分动态添加、删除和配置数据输入端口。\n- `undefined` 值的输入会被忽略，不参与合并。',
  defaultTitle: '数据合并',
  width: 250,
  height: defaultHeight,
  headerColor: 'bg-emerald-600',
  bodyColor: 'bg-slate-700',
  inputs: defaultInputs,
  outputs: defaultOutputs,
  defaultData: {
    displayTitle: "合并结果",
    displayedValue: "[]",
  },
  customContentHeight: defaultCustomContentHeight,
  customContentTitle: "合并结果",
};

export type DataMergeNodeDefinitionType = typeof dataMergeNodeDefinition;
    