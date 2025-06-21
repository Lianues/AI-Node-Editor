
import { NodePort, PortDataType } from '../../types';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';
import { DataDelayNodeContent } from './DataDelayNodeContent';

export const DATA_DELAY_NODE_TYPE_KEY = 'data-delay-node';

const defaultInputs: NodePort[] = [
  { 
    id: 'data_in_1', 
    label: '数据输入1', 
    shape: 'circle', 
    dataType: PortDataType.ANY, 
    isPortRequired: false,
    isDataRequiredOnConnection: true,
  },
];

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

const customContentHeight = 100; // Adjust as needed for the content renderer
const customContentTitle = "端口延迟配置 (毫秒)";
const defaultHeight = calculateNodeHeight(defaultInputs, defaultOutputs, HEADER_HEIGHT, customContentHeight, customContentTitle);

export const dataDelayNodeDefinition = {
  type: DATA_DELAY_NODE_TYPE_KEY,
  label: '数据延迟',
  description: '此节点将每个输入端口接收到的数据延迟指定时间后，从对应的输出端口输出。延迟时间（单位毫秒）可以在节点内容区为每个数据输入端口单独配置。此节点没有开始/结束流程端口，其行为完全由数据到达输入端口驱动。每个输入端口的数据延迟是独立处理的。',
  defaultTitle: '数据延迟',
  width: 230,
  height: defaultHeight,
  headerColor: 'bg-lime-600', 
  bodyColor: 'bg-slate-700',
  inputs: defaultInputs,
  outputs: defaultOutputs,
  defaultData: {
    portDelayTimes: { 'data_in_1': 1000 }, // Default delay for the initial port
    displayTitle: customContentTitle, // For DataDelayNodeContent if it needs a title
  },
  customContentHeight: customContentHeight,
  customContentRenderer: DataDelayNodeContent,
  customContentTitle: customContentTitle,
};

export type DataDelayNodeDefinitionType = typeof dataDelayNodeDefinition;
