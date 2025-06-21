
import { dataSplitNodeDefinition, DATA_SPLIT_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import DataSplitInspector from './Inspector';
import { executeDataSplitNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
import { DataCollectionViewerContent } from '../../components/shared/DataCollectionViewerContent'; // Import new viewer

export const DataSplitNode: NodeTypeDefinition = {
  ...dataSplitNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: DataSplitInspector,
  executor: executeDataSplitNode,
  customContentRenderer: DataCollectionViewerContent, // Assign the DataCollectionViewerContent
};

export { DATA_SPLIT_NODE_TYPE_KEY };
export { dataSplitNodeDefinition as DataSplitRawDefinition } from './Definition';