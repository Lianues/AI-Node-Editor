
import React, { useState, useEffect, useCallback } from 'react';
import { Node, NodeTypeDefinition } from '../../../../types';
import { vscodeDarkTheme } from '../../../../theme/vscodeDark';
import { getDefaultHexColorFromTailwindText } from '../../../../utils/colorUtils';
import { getStaticNodeDefinition as getNodeDefinition } from '../../../../nodes'; // To get node definition for subtitle check

interface CustomHeaderTextColorInspectorProps {
  node: Node;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
}

const isValidHexColor = (color: string): boolean => /^#([0-9A-F]{3}){1,2}$/i.test(color);

// Default theme text colors (Tailwind classes)
const DEFAULT_MAIN_TITLE_THEME_CLASS = 'text-slate-100';
const DEFAULT_SUBTITLE_THEME_CLASS = 'text-slate-400';

export const CustomHeaderTextColorInspector: React.FC<CustomHeaderTextColorInspectorProps> = ({
  node,
  updateNodeData,
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type);

  const getDisplayMainTitleColor = useCallback(() => {
    if (node.data?.customMainTitleColor && isValidHexColor(node.data.customMainTitleColor)) {
      return node.data.customMainTitleColor;
    }
    return getDefaultHexColorFromTailwindText(DEFAULT_MAIN_TITLE_THEME_CLASS);
  }, [node.data?.customMainTitleColor]);

  const getDisplaySubtitleColor = useCallback(() => {
    if (node.data?.customSubtitleColor && isValidHexColor(node.data.customSubtitleColor)) {
      return node.data.customSubtitleColor;
    }
    return getDefaultHexColorFromTailwindText(DEFAULT_SUBTITLE_THEME_CLASS);
  }, [node.data?.customSubtitleColor]);

  const [mainTitleDisplayColor, setMainTitleDisplayColor] = useState<string>(getDisplayMainTitleColor());
  const [subtitleDisplayColor, setSubtitleDisplayColor] = useState<string>(getDisplaySubtitleColor());

  useEffect(() => {
    setMainTitleDisplayColor(getDisplayMainTitleColor());
    setSubtitleDisplayColor(getDisplaySubtitleColor());
  }, [getDisplayMainTitleColor, getDisplaySubtitleColor, node.id]);

  const handleColorChange = (
    colorType: 'mainTitle' | 'subtitle',
    newColor: string,
    isPickerChange: boolean = false
  ) => {
    const dataKey = colorType === 'mainTitle' ? 'customMainTitleColor' : 'customSubtitleColor';
    if (colorType === 'mainTitle') {
      setMainTitleDisplayColor(newColor);
    } else {
      setSubtitleDisplayColor(newColor);
    }

    if (isPickerChange || (newColor.trim() === '' && !isPickerChange)) { // Empty string or picker change updates immediately
        updateNodeData(node.id, { [dataKey]: newColor.trim() === '' ? null : newColor });
        if (newColor.trim() === '' && !isPickerChange) { // Reset to default if input cleared
             if (colorType === 'mainTitle') setMainTitleDisplayColor(getDefaultHexColorFromTailwindText(DEFAULT_MAIN_TITLE_THEME_CLASS));
             else setSubtitleDisplayColor(getDefaultHexColorFromTailwindText(DEFAULT_SUBTITLE_THEME_CLASS));
        }
    }
    // For hex text input, final update happens onBlur
  };

  const handleHexInputBlur = (colorType: 'mainTitle' | 'subtitle') => {
    const currentColor = colorType === 'mainTitle' ? mainTitleDisplayColor : subtitleDisplayColor;
    const dataKey = colorType === 'mainTitle' ? 'customMainTitleColor' : 'customSubtitleColor';
    const currentCustomValue = colorType === 'mainTitle' ? node.data?.customMainTitleColor : node.data?.customSubtitleColor;
    const defaultColorGetter = colorType === 'mainTitle' ? getDisplayMainTitleColor : getDisplaySubtitleColor;
    const defaultThemeClass = colorType === 'mainTitle' ? DEFAULT_MAIN_TITLE_THEME_CLASS : DEFAULT_SUBTITLE_THEME_CLASS;


    const trimmedColor = currentColor.trim();
    if (trimmedColor === '') { // User cleared the input
      if (currentCustomValue !== null) { // Only update if it was previously set
        updateNodeData(node.id, { [dataKey]: null });
      }
      if (colorType === 'mainTitle') setMainTitleDisplayColor(getDefaultHexColorFromTailwindText(defaultThemeClass));
      else setSubtitleDisplayColor(getDefaultHexColorFromTailwindText(defaultThemeClass));
    } else if (isValidHexColor(trimmedColor)) {
      if (trimmedColor !== currentCustomValue) {
        updateNodeData(node.id, { [dataKey]: trimmedColor });
      }
    } else { // Invalid hex, revert
      if (colorType === 'mainTitle') setMainTitleDisplayColor(defaultColorGetter());
      else setSubtitleDisplayColor(defaultColorGetter());
    }
  };
  
  const handleHexInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, colorType: 'mainTitle' | 'subtitle') => {
    if (event.key === 'Enter') {
        handleHexInputBlur(colorType);
        event.currentTarget.blur();
    } else if (event.key === 'Escape') {
        if (colorType === 'mainTitle') setMainTitleDisplayColor(getDisplayMainTitleColor());
        else setSubtitleDisplayColor(getDisplaySubtitleColor());
        event.currentTarget.blur();
    }
  };

  const handleResetColor = (colorType: 'mainTitle' | 'subtitle') => {
    const dataKey = colorType === 'mainTitle' ? 'customMainTitleColor' : 'customSubtitleColor';
    updateNodeData(node.id, { [dataKey]: null });
    if (colorType === 'mainTitle') {
      setMainTitleDisplayColor(getDefaultHexColorFromTailwindText(DEFAULT_MAIN_TITLE_THEME_CLASS));
    } else {
      setSubtitleDisplayColor(getDefaultHexColorFromTailwindText(DEFAULT_SUBTITLE_THEME_CLASS));
    }
  };
  
  const displaySubtitleOption = node.title?.trim() && nodeDefinition?.label && node.title.trim() !== nodeDefinition.label;

  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const buttonTheme = vscodeDarkTheme.topBar;
  const colorPickerClass = `h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`;
  
  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="space-y-3 my-3 py-3 border-t border-b border-zinc-700">
      {/* Main Title Color */}
      <div>
        <label className={labelClass} htmlFor={`custom-main-title-color-picker-${node.id}`}>自定义主标题颜色</label>
        <div className="flex items-center space-x-2">
          <input
            id={`custom-main-title-color-picker-${node.id}`}
            type="color"
            className={colorPickerClass}
            value={mainTitleDisplayColor}
            onChange={(e) => handleColorChange('mainTitle', e.target.value, true)}
            onMouseDown={stopPropagationMouseDown}
            title="选择主标题颜色"
          />
          <input
            id={`custom-main-title-color-hex-${node.id}`}
            type="text"
            className={`${inputBaseClass} flex-grow`}
            value={mainTitleDisplayColor}
            onChange={(e) => handleColorChange('mainTitle', e.target.value)}
            onBlur={() => handleHexInputBlur('mainTitle')}
            onKeyDown={(e) => handleHexInputKeyDown(e, 'mainTitle')}
            onMouseDown={stopPropagationMouseDown}
            placeholder={getDefaultHexColorFromTailwindText(DEFAULT_MAIN_TITLE_THEME_CLASS)}
            maxLength={7}
          />
        </div>
        <button
          onClick={() => handleResetColor('mainTitle')}
          className={`w-full text-xs mt-1 px-3 py-1 rounded-md transition-colors ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText}`}
          disabled={!node.data?.customMainTitleColor}
        >
          重置主标题颜色
        </button>
      </div>

      {/* Subtitle Color - Conditional */}
      {displaySubtitleOption && (
        <div className="mt-3 pt-3 border-t border-zinc-600">
          <label className={labelClass} htmlFor={`custom-subtitle-color-picker-${node.id}`}>自定义副标题颜色</label>
          <div className="flex items-center space-x-2">
            <input
              id={`custom-subtitle-color-picker-${node.id}`}
              type="color"
              className={colorPickerClass}
              value={subtitleDisplayColor}
              onChange={(e) => handleColorChange('subtitle', e.target.value, true)}
              onMouseDown={stopPropagationMouseDown}
              title="选择副标题颜色"
            />
            <input
              id={`custom-subtitle-color-hex-${node.id}`}
              type="text"
              className={`${inputBaseClass} flex-grow`}
              value={subtitleDisplayColor}
              onChange={(e) => handleColorChange('subtitle', e.target.value)}
              onBlur={() => handleHexInputBlur('subtitle')}
              onKeyDown={(e) => handleHexInputKeyDown(e, 'subtitle')}
              onMouseDown={stopPropagationMouseDown}
              placeholder={getDefaultHexColorFromTailwindText(DEFAULT_SUBTITLE_THEME_CLASS)}
              maxLength={7}
            />
          </div>
          <button
            onClick={() => handleResetColor('subtitle')}
            className={`w-full text-xs mt-1 px-3 py-1 rounded-md transition-colors ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText}`}
            disabled={!node.data?.customSubtitleColor}
          >
            重置副标题颜色
          </button>
        </div>
      )}
    </div>
  );
};
