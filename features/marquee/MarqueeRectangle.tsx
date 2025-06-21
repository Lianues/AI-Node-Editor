
import React from 'react';

interface MarqueeRectangleProps {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export const MarqueeRectangle: React.FC<MarqueeRectangleProps> = ({ rect }) => {
  if (!rect) {
    return null;
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: '1px dashed #7dd3fc', // sky-300
    backgroundColor: 'rgba(125, 211, 252, 0.2)', // sky-300 with 20% opacity
    pointerEvents: 'none', // Important: so it doesn't interfere with other mouse events
    zIndex: 100, // Ensure it's above canvas content but below modals etc.
  };

  return <div style={style} aria-hidden="true" />;
};
