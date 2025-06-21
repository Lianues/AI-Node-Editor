
import React from 'react';
import { DefiningAreaRectangleProps } from '../types/areaDefinitionTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark'; // For potential theme colors

export const DefiningAreaRectangle: React.FC<DefiningAreaRectangleProps> = ({ rect }) => {
  if (!rect) {
    return null;
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: `1px dashed ${vscodeDarkTheme.connections.selectedColor || '#7dd3fc'}`, // Use a theme color, e.g., selected connection color
    backgroundColor: 'rgba(125, 211, 252, 0.1)', // Sky-300 with 10% opacity for a subtle fill
    pointerEvents: 'none', 
    zIndex: 100, 
  };

  return <div style={style} aria-hidden="true" data-testid="defining-area-rectangle"/>;
};
