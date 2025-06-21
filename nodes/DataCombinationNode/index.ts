
import { dataCombinationNodeDefinition, DATA_COMBINATION_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import DataCombinationInspector from './Inspector';
import { executeDataCombinationNode } from './Executor';
import { NodeTypeDefinition } from '../../types';
import { DataCollectionViewerContent } from '../../components/shared/DataCollectionViewerContent'; // Import new viewer

export const DataCombinationNode: NodeTypeDefinition = {
  ...dataCombinationNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: DataCombinationInspector,
  executor: executeDataCombinationNode,
  customContentRenderer: DataCollectionViewerContent, // Assign the DataCollectionViewerContent
};

export { DATA_COMBINATION_NODE_TYPE_KEY };
export { dataCombinationNodeDefinition as DataCombinationRawDefinition } from './Definition';