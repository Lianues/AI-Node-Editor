import { NodePort, PortDataType } from '../../types';
import { DocumentNodeContent } from './DocumentNodeContent';
import { calculateNodeHeight } from '../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../components/renderingConstants';

export const DOCUMENT_NODE_TYPE_KEY = 'document-node'; // Internal key remains the same

const inputs: NodePort[] = [
  {
    id: 'content_in',
    label: '写入内容',
    shape: 'circle',
    dataType: PortDataType.STRING,
    isPortRequired: false,
    isDataRequiredOnConnection: false // Data can be optional (e.g. sending null/undefined to clear)
  },
];

const outputs: NodePort[] = [
  // flow_end is removed
  {
    id: 'content_out',
    label: '输出内容',
    shape: 'circle',
    dataType: PortDataType.STRING,
    isDataRequiredOnConnection: true // If connected, it's for pulling, so data is expected to be available.
  },
];

const defaultCustomContentHeight = 100;
const defaultCustomContentTitle = "变量内容";
const defaultHeight = calculateNodeHeight(inputs, outputs, HEADER_HEIGHT, defaultCustomContentHeight, defaultCustomContentTitle);

export const documentNodeDefinition = {
  type: DOCUMENT_NODE_TYPE_KEY,
  label: '全局变量节点',
  description: '充当一个全局的、持久化的变量存储单元。其内部内容（存储在 `documentContent` 中）在工作流多次运行之间保持不变。\n\n核心行为：\n1. **写入更新**: 当数据通过“写入内容”端口输入时，节点仅更新其内部存储的内容。此操作不会主动将内容推送到输出端口。如果输入为 `null` 或 `undefined`，则内部内容会被清空 (实际存储为 `undefined`)。\n2. **UI编辑**: 用户可以直接在节点上的文本区域编辑和查看变量内容。\n3. **状态拉取 (按需读取)**: 此节点被标记为“状态源” (`isStatefulSource: true`)。下游节点通过执行引擎直接“拉取”其当前存储的最新状态。这是从此节点获取数据的主要方式。\n\n注意事项：\n- 如果内部内容为空字符串、`null` 或 `undefined`，则在拉取时会提供 `undefined` 给下游。\n- 此节点的内部状态在整个工作流项目中是全局持久的，除非被显式更新或工作流重置。',
  defaultTitle: '全局变量',
  width: 220,
  height: defaultHeight, 
  headerColor: 'bg-blue-600',
  bodyColor: 'bg-slate-700',
  inputs: inputs,
  outputs: outputs,
  defaultData: {
    documentContent: "" // Initial state is empty string
  },
  customContentHeight: defaultCustomContentHeight,
  customContentRenderer: DocumentNodeContent,
  customContentTitle: defaultCustomContentTitle,
  isStatefulSource: true,
  stateOutputDataKeys: {
    'content_out': 'documentContent',
  },
};

export type DocumentNodeDefinitionType = typeof documentNodeDefinition;