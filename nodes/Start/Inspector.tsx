
import React from 'react'; 
import { SpecificNodeInspectorProps, NodeTypeDefinition } from '../../types'; // Added NodeTypeDefinition
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector'; // Import BaseNodeInspector
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes'; // To fetch node definition for BaseNodeInspector

const StartInspector: React.FC<SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }> = ({ node, updateNodeData, executionDetails, customTools }) => { // Added customTools
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载开始节点的检查器：节点定义未找到。</p>;
  }

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools} // Pass customTools
    >
      {/* No node-specific children needed for StartNode, as its description is in the definition */}
      {/* If there were specific controls, they would go here */}
    </BaseNodeInspector>
  );
};

export default StartInspector;
