
import React from 'react';
import { DefinedAreaRendererProps, DefinedArea } from '../types/areaDefinitionTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

// Helper function to convert hex to rgba
function hexToRgba(hex: string, opacity: number): string {
  if (!isValidHex(hex)) {
    return hex; // Could be a Tailwind class or invalid
  }
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { // #RGB
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) { // #RRGGBB
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r},${g},${b},${opacity})`;
}

// Helper function to check if a string is a valid hex color
function isValidHex(color: string): boolean {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
}


export const DefinedAreaRenderer: React.FC<DefinedAreaRendererProps & {
  onContextMenu?: (event: React.MouseEvent, area: DefinedArea) => void;
}> = ({ area, onContextMenu, isSelected }) => {

  const isBgHexColor = isValidHex(area.color);
  const isBorderHexColor = isValidHex(area.borderColor || '');

  const areaStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${area.x}px`,
    top: `${area.y}px`,
    width: `${area.width}px`,
    height: `${area.height}px`,
    backgroundColor: isBgHexColor ? hexToRgba(area.color, area.opacity) : area.color,
    opacity: isBgHexColor ? 1 : area.opacity, 
    zIndex: area.zIndex !== undefined ? area.zIndex : -1,
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    borderWidth: `${area.borderWidth || 1}px`,
    borderStyle: area.borderStyle || 'solid',
    borderColor: isBorderHexColor 
                   ? hexToRgba(area.borderColor!, area.borderOpacity !== undefined ? area.borderOpacity : 1)
                   : (area.borderColor || 'transparent'), 
  };
  
  if (area.borderStyle === 'dash-dot') {
    areaStyle.borderStyle = 'dashed'; // Fallback for dash-dot
  }


  const baseFontSize = Math.max(10, Math.min(area.width, area.height) / 10);
  const finalFontSize = baseFontSize * (area.textScaleFactor || 1);

  let titleColorToApply = area.textColor || vscodeDarkTheme.app.textPrimary;
  if (typeof area.textOpacity === 'number' && area.textOpacity < 1.0 && isValidHex(area.textColor || '')) {
    titleColorToApply = hexToRgba(area.textColor!, area.textOpacity);
  } else if (typeof area.textOpacity === 'number' && area.textOpacity < 1.0 && !isValidHex(area.textColor || '')) {
    titleColorToApply = vscodeDarkTheme.app.textPrimary;
  }

  const titleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: titleColorToApply,
    fontSize: `${finalFontSize}px`,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '90%',
    maxHeight: '90%',
    userSelect: 'none',
    padding: '2px 4px', 
    borderRadius: '3px',
    pointerEvents: 'none', // Title itself should not capture mouse events that could block area dragging for pan
  };

  // Apply text styles
  if (area.textIsBold) {
    titleStyle.fontWeight = 'bold';
  }
  if (area.textIsItalic) {
    titleStyle.fontStyle = 'italic';
  }

  // Strikethrough styling
  if (area.textIsStrikethrough) {
    titleStyle.textDecorationLine = 'line-through';
    if (area.textStrikethroughWidth !== undefined && area.textStrikethroughWidth > 0) {
      titleStyle.textDecorationThickness = `${area.textStrikethroughWidth}px`;
    }
  } else {
    // Ensure any previous strikethrough is removed
    if (typeof titleStyle.textDecorationLine === 'string' && titleStyle.textDecorationLine.includes('line-through')) {
      titleStyle.textDecorationLine = titleStyle.textDecorationLine.replace('line-through', '').trim();
      if (titleStyle.textDecorationLine === '') {
        delete titleStyle.textDecorationLine;
      }
    }
    // For older CSS property 'textDecoration'
    if (typeof titleStyle.textDecoration === 'string' && titleStyle.textDecoration.includes('line-through')) {
      titleStyle.textDecoration = titleStyle.textDecoration.replace('line-through', '').trim();
      if (titleStyle.textDecoration === '') {
        delete titleStyle.textDecoration;
      }
    }
  }


  // Highlight styling
  if (area.textIsHighlighted && area.textHighlightColor && isValidHex(area.textHighlightColor)) {
    const highlightOpacity = area.textHighlightOpacity !== undefined ? area.textHighlightOpacity : 0.5;
    titleStyle.backgroundColor = hexToRgba(area.textHighlightColor, highlightOpacity);
  }


  let areaClasses = `absolute rounded-md transition-all duration-100 ease-in-out`;
  if (isSelected) {
    areaClasses += ` ring-2 ring-sky-400 ring-opacity-75 ring-offset-1 ring-offset-zinc-900`;
  }


  const handleContextMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onContextMenu) {
      onContextMenu(event, area);
    }
  };

  return (
    <div
      data-defined-area-id={area.id} // Added data attribute for identification
      className={areaClasses.trim()}
      style={areaStyle}
      data-testid={`defined-area-${area.id}`}
      onContextMenu={handleContextMenu}
    >
      {area.title && <div style={titleStyle} data-area-title-for={area.id}>{area.title}</div>}
    </div>
  );
};
