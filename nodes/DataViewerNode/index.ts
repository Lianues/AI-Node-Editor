import { dataViewerDefinition, DATA_VIEWER_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import DataViewerInspector from './Inspector';
import { executeDataViewer } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const DataViewerNode: NodeTypeDefinition = {
  ...dataViewerDefinition, // Includes defaultData, customContentHeight, customContentRenderer, customContentTitle
  renderer: UniversalNodeRenderer,
  inspector: DataViewerInspector,
  executor: executeDataViewer,
};

export { DATA_VIEWER_NODE_TYPE_KEY };
export { dataViewerDefinition as DataViewerRawDefinition } from './Definition';