
import { dataMergeNodeDefinition, DATA_MERGE_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import DataMergeInspector from './Inspector';
import { executeDataMergeNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
import { DataCollectionViewerContent } from '../../components/shared/DataCollectionViewerContent';

export const DataMergeNode: NodeTypeDefinition = {
  ...dataMergeNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: DataMergeInspector,
  executor: executeDataMergeNode,
  customContentRenderer: DataCollectionViewerContent,
};

export { DATA_MERGE_NODE_TYPE_KEY };
export { dataMergeNodeDefinition as DataMergeNodeRawDefinition } from './Definition';