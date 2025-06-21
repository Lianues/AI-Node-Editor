
import React from 'react';
import { vscodeDarkTheme } from '../../../theme/vscodeDark'; // For selection color

interface ConnectionPathProps {
  pathD: string; // The SVG path 'd' attribute string
  color: string;
  strokeWidth: number;
  isSelected?: boolean;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void; // Added for right-click handling
  cursor?: string;
}

export const ConnectionPath: React.FC<ConnectionPathProps> = ({
  pathD,
  color,
  strokeWidth,
  isSelected = false,
  onClick,
  onContextMenu, // Destructure new prop
  cursor = 'default',
}) => {
  const handlePathClick = (event: React.MouseEvent) => {
    if (onClick) {
      event.stopPropagation(); // Prevent canvas background click
      onClick();
    }
  };

  const handlePathContextMenu = (event: React.MouseEvent) => {
    if (onContextMenu) {
      // Propagation and preventDefault will be handled by the caller in ConnectionRenderer
      onContextMenu(event);
    }
  };

  if (isSelected) {
    const borderStrokeWidth = strokeWidth + vscodeDarkTheme.connections.selectedStrokeWidthIncrease;
    const borderColor = vscodeDarkTheme.connections.selectedColor;

    return (
      <g>
        {/* Border Path (underneath) */}
        <path
          d={pathD}
          stroke={borderColor}
          strokeWidth={borderStrokeWidth}
          fill="none"
          style={{
            pointerEvents: 'stroke', // Make the stroke itself clickable
            cursor: cursor,
          }}
          onClick={handlePathClick}
          onContextMenu={handlePathContextMenu} // Added context menu handler
        />
        {/* Original Line Path (on top) */}
        <path
          d={pathD}
          stroke={color} // Original color
          strokeWidth={strokeWidth} // Original stroke width
          fill="none"
          style={{
            pointerEvents: 'none', // This path is visual only, interaction handled by border
          }}
        />
      </g>
    );
  }

  // Not selected: render a single path
  return (
    <path
      d={pathD}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      style={{
        pointerEvents: 'stroke',
        cursor: cursor,
      }}
      onClick={handlePathClick}
      onContextMenu={handlePathContextMenu} // Added context menu handler
    />
  );
};
