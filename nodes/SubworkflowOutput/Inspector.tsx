
import React, { useState, useEffect } from 'react';
import { SpecificNodeInspectorProps, PortDataType, NodeTypeDefinition } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';

const SubworkflowOutputInspector: React.FC<
  SpecificNodeInspectorProps & { updateNodeData?: (nodeId: string, data: Record<string, any>) => void } 
> = ({ node, updateNodeData, executionDetails, customTools }) => { // Added customTools
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const [portName, setPortName] = useState(node.data?.portName || '输出1');
  const [portDataType, setPortDataType] = useState<PortDataType>(node.data?.portDataType || PortDataType.ANY);
  const [isPortRequired, setIsPortRequired] = useState<boolean>(node.data?.isPortRequired || false);

  useEffect(() => {
    setPortName(node.data?.portName || '输出1');
    setPortDataType(node.data?.portDataType || PortDataType.ANY);
    setIsPortRequired(node.data?.isPortRequired || false);
  }, [node.id, node.data?.portName, node.data?.portDataType, node.data?.isPortRequired]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPortName(event.target.value);
  };

  const handleNameBlur = () => {
    const trimmedName = portName.trim();
    if (updateNodeData && trimmedName && trimmedName !== node.data?.portName) {
      updateNodeData(node.id, { ...node.data, portName: trimmedName });
    } else if (updateNodeData && !trimmedName && (node.data?.portName || '输出1')) {
      setPortName(node.data?.portName || '输出1');
    } else if (updateNodeData && !trimmedName) {
       updateNodeData(node.id, { ...node.data, portName: "" });
    }
  };

  const handleDataTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDataType = event.target.value as PortDataType;
    setPortDataType(newDataType);
    if (updateNodeData) {
      updateNodeData(node.id, { ...node.data, portDataType: newDataType });
    }
  };

  const handleIsRequiredChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIsRequired = event.target.checked;
    setIsPortRequired(newIsRequired);
    if (updateNodeData) {
      updateNodeData(node.id, { ...node.data, isPortRequired: newIsRequired });
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleNameBlur();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setPortName(node.data?.portName || '输出1');
      event.currentTarget.blur();
    }
  };

  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const checkboxLabelClass = `ml-2 text-sm ${inspectorTheme.labelText}`;
  const checkboxClass = `h-4 w-4 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700`;

  const availablePortDataTypes = Object.values(PortDataType).filter(
    (type) => type !== PortDataType.UNKNOWN
  );

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载子程序输出节点的检查器：节点定义未找到。</p>;
  }

  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools} // Pass customTools
    >
      <div className="space-y-3">
        <div>
          <label className={labelClass} htmlFor={`sw-output-portName-${node.id}`}>端口名称</label>
          <input
            id={`sw-output-portName-${node.id}`}
            type="text"
            className={inputBaseClass}
            value={portName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleInputKeyDown}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Subworkflow Output Port Name"
          />
          <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>此名称将作为子程序实例节点上的一个输出端口显示。</p>
        </div>
        <div>
          <label className={labelClass} htmlFor={`sw-output-portDataType-${node.id}`}>端口类型</label>
          <select
            id={`sw-output-portDataType-${node.id}`}
            className={inputBaseClass}
            value={portDataType}
            onChange={handleDataTypeChange}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Subworkflow Output Port Data Type"
          >
            {availablePortDataTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <input
            id={`sw-output-isPortRequired-${node.id}`}
            type="checkbox"
            className={checkboxClass}
            checked={isPortRequired}
            onChange={handleIsRequiredChange}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Is Port Required"
          />
          <label htmlFor={`sw-output-isPortRequired-${node.id}`} className={checkboxLabelClass}>
            是否必须 (端口将显示为菱形)
          </label>
        </div>
      </div>
    </BaseNodeInspector>
  );
};

export default SubworkflowOutputInspector;
