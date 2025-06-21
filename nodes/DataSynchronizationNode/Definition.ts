
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const DATA_SYNCHRONIZATION_NODE_TYPE_KEY = 'data-synchronization-node';

// Removed flow_start port
const defaultInputs: NodePort[] = [
  { 
    id: 'data_in_1', 
    label: '数据输入1', 
    shape: 'circle', 
    dataType: PortDataType.ANY, 
    isPortRequired: false,
    isDataRequiredOnConnection: true 
  },
];

// Removed flow_end port
const defaultOutputs: NodePort[] = [
  { 
    id: 'data_out_1', 
    label: '输出: 数据输入1', 
    shape: 'circle', 
    dataType: PortDataType.ANY, 
    isPortRequired: false, 
    isDataRequiredOnConnection: true, 
  },
];

const defaultHeight = calculateNodeHeight(defaultInputs, defaultOutputs, HEADER_HEIGHT);

export const dataSynchronizationNodeDefinition = {
  type: DATA_SYNCHRONIZATION_NODE_TYPE_KEY,
  label: '数据同步',
  description: '此节点用于同步多个数据流。当所有已连接的数据输入端口都接收到数据后，节点会将其接收到的每个输入数据原样传递到对应的输出端口。如果任何已连接的数据输入端口尚未收到数据，节点将保持等待状态。此节点可用于确保下游节点在所有必需数据准备就绪后才开始处理。注意：此节点不再包含开始/结束流程端口，其行为完全由数据输入驱动。',
  defaultTitle: '数据同步',
  width: 220,
  height: defaultHeight,
  headerColor: 'bg-teal-500', 
  bodyColor: 'bg-slate-700',
  inputs: defaultInputs,
  outputs: defaultOutputs,
  defaultData: {}, 
};

export type DataSynchronizationNodeDefinitionType = typeof dataSynchronizationNodeDefinition;
