
import React from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';

const DataMergeInspector: React.FC<
  SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }
> = ({ node, updateNodeData, executionDetails, customTools }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载数据合并节点的检查器：节点定义未找到。</p>;
  }

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools}
    >
      <div className="space-y-2">
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>
          此节点将所有连接到其数据输入端口的数据项按类型合并。
          相同类型的数据将按输入端口顺序直接合并。
          您可以在“端口管理”部分添加、移除或修改输入端口。
          合并后的结果将作为JSON集合从 '合并数据' 端口输出，并在节点上实时显示。
        </p>
      </div>
    </BaseNodeInspector>
  );
};

export default DataMergeInspector;