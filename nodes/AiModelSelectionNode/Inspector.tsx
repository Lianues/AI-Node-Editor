
import React from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition, ModelConfigGroup, EditableAiModelConfig } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes'; // Or appropriate path

const AiModelSelectionInspector: React.FC<
  SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }
> = ({ node, updateNodeData, executionDetails, customTools, mergedModelConfigs }) => { 
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载AI模型选择节点的检查器：节点定义未找到。</p>;
  }

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools}
      // mergedModelConfigs prop removed from here as BaseNodeInspector does not accept it
    />
  );
};

export default AiModelSelectionInspector;