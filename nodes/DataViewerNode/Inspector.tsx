
import React from 'react'; 
import { SpecificNodeInspectorProps, NodeTypeDefinition } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';

const DataViewerInspector: React.FC<SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }> = ({ node, updateNodeData, executionDetails, customTools }) => { // Added customTools
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const displayedValue = node.data?.displayedValue;
  let formattedValue = "";

  if (displayedValue === undefined) {
    formattedValue = "undefined";
  } else if (displayedValue === null) {
    formattedValue = "null";
  } else if (typeof displayedValue === 'object') {
    try {
      formattedValue = JSON.stringify(displayedValue, null, 2);
    } catch (e) {
      formattedValue = "[Error displaying object in inspector]";
    }
  } else {
    formattedValue = String(displayedValue);
  }

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载数据查看器节点的检查器：节点定义未找到。</p>;
  }

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools} // Pass customTools
    >
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText} mb-1`}>当前显示值 (属性)</label>
        <pre className={`text-xs ${inspectorTheme.valueTextMuted} bg-zinc-700 p-2 rounded overflow-auto max-h-40`}>
          {formattedValue}
        </pre>
      </div>
    </BaseNodeInspector>
  );
};

export default DataViewerInspector;
