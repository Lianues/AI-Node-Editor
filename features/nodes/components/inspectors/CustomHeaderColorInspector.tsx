
import React, { useState, useEffect, useCallback } from 'react';
import { Node } from '../../../../types';
import { vscodeDarkTheme } from '../../../../theme/vscodeDark';
import { getDefaultHexColorFromTailwind } from '../../../../utils/colorUtils';

interface CustomHeaderColorInspectorProps {
  node: Node;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
}

const isValidHexColor = (color: string): boolean => /^#([0-9A-F]{3}){1,2}$/i.test(color);

export const CustomHeaderColorInspector: React.FC<CustomHeaderColorInspectorProps> = ({
  node,
  updateNodeData,
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;

  const getDisplayColor = useCallback(() => {
    if (node.data?.customHeaderColor && isValidHexColor(node.data.customHeaderColor)) {
      return node.data.customHeaderColor;
    }
    return getDefaultHexColorFromTailwind(node.headerColor);
  }, [node.data?.customHeaderColor, node.headerColor]);

  const [displayColor, setDisplayColor] = useState<string>(getDisplayColor());

  useEffect(() => {
    setDisplayColor(getDisplayColor());
  }, [getDisplayColor, node.id]);

  const handleColorPickerChange = (newColor: string) => {
    setDisplayColor(newColor);
    updateNodeData(node.id, { customHeaderColor: newColor });
  };
  
  const handleHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayColor(event.target.value);
  };

  const handleHexInputBlur = () => {
    const currentInput = displayColor.trim();
    if (currentInput === '') {
      updateNodeData(node.id, { customHeaderColor: null });
      setDisplayColor(getDefaultHexColorFromTailwind(node.headerColor));
    } else if (isValidHexColor(currentInput)) {
      if (currentInput !== node.data?.customHeaderColor) {
        updateNodeData(node.id, { customHeaderColor: currentInput });
      }
    } else {
      setDisplayColor(getDisplayColor());
    }
  };
  
  const handleHexInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        handleHexInputBlur();
        event.currentTarget.blur();
    } else if (event.key === 'Escape') {
        setDisplayColor(getDisplayColor());
        event.currentTarget.blur();
    }
  };

  const handleResetColor = () => {
    updateNodeData(node.id, { customHeaderColor: null });
    setDisplayColor(getDefaultHexColorFromTailwind(node.headerColor));
  };

  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  // Standard input base class, consistent with DefinedAreaInspector
  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const buttonTheme = vscodeDarkTheme.topBar;
  
  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="space-y-2 my-3 py-3 border-t border-b border-zinc-700">
      <label className={labelClass} htmlFor={`custom-header-color-picker-${node.id}`}>自定义标题背景颜色</label>
      <div className="flex items-center space-x-2">
        <input
          id={`custom-header-color-picker-${node.id}`}
          type="color"
          // Changed w-10 to w-8 to make it a square
          className={`h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`}
          value={displayColor} 
          onChange={(e) => handleColorPickerChange(e.target.value)}
          onMouseDown={stopPropagationMouseDown}
          title="选择颜色"
        />
        <input
          id={`custom-header-color-hex-${node.id}`}
          type="text"
          // Classes match DefinedAreaInspector's hex input for size and proportion
          className={`${inputBaseClass} flex-grow`}
          value={displayColor}
          onChange={handleHexInputChange}
          onBlur={handleHexInputBlur}
          onKeyDown={handleHexInputKeyDown}
          onMouseDown={stopPropagationMouseDown}
          placeholder={getDefaultHexColorFromTailwind(node.headerColor)}
          maxLength={7}
        />
      </div>
      <button
          onClick={handleResetColor}
          className={`w-full text-xs mt-1 px-3 py-1 rounded-md transition-colors ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText}`}
          disabled={!node.data?.customHeaderColor}
        >
          重置为默认颜色
      </button>
    </div>
  );
};
