
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import CustomDataProcessingInspector from './Inspector';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY = 'custom-data-processing-node';

const inputs: NodePort[] = [
  { id: 'flow_start', label: '开始', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_in_1', label: '数据输入1', shape: 'circle', dataType: PortDataType.ANY, isPortRequired: false },
];

const outputs: NodePort[] = [
  { id: 'flow_end', label: '结束', shape: 'diamond', dataType: PortDataType.FLOW, isPortRequired: true },
  { id: 'data_out_1', label: '输出数据1', shape: 'circle', dataType: PortDataType.ANY, isPortRequired: false },
];

const defaultHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT);

export const customDataProcessingNodeDefinition = {
  type: CUSTOM_DATA_PROCESSING_NODE_TYPE_KEY,
  label: '自定义数据处理',
  description: '执行用户在检查器中定义的JavaScript代码片段，用于处理输入数据并生成输出数据。\n\n脚本编写指南：\n- **访问输入**: 脚本内可以通过全局的 `inputs` 对象访问各输入端口的数据，例如 `inputs.data_in_1` 会得到连接到 `data_in_1` 端口的实际数据值（保持其原始类型）。\n- **输出数据**: 脚本的 `return` 语句的返回值（如果是一个对象）会被用来确定节点的输出。对象的键应与节点的输出端口ID对应，键值即为该端口的输出数据。例如，`return { data_out_1: result, data_out_2: "hello" };`。\n- **流程控制**: 如果返回的对象中包含一个键值对，其键与某个流程输出端口（如 `flow_A`）的ID匹配，且值为 `{ flowSignal: true }`，则该流程端口会被触发。如果脚本成功执行且没有显式触发任何流程输出端口，默认的 `flow_end` 端口（如果存在）会自动触发。\n- **占位符预处理**: 节点配置中的 `customLogic` 字符串在实际执行为JavaScript代码前，会进行一次文本层面的占位符预处理。任何形如 `{{port_id}}` 的占位符会被替换为对应输入端口数据的JSON字符串表示。注意：此替换发生在JavaScript解析之前，因此复杂对象会变成JSON字符串。推荐在脚本中直接使用 `inputs.port_id` 来访问原始数据类型和结构，而不是依赖 `{{port_id}}` 进行数据操作。\n\n注意事项：\n- 脚本应避免长时间运行的同步操作或死循环，以免阻塞工作流执行。\n- 脚本执行中的任何错误会在节点上显示，并可能中断后续流程。\n- 可以在“端口管理”中动态添加、删除和配置数据输入/输出端口以适应脚本需求。',
  defaultTitle: '数据处理脚本',
  width: 250,
  height: defaultHeight,
  headerColor: 'bg-orange-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    customLogic: `// 通过 'inputs' 对象访问输入端口数据, 例如: inputs.data_in_1
// 通过返回一个对象来定义输出端口数据, 例如: return { data_out_1: processedValue };
// 如果没有显式触发流程端口 (如 flow_A: { flowSignal: true }),
// 则 'flow_end' (如果存在) 会在代码成功执行后自动触发。

const data1 = inputs.data_in_1;
let outputMessage = "";

if (typeof data1 === 'number') {
  const square = data1 * data1;
  if (square > 2) {
    outputMessage = "平方大于2";
  } else {
    outputMessage = "不大于2";
  }
} else {
  // 如果输入不是数字，或者未连接/无数据，则 inputs.data_in_1 会是 undefined
  outputMessage = "输入数据1不是一个有效的数字，或未提供数据。";
}

// 将结果输出到 data_out_1 端口
return { data_out_1: outputMessage };
`,
  },
};

export type CustomDataProcessingDefinitionType = typeof customDataProcessingNodeDefinition;
