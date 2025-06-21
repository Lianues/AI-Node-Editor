
import { NodePort, PortDataType } from '../../types';
import { DataViewerContent } from './DataViewerContent';

export const DATA_VIEWER_NODE_TYPE_KEY = 'data-viewer-node';

const inputs: NodePort[] = [

  { id: 'data_in', label: '数据输入', shape: 'circle', dataType: PortDataType.ANY },
];

const outputs: NodePort[] = [

];

export const dataViewerDefinition = {
  type: DATA_VIEWER_NODE_TYPE_KEY,
  label: '数据查看器',
  description: '用于在节点内部可视化显示任何连接到其“数据输入”端口的数据。此节点主要用于调试和检查工作流中特定点的数据状态，它不会修改数据，也没有流程输出端口。接收到的数据会更新节点内部的 `displayedValue` 状态并在其内容区域以格式化（例如JSON）或原始形式展示。\n\n注意事项：\n- 这是一个被动节点，仅用于显示数据，不参与流程控制。\n- 其内容会根据输入数据实时更新。',
  defaultTitle: '数据查看器',
  width: 200,
  headerColor: 'bg-indigo-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    displayedValue: "等待数据...",
    lastDataUpdateTime: null,
   },
  customContentHeight: 120,
  customContentRenderer: DataViewerContent,
  customContentTitle: '当前数据',
};

export type DataViewerDefinitionType = typeof dataViewerDefinition;
    