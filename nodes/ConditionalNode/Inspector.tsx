
import React, { useState, useEffect } from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';

const ConditionalNodeInspector: React.FC<
  SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }
> = ({ node, updateNodeData, executionDetails, customTools }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const [conditionExpression, setConditionExpression] = useState(
    node.data?.conditionExpression ?? nodeDefinition?.defaultData?.conditionExpression ?? "true"
  );

  useEffect(() => {
    setConditionExpression(node.data?.conditionExpression ?? nodeDefinition?.defaultData?.conditionExpression ?? "true");
  }, [node.id, node.data?.conditionExpression, nodeDefinition?.defaultData?.conditionExpression]);

  const handleExpressionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConditionExpression(event.target.value);
  };

  const handleExpressionBlur = () => {
    if (updateNodeData) {
        const trimmedExpression = conditionExpression.trim();
        const finalExpression = trimmedExpression === "" ? "true" : trimmedExpression;
        if (node.data?.conditionExpression !== finalExpression) {
            updateNodeData(node.id, { ...node.data, conditionExpression: finalExpression });
            if(trimmedExpression === "") setConditionExpression("true"); // Update local state if it was auto-corrected
        }
    }
  };
  
  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载条件判断节点的检查器：节点定义未找到。</p>;
  }
  
  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools}
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor={`condition-expression-${node.id}`}>条件表达式:</label>
          <textarea
            id={`condition-expression-${node.id}`}
            className={`${inputBaseClass} min-h-[80px] font-mono text-xs resize-y`}
            value={conditionExpression}
            onChange={handleExpressionChange}
            onBlur={handleExpressionBlur}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Condition Expression"
            placeholder="例如: {{condition_data_in}} > 10"
          />
          <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            使用JavaScript表达式。通过 `{'{{port_id}}'}` 访问输入端口值。
            查看节点描述获取更多语法和操作符信息。
          </p>
        </div>
      </div>
    </BaseNodeInspector>
  );
};

export default ConditionalNodeInspector;
