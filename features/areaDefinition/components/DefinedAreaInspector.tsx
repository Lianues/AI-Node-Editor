
import React, { useState, useEffect, useCallback } from 'react';
import { DefinedArea, SpecificDefinedAreaInspectorProps } from '../types/areaDefinitionTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

export const DefinedAreaInspector: React.FC<SpecificDefinedAreaInspectorProps> = ({ area, updateDefinedArea }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const [title, setTitle] = useState(area.title);
  
  const isValidHex = (color: string): boolean => /^#([0-9A-F]{3}){1,2}$/i.test(color);

  const [hexBgColor, setHexBgColor] = useState(() => 
    isValidHex(area.color) ? area.color : '#2563eb'
  );
  const [opacity, setOpacity] = useState<string | number>(area.opacity);
  const [textScaleFactor, setTextScaleFactor] = useState<string | number>(area.textScaleFactor || 1);
  const [hexTextColor, setHexTextColor] = useState(() => 
    isValidHex(area.textColor || '') ? area.textColor! : '#FFFFFF'
  );
  const [textOpacityValue, setTextOpacityValue] = useState<string | number>(area.textOpacity === undefined ? 1.0 : area.textOpacity);

  const [hexBorderColor, setHexBorderColor] = useState(() => 
    isValidHex(area.borderColor || '') ? area.borderColor! : '#888888'
  );
  const [borderOpacityValue, setBorderOpacityValue] = useState<string | number>(area.borderOpacity === undefined ? 1.0 : area.borderOpacity);
  const [borderStyleValue, setBorderStyleValue] = useState<'solid' | 'dashed' | 'dotted' | 'dash-dot'>(area.borderStyle || 'solid');
  const [borderWidthValue, setBorderWidthValue] = useState<string | number>(area.borderWidth === undefined ? 1 : area.borderWidth);
  
  const [isBold, setIsBold] = useState(area.textIsBold || false);
  const [isItalic, setIsItalic] = useState(area.textIsItalic || false);
  const [isStrikethrough, setIsStrikethrough] = useState(area.textIsStrikethrough || false);
  const [strikethroughWidth, setStrikethroughWidth] = useState<string | number>(area.textStrikethroughWidth === undefined ? 1 : area.textStrikethroughWidth);
  const [isHighlighted, setIsHighlighted] = useState(area.textIsHighlighted || false);
  const [hexHighlightColor, setHexHighlightColor] = useState(() =>
    isValidHex(area.textHighlightColor || '') ? area.textHighlightColor! : '#ffff00'
  );
  const [highlightOpacity, setHighlightOpacity] = useState<string | number>(area.textHighlightOpacity === undefined ? 0.5 : area.textHighlightOpacity);


  useEffect(() => {
    setTitle(area.title);
    setHexBgColor(isValidHex(area.color) ? area.color : '#2563eb');
    setOpacity(area.opacity);
    setTextScaleFactor(area.textScaleFactor || 1);
    setHexTextColor(isValidHex(area.textColor || '') ? area.textColor! : '#FFFFFF');
    setTextOpacityValue(area.textOpacity === undefined ? 1.0 : area.textOpacity);
    
    setHexBorderColor(isValidHex(area.borderColor || '') ? area.borderColor! : '#888888');
    setBorderOpacityValue(area.borderOpacity === undefined ? 1.0 : area.borderOpacity);
    setBorderStyleValue(area.borderStyle || 'solid');
    setBorderWidthValue(area.borderWidth === undefined ? 1 : area.borderWidth);

    setIsBold(area.textIsBold || false);
    setIsItalic(area.textIsItalic || false);
    setIsStrikethrough(area.textIsStrikethrough || false);
    setStrikethroughWidth(area.textStrikethroughWidth === undefined ? 1 : area.textStrikethroughWidth);
    setIsHighlighted(area.textIsHighlighted || false);
    setHexHighlightColor(isValidHex(area.textHighlightColor || '') ? area.textHighlightColor! : '#ffff00');
    setHighlightOpacity(area.textHighlightOpacity === undefined ? 0.5 : area.textHighlightOpacity);
  }, [area]);

  const handleUpdate = useCallback((field: keyof Omit<DefinedArea, 'id' | 'x' | 'y' | 'width' | 'height'>, value: any) => {
    updateDefinedArea(area.id, { [field]: value });
  }, [area.id, updateDefinedArea]);
  
  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const checkboxLabelClass = `ml-2 text-sm ${inspectorTheme.labelText}`;
  const checkboxClass = `h-4 w-4 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700`;

  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  // Background Color Handlers
  const handleBgColorHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexBgColor(newHex);
    if (isValidHex(newHex)) {
        handleUpdate('color', newHex);
    }
  };
  const handleBgColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexBgColor(newHex);
    handleUpdate('color', newHex);
  };

  // Text Color Handlers
  const handleTextColorHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexTextColor(newHex);
    if (isValidHex(newHex)) {
        handleUpdate('textColor', newHex);
    }
  };
  const handleTextColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexTextColor(newHex);
    handleUpdate('textColor', newHex);
  };

  // Border Color Handlers
  const handleBorderColorHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexBorderColor(newHex);
    if (isValidHex(newHex)) {
      handleUpdate('borderColor', newHex);
    }
  };
  const handleBorderColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexBorderColor(newHex);
    handleUpdate('borderColor', newHex);
  };

  // Highlight Color Handlers
  const handleHighlightColorHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexHighlightColor(newHex);
    if (isValidHex(newHex)) {
      handleUpdate('textHighlightColor', newHex);
    }
  };
  const handleHighlightColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexHighlightColor(newHex);
    handleUpdate('textHighlightColor', newHex);
  };

  const handleNumberInputBlur = (
    field: keyof Omit<DefinedArea, 'id' | 'x' | 'y' | 'width' | 'height' | 'title' | 'color' | 'textColor' | 'borderColor' | 'borderStyle' | 'textHighlightColor' | 'zIndex'>,
    value: string | number,
    isFloat: boolean,
    min?: number,
    max?: number
  ) => {
    let numericValue = isFloat ? parseFloat(value as string) : parseInt(value as string, 10);
    if (isNaN(numericValue)) {
      // Revert to original value if input is not a valid number
      if (field === 'opacity') setOpacity(area.opacity);
      else if (field === 'textScaleFactor') setTextScaleFactor(area.textScaleFactor || 1);
      else if (field === 'textOpacity') setTextOpacityValue(area.textOpacity === undefined ? 1.0 : area.textOpacity);
      else if (field === 'borderOpacity') setBorderOpacityValue(area.borderOpacity === undefined ? 1.0 : area.borderOpacity);
      else if (field === 'borderWidth') setBorderWidthValue(area.borderWidth === undefined ? 1 : area.borderWidth);
      else if (field === 'textStrikethroughWidth') setStrikethroughWidth(area.textStrikethroughWidth === undefined ? 1 : area.textStrikethroughWidth);
      else if (field === 'textHighlightOpacity') setHighlightOpacity(area.textHighlightOpacity === undefined ? 0.5 : area.textHighlightOpacity);
      return;
    }
    if (min !== undefined) numericValue = Math.max(min, numericValue);
    if (max !== undefined) numericValue = Math.min(max, numericValue);
    
    if (field === 'opacity') setOpacity(numericValue);
    else if (field === 'textScaleFactor') setTextScaleFactor(numericValue);
    else if (field === 'textOpacity') setTextOpacityValue(numericValue);
    else if (field === 'borderOpacity') setBorderOpacityValue(numericValue);
    else if (field === 'borderWidth') setBorderWidthValue(numericValue);
    else if (field === 'textStrikethroughWidth') setStrikethroughWidth(numericValue);
    else if (field === 'textHighlightOpacity') setHighlightOpacity(numericValue);
    
    handleUpdate(field, numericValue);
  };


  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass} htmlFor={`area-title-${area.id}`}>区域名称</label>
        <input
          id={`area-title-${area.id}`}
          type="text"
          className={inputBaseClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => handleUpdate('title', title)}
          onMouseDown={stopPropagationMouseDown}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor={`area-bgcolor-picker-${area.id}`}>背景颜色 (Hex)</label>
        <div className="flex items-center space-x-2">
          <input
            id={`area-bgcolor-picker-${area.id}`}
            type="color"
            className={`h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`}
            value={hexBgColor} 
            onChange={handleBgColorPickerChange}
            onMouseDown={stopPropagationMouseDown}
            title="选择背景颜色"
          />
          <input
            id={`area-bgcolor-hex-${area.id}`}
            type="text"
            className={`${inputBaseClass} flex-grow`}
            value={hexBgColor}
            onChange={handleBgColorHexInputChange}
            onBlur={() => { 
                if (isValidHex(hexBgColor)) {
                    handleUpdate('color', hexBgColor);
                } else {
                    setHexBgColor(area.color); 
                }
            }}
            onMouseDown={stopPropagationMouseDown}
            placeholder="#RRGGBB"
            maxLength={7}
          />
        </div>
      </div>
      
      <div>
        <label className={labelClass} htmlFor={`area-opacity-${area.id}`}>背景透明度 (0.0 - 1.0)</label>
        <input
          id={`area-opacity-${area.id}`}
          type="number"
          step="0.05"
          min="0"
          max="1"
          className={inputBaseClass}
          value={opacity}
          onChange={(e) => setOpacity(e.target.value)}
          onBlur={(e) => handleNumberInputBlur('opacity', e.target.value, true, 0, 1)}
          onMouseDown={stopPropagationMouseDown}
        />
      </div>
      
      <hr className={`border-t ${vscodeDarkTheme.contextMenu.separator} my-2`} />
      <p className={`${labelClass} font-semibold`}>标题文字样式</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex items-center">
          <input
            id={`area-text-bold-${area.id}`}
            type="checkbox"
            className={checkboxClass}
            checked={isBold}
            onChange={(e) => {
              setIsBold(e.target.checked);
              handleUpdate('textIsBold', e.target.checked);
            }}
            onMouseDown={stopPropagationMouseDown}
          />
          <label htmlFor={`area-text-bold-${area.id}`} className={checkboxLabelClass}>加粗</label>
        </div>
        <div className="flex items-center">
          <input
            id={`area-text-italic-${area.id}`}
            type="checkbox"
            className={checkboxClass}
            checked={isItalic}
            onChange={(e) => {
              setIsItalic(e.target.checked);
              handleUpdate('textIsItalic', e.target.checked);
            }}
            onMouseDown={stopPropagationMouseDown}
          />
          <label htmlFor={`area-text-italic-${area.id}`} className={checkboxLabelClass}>斜体</label>
        </div>
        <div className="flex items-center">
          <input
            id={`area-text-strikethrough-${area.id}`}
            type="checkbox"
            className={checkboxClass}
            checked={isStrikethrough}
            onChange={(e) => {
              setIsStrikethrough(e.target.checked);
              handleUpdate('textIsStrikethrough', e.target.checked);
            }}
            onMouseDown={stopPropagationMouseDown}
          />
          <label htmlFor={`area-text-strikethrough-${area.id}`} className={checkboxLabelClass}>删除线</label>
        </div>
        <div className="flex items-center">
          <input
            id={`area-text-highlight-${area.id}`}
            type="checkbox"
            className={checkboxClass}
            checked={isHighlighted}
            onChange={(e) => {
              setIsHighlighted(e.target.checked);
              handleUpdate('textIsHighlighted', e.target.checked);
            }}
            onMouseDown={stopPropagationMouseDown}
          />
          <label htmlFor={`area-text-highlight-${area.id}`} className={checkboxLabelClass}>荧光笔</label>
        </div>
      </div>

      {isStrikethrough && (
        <div>
          <label className={labelClass} htmlFor={`area-strikethrough-width-${area.id}`}>删除线宽度 (px)</label>
          <input
            id={`area-strikethrough-width-${area.id}`}
            type="number"
            step="1"
            min="1"
            max="10"
            className={inputBaseClass}
            value={strikethroughWidth}
            onChange={(e) => setStrikethroughWidth(e.target.value)}
            onBlur={(e) => handleNumberInputBlur('textStrikethroughWidth', e.target.value, false, 1, 10)}
            onMouseDown={stopPropagationMouseDown}
          />
        </div>
      )}

      {isHighlighted && (
        <>
          <div>
            <label className={labelClass} htmlFor={`area-highlightcolor-picker-${area.id}`}>荧光笔颜色 (Hex)</label>
            <div className="flex items-center space-x-2">
              <input
                id={`area-highlightcolor-picker-${area.id}`}
                type="color"
                className={`h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`}
                value={hexHighlightColor}
                onChange={handleHighlightColorPickerChange}
                onMouseDown={stopPropagationMouseDown}
                title="选择荧光笔颜色"
              />
              <input
                id={`area-highlightcolor-hex-${area.id}`}
                type="text"
                className={`${inputBaseClass} flex-grow`}
                value={hexHighlightColor}
                onChange={handleHighlightColorHexInputChange}
                onBlur={() => {
                  if (isValidHex(hexHighlightColor)) {
                    handleUpdate('textHighlightColor', hexHighlightColor);
                  } else {
                    setHexHighlightColor(area.textHighlightColor || '#ffff00');
                  }
                }}
                onMouseDown={stopPropagationMouseDown}
                placeholder="#RRGGBB"
                maxLength={7}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor={`area-highlight-opacity-${area.id}`}>荧光笔透明度 (0.0 - 1.0)</label>
            <input
              id={`area-highlight-opacity-${area.id}`}
              type="number"
              step="0.05"
              min="0"
              max="1"
              className={inputBaseClass}
              value={highlightOpacity}
              onChange={(e) => setHighlightOpacity(e.target.value)}
              onBlur={(e) => handleNumberInputBlur('textHighlightOpacity', e.target.value, true, 0, 1)}
              onMouseDown={stopPropagationMouseDown}
            />
          </div>
        </>
      )}


      <div>
        <label className={labelClass} htmlFor={`area-textcolor-picker-${area.id}`}>标题文字颜色 (Hex)</label>
        <div className="flex items-center space-x-2">
          <input
            id={`area-textcolor-picker-${area.id}`}
            type="color"
            className={`h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`}
            value={hexTextColor}
            onChange={handleTextColorPickerChange}
            onMouseDown={stopPropagationMouseDown}
            title="选择标题文字颜色"
          />
          <input
            id={`area-textcolor-hex-${area.id}`}
            type="text"
            className={`${inputBaseClass} flex-grow`}
            value={hexTextColor}
            onChange={handleTextColorHexInputChange}
            onBlur={() => {
                if (isValidHex(hexTextColor)) {
                    handleUpdate('textColor', hexTextColor);
                } else {
                    setHexTextColor(area.textColor || '#FFFFFF');
                }
            }}
            onMouseDown={stopPropagationMouseDown}
            placeholder="#RRGGBB"
            maxLength={7}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`area-textopacity-${area.id}`}>标题文字透明度 (0.0 - 1.0)</label>
        <input
          id={`area-textopacity-${area.id}`}
          type="number"
          step="0.05"
          min="0"
          max="1"
          className={inputBaseClass}
          value={textOpacityValue}
          onChange={(e) => setTextOpacityValue(e.target.value)}
          onBlur={(e) => handleNumberInputBlur('textOpacity', e.target.value, true, 0, 1)}
          onMouseDown={stopPropagationMouseDown}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor={`area-textscale-${area.id}`}>文字缩放比例</label>
        <input
          id={`area-textscale-${area.id}`}
          type="number"
          step="0.1"
          min="0.1"
          max="5"
          className={inputBaseClass}
          value={textScaleFactor}
          onChange={(e) => setTextScaleFactor(e.target.value)}
          onBlur={(e) => handleNumberInputBlur('textScaleFactor', e.target.value, true, 0.1, 5)}
          onMouseDown={stopPropagationMouseDown}
        />
      </div>

      <hr className={`border-t ${vscodeDarkTheme.contextMenu.separator} my-2`} />
      <p className={`${labelClass} font-semibold`}>边框样式</p>

      <div>
        <label className={labelClass} htmlFor={`area-bordercolor-picker-${area.id}`}>边框颜色 (Hex)</label>
        <div className="flex items-center space-x-2">
          <input
            id={`area-bordercolor-picker-${area.id}`}
            type="color"
            className={`h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`}
            value={hexBorderColor}
            onChange={handleBorderColorPickerChange}
            onMouseDown={stopPropagationMouseDown}
            title="选择边框颜色"
          />
          <input
            id={`area-bordercolor-hex-${area.id}`}
            type="text"
            className={`${inputBaseClass} flex-grow`}
            value={hexBorderColor}
            onChange={handleBorderColorHexInputChange}
            onBlur={() => {
              if (isValidHex(hexBorderColor)) {
                handleUpdate('borderColor', hexBorderColor);
              } else {
                setHexBorderColor(area.borderColor || '#888888');
              }
            }}
            onMouseDown={stopPropagationMouseDown}
            placeholder="#RRGGBB"
            maxLength={7}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`area-borderopacity-${area.id}`}>边框透明度 (0.0 - 1.0)</label>
        <input
          id={`area-borderopacity-${area.id}`}
          type="number"
          step="0.05"
          min="0"
          max="1"
          className={inputBaseClass}
          value={borderOpacityValue}
          onChange={(e) => setBorderOpacityValue(e.target.value)}
          onBlur={(e) => handleNumberInputBlur('borderOpacity', e.target.value, true, 0, 1)}
          onMouseDown={stopPropagationMouseDown}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor={`area-borderwidth-${area.id}`}>边框宽度 (px)</label>
        <input
          id={`area-borderwidth-${area.id}`}
          type="number"
          step="1"
          min="0"
          max="20"
          className={inputBaseClass}
          value={borderWidthValue}
          onChange={(e) => setBorderWidthValue(e.target.value)}
          onBlur={(e) => handleNumberInputBlur('borderWidth', e.target.value, false, 0, 20)}
          onMouseDown={stopPropagationMouseDown}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor={`area-borderstyle-${area.id}`}>边框样式</label>
        <select
          id={`area-borderstyle-${area.id}`}
          className={inputBaseClass}
          value={borderStyleValue}
          onChange={(e) => {
            const newStyle = e.target.value as 'solid' | 'dashed' | 'dotted' | 'dash-dot';
            setBorderStyleValue(newStyle);
            handleUpdate('borderStyle', newStyle);
          }}
          onMouseDown={stopPropagationMouseDown}
        >
          <option value="solid">实线 (Solid)</option>
          <option value="dashed">短划线 (Dashed)</option>
          <option value="dotted">点状线 (Dotted)</option>
          <option value="dash-dot">点划线 (Dash-dot)</option>
        </select>
      </div>
      
      <hr className={`border-t ${vscodeDarkTheme.contextMenu.separator} my-3`} />

      <div>
        <label className={labelClass}>ID</label>
        <p className={`text-sm ${inspectorTheme.valueText} break-all`}>{area.id}</p>
      </div>
      <div>
        <label className={labelClass}>位置 (X, Y)</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>X: {area.x.toFixed(0)}, Y: {area.y.toFixed(0)}</p>
      </div>
      <div>
        <label className={labelClass}>尺寸 (宽, 高)</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>宽: {area.width.toFixed(0)}, 高: {area.height.toFixed(0)}</p>
      </div>
      <div>
        <label className={labelClass}>堆叠顺序 (Z-Index)</label>
        <input
            id={`area-zindex-${area.id}`}
            type="number"
            step="1"
            className={inputBaseClass}
            value={area.zIndex === undefined ? -1 : area.zIndex}
            onChange={(e) => handleUpdate('zIndex', parseInt(e.target.value, 10))}
            onBlur={(e) => handleUpdate('zIndex', parseInt(e.target.value, 10))}
            onMouseDown={stopPropagationMouseDown}
            />
      </div>
    </div>
  );
};
