
import React, { useState, useEffect } from 'react';
import { ProgramInterfaceDisplayItem } from '../../../types';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { PortDataType } from '../../../types';

interface ProgramInterfaceItemPropertiesProps {
  interfaceItem: ProgramInterfaceDisplayItem;
  onUpdateName: (interfaceItem: ProgramInterfaceDisplayItem, newName: string) => void;
  onUpdateInterfaceDetails: (
    interfaceItem: ProgramInterfaceDisplayItem,
    updates: { dataType?: PortDataType; isPortRequired?: boolean }
  ) => void;
}

export const ProgramInterfaceItemProperties: React.FC<ProgramInterfaceItemPropertiesProps> = ({
  interfaceItem,
  onUpdateName,
  onUpdateInterfaceDetails,
}) => {
  const [editableName, setEditableName] = useState(interfaceItem.name);
  const [editableDataType, setEditableDataType] = useState<PortDataType>(interfaceItem.dataType);
  const [editableIsRequired, setEditableIsRequired] = useState<boolean>(interfaceItem.isRequired);

  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-xs`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const checkboxLabelClass = `ml-2 text-xs ${inspectorTheme.labelText}`;
  const checkboxClass = `h-3.5 w-3.5 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700`;

  useEffect(() => {
    // console.log(`[PI_ItemProps ${interfaceItem.id.slice(0,5)}] useEffect: Setting editable states. Received isRequired: ${interfaceItem.isRequired}, Name: ${interfaceItem.name}`);
    setEditableName(interfaceItem.name);
    setEditableDataType(interfaceItem.dataType);
    setEditableIsRequired(interfaceItem.isRequired);
  }, [interfaceItem.id, interfaceItem.name, interfaceItem.dataType, interfaceItem.isRequired]);

  const handleNameBlur = () => {
    const trimmedName = editableName.trim();
    if (trimmedName && trimmedName !== interfaceItem.name) {
      // console.log(`[PI_ItemProps ${interfaceItem.id.slice(0,5)}] handleNameBlur: Updating name to "${trimmedName}"`);
      onUpdateName(interfaceItem, trimmedName);
    } else if (!trimmedName && interfaceItem.name) {
      // console.log(`[PI_ItemProps ${interfaceItem.id.slice(0,5)}] handleNameBlur: Name cleared, reverting to "${interfaceItem.name}"`);
      setEditableName(interfaceItem.name);
    }
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleNameBlur();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setEditableName(interfaceItem.name);
      event.currentTarget.blur();
    }
  };

  const handleDataTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDataType = event.target.value as PortDataType;
    // console.log(`[PI_ItemProps ${interfaceItem.id.slice(0,5)}] handleDataTypeChange: New type "${newDataType}"`);
    setEditableDataType(newDataType);
    onUpdateInterfaceDetails(interfaceItem, { dataType: newDataType });
  };

  const handleIsRequiredChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIsRequired = event.target.checked;
    // console.log(`[PI_ItemProps ${interfaceItem.id.slice(0,5)}] handleIsRequiredChange: Checkbox toggled. New isRequired: ${newIsRequired}`);
    setEditableIsRequired(newIsRequired);
    onUpdateInterfaceDetails(interfaceItem, { isPortRequired: newIsRequired });
  };
  
  const availablePortDataTypes = Object.values(PortDataType).filter(
    (type) => type !== PortDataType.UNKNOWN
  );
  
  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();
  // console.log(`[PI_ItemProps ${interfaceItem.id.slice(0,5)}] Rendering. isRequired: ${interfaceItem.isRequired}, editableIsRequired: ${editableIsRequired}`);
  return (
    <div className={`p-2 my-0.5 mx-1 border ${vscodeDarkTheme.nodeListPanel.border} bg-zinc-700 rounded-b-md space-y-3 text-xs`}>
      <div>
        <label htmlFor={`interface-name-${interfaceItem.id}`} className={labelClass}>
          接口名称:
        </label>
        <input
          id={`interface-name-${interfaceItem.id}`}
          type="text"
          value={editableName}
          onChange={(e) => setEditableName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          onMouseDown={stopPropagationMouseDown}
          className={inputBaseClass}
          aria-label={`Interface name ${interfaceItem.name}`}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`interface-dataType-${interfaceItem.id}`}>数据类型:</label>
        <select
          id={`interface-dataType-${interfaceItem.id}`}
          className={inputBaseClass}
          value={editableDataType}
          onChange={handleDataTypeChange}
          onMouseDown={stopPropagationMouseDown}
          aria-label="Interface Data Type"
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
          id={`interface-isRequired-${interfaceItem.id}`}
          type="checkbox"
          className={checkboxClass}
          checked={editableIsRequired} // Use local state for checkbox checked status
          onChange={handleIsRequiredChange}
          onMouseDown={stopPropagationMouseDown}
          aria-label="Is Interface Required"
        />
        <label htmlFor={`interface-isRequired-${interfaceItem.id}`} className={checkboxLabelClass}>
          是否必需 (菱形端口)
        </label>
      </div>
    </div>
  );
};
