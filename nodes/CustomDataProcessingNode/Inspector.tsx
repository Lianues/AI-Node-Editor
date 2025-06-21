
import React, { useState, useEffect, useCallback } from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes'; // Or wherever getNodeDefinition is sourced

const CustomDataProcessingInspector: React.FC<
  SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }
> = ({ node, updateNodeData, executionDetails, customTools }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const [customLogic, setCustomLogic] = useState(
    node.data?.customLogic ?? nodeDefinition?.defaultData?.customLogic ?? ''
  );

  useEffect(() => {
    setCustomLogic(node.data?.customLogic ?? nodeDefinition?.defaultData?.customLogic ?? '');
  }, [node.id, node.data?.customLogic, nodeDefinition?.defaultData?.customLogic]);

  const handleLogicChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomLogic(event.target.value);
  };

  const handleLogicBlur = () => {
    if (updateNodeData && node.data?.customLogic !== customLogic) {
      updateNodeData(node.id, { ...node.data, customLogic });
    }
  };

  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载检查器：节点定义未找到。</p>;
  }

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools} // Pass through if BaseNodeInspector uses it
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor={`custom-logic-${node.id}`}>自定义处理逻辑 (JavaScript)</label>
          <textarea
            id={`custom-logic-${node.id}`}
            className={`${inputBaseClass} min-h-[200px] font-mono text-xs resize-y`}
            value={customLogic}
            onChange={handleLogicChange}
            onBlur={handleLogicBlur}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Custom Data Processing Logic"
            placeholder={`// Example: return { data_out_1: inputs.data_in_1 * 2 };`}
          />
           <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            {`通过 \`inputs.port_id\` (推荐，访问原始数据) 或 \`{{port_id}}\` (文本替换) 访问输入。通过 \`return { output_port_id: value }\` 输出数据。`}
          </p>
        </div>
        {/* Static port display - future enhancement could allow editing/adding ports here */}
        {node.inputs.length > 0 && (
          <div>
            <label className={labelClass}>当前输入端口:</label>
            <ul className={`text-xs list-disc list-inside pl-2 ${inspectorTheme.valueTextMuted}`}>
              {node.inputs.map(p => <li key={p.id}>{p.label} ({p.id}, {p.dataType})</li>)}
            </ul>
          </div>
        )}
        {node.outputs.length > 0 && (
          <div>
            <label className={labelClass}>当前输出端口:</label>
            <ul className={`text-xs list-disc list-inside pl-2 ${inspectorTheme.valueTextMuted}`}>
              {node.outputs.map(p => <li key={p.id}>{p.label} ({p.id}, {p.dataType})</li>)}
            </ul>
          </div>
        )}
      </div>
    </BaseNodeInspector>
  );
};

export default CustomDataProcessingInspector;
    