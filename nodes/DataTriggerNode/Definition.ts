
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const DATA_TRIGGER_NODE_TYPE_KEY = 'data-trigger-node';

// Removed flow_start port
const defaultInputs: NodePort[] = [
  { 
    id: 'data_in_1', 
    label: '数据输入1', 
    shape: 'circle', // Optional to connect
    dataType: PortDataType.ANY, 
    isPortRequired: false, 
    isDataRequiredOnConnection: true // But if connected, data must arrive for the node to trigger
  },
];

const defaultOutputs: NodePort[] = [
  { 
    id: 'flow_end', 
    label: '结束', 
    shape: 'diamond', 
    dataType: PortDataType.FLOW, 
    isPortRequired: true 
  },
];

const defaultHeight = calculateNodeHeight(defaultInputs, defaultOutputs, HEADER_HEIGHT);

export const dataTriggerNodeDefinition = {
  type: DATA_TRIGGER_NODE_TYPE_KEY,
  label: '数据触发',
  description: '此节点作为一个数据就绪的信号门。当所有已连接的数据输入端口都接收到数据后，节点会触发其“结束”流程端口。它本身不传递任何数据，仅用于流程控制。如果任何已连接的数据输入端口尚未收到数据，节点将保持等待状态。',
  defaultTitle: '数据触发',
  width: 200,
  height: defaultHeight,
  headerColor: 'bg-sky-600', 
  bodyColor: 'bg-slate-700',
  inputs: defaultInputs,
  outputs: defaultOutputs,
  defaultData: {}, 
};

export type DataTriggerNodeDefinitionType = typeof dataTriggerNodeDefinition;
