
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';
import { ConditionalNodeContent } from './ConditionalNodeContent';

export const CONDITIONAL_NODE_TYPE_KEY = 'conditional-node';

const inputs: NodePort[] = [
  { 
    id: 'flow_in', 
    label: '流程输入', 
    shape: 'diamond', 
    dataType: PortDataType.FLOW, 
    isPortRequired: true 
  },
  { 
    id: 'condition_data_in', 
    label: '条件数据', 
    shape: 'circle', 
    dataType: PortDataType.ANY, 
    isPortRequired: false, // Optional, condition might not directly use it.
    isDataRequiredOnConnection: true // If connected, expect data
  },
];

const outputs: NodePort[] = [
  { 
    id: 'flow_true', 
    label: 'True分支', 
    shape: 'diamond', 
    dataType: PortDataType.FLOW, 
    isPortRequired: true 
  },
  { 
    id: 'flow_false', 
    label: 'False分支', 
    shape: 'diamond', 
    dataType: PortDataType.FLOW, 
    isPortRequired: true 
  },
];

const customContentHeight = 28; // Height for displaying the condition string
const customContentTitle = "条件 (Condition)";
const defaultHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT, customContentHeight, customContentTitle);

export const conditionalNodeDefinition = {
  type: CONDITIONAL_NODE_TYPE_KEY,
  label: '条件判断',
  description: "根据输入数据评估一个条件表达式。基于评估结果（真或假），触发不同的流程输出端口（'True分支' 或 'False分支'）。\n\n条件表达式语法:\n- **端口值**: 使用 `{{port_id}}` 访问输入端口的值 (例如 `{{condition_data_in}}`)。\n- **字面量**: 数字 (如 `10`, `3.14`), 字符串 (如 `'active'`, `\"hello\"`), 布尔值 (`true`, `false`), 以及 `null`, `undefined`。\n- **比较运算符**: `==`, `!=`, `===`, `!==`, `>`, `<`, `>=`, `<=`。\n- **逻辑运算符**: `&&` (与), `||` (或), `!` (非)。\n- **算术运算符**: `+`, `-`, `*`, `/`, `%` (取模)。字符串拼接也使用 `+`。\n- **分组**: 使用 `()` 进行表达式分组。\n- **示例**: `{{condition_data_in}} > 10 && {{another_input_port}} === 'ready'`\n\n如果引用的输入端口 `{{port_id}}` 未连接或无数据，其在表达式中的值将为 `undefined`。",
  defaultTitle: '条件判断',
  width: 230,
  height: defaultHeight,
  headerColor: 'bg-orange-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    conditionExpression: "true", // Default condition
  },
  customContentHeight: customContentHeight,
  customContentRenderer: ConditionalNodeContent,
  customContentTitle: customContentTitle,
};

export type ConditionalNodeDefinitionType = typeof conditionalNodeDefinition;
