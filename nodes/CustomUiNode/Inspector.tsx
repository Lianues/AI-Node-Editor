
import React, { useState, useEffect, useCallback } from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';

const CustomUiNodeInspector: React.FC<
  SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void }
> = ({ node, updateNodeData, executionDetails, customTools }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const [customHtml, setCustomHtml] = useState(
    node.data?.customHtml ?? nodeDefinition?.defaultData?.customHtml ?? ''
  );
  const [uiHeight, setUiHeight] = useState<string | number>(
    node.data?.uiHeight ?? nodeDefinition?.defaultData?.uiHeight ?? 300 // Default for modal content height
  );

  useEffect(() => {
    setCustomHtml(node.data?.customHtml ?? nodeDefinition?.defaultData?.customHtml ?? '');
    setUiHeight(node.data?.uiHeight ?? nodeDefinition?.defaultData?.uiHeight ?? 300);
  }, [node.id, node.data, nodeDefinition?.defaultData]);

  const handleHtmlChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomHtml(event.target.value);
  };

  const handleHtmlBlur = () => {
    if (updateNodeData && node.data?.customHtml !== customHtml) {
      updateNodeData(node.id, { ...node.data, customHtml });
    }
  };

  const handleHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUiHeight(event.target.value);
  };

  const handleHeightBlur = () => {
    if (updateNodeData) {
      const newHeight = parseInt(String(uiHeight), 10);
      if (!isNaN(newHeight) && newHeight > 0 && newHeight !== node.data?.uiHeight) {
        updateNodeData(node.id, { ...node.data, uiHeight: newHeight });
      } else if (isNaN(newHeight) || newHeight <= 0) {
        // Revert to original or default if invalid
        setUiHeight(node.data?.uiHeight ?? nodeDefinition?.defaultData?.uiHeight ?? 300);
      }
    }
  };
  
  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载自定义UI节点的检查器：节点定义未找到。</p>;
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
          <label className={labelClass} htmlFor={`custom-ui-html-${node.id}`}>自定义界面代码 (HTML/CSS)</label>
          <textarea
            id={`custom-ui-html-${node.id}`}
            className={`${inputBaseClass} min-h-[150px] font-mono text-xs`}
            value={customHtml}
            onChange={handleHtmlChange}
            onBlur={handleHtmlBlur}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Custom UI HTML/CSS Code"
            placeholder="在此处输入HTML和CSS代码。例如：\n<div style='color: lightblue;'>Hello, {{data_in_1}}!</div>\n<style>\n  div { font-size: 16px; }\n</style>"
          />
           <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            未来将支持使用 {"`{{input_port_id}}`"} 语法动态插入来自输入端口的数据。
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor={`custom-ui-height-${node.id}`}>全屏界面内容高度 (px)</label>
          <input
            id={`custom-ui-height-${node.id}`}
            type="number"
            min="50"
            step="10"
            className={inputBaseClass}
            value={uiHeight}
            onChange={handleHeightChange}
            onBlur={handleHeightBlur}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Custom UI Content Height in Full-Screen Preview (pixels)"
          />
        </div>
      </div>
    </BaseNodeInspector>
  );
};

export default CustomUiNodeInspector;
