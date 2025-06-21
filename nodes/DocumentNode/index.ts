
import { documentNodeDefinition, DOCUMENT_NODE_TYPE_KEY } from './Definition';
import UniversalNodeRenderer from '../../features/nodes/components/UniversalNodeRenderer';
import DocumentNodeInspector from './Inspector';
import { executeDocumentNode } from './Executor';
import { NodeTypeDefinition } from '../../types';

export const DocumentNode: NodeTypeDefinition = {
  ...documentNodeDefinition,
  renderer: UniversalNodeRenderer,
  inspector: DocumentNodeInspector,
  executor: executeDocumentNode,
};

export { DOCUMENT_NODE_TYPE_KEY };
export { documentNodeDefinition as DocumentNodeRawDefinition } from './Definition';
