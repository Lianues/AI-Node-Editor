
import React from 'react';
import { CustomContentRendererProps } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';

export const ConditionalNodeContent: React.FC<CustomContentRendererProps> = ({ node }) => {
  const conditionExpression = node.data?.conditionExpression || "true";
  const inspectorTheme = vscodeDarkTheme.propertyInspector;

  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    padding: '4px 8px',
    backgroundColor: '#334155', // slate-700 (node body color for consistency here)
    color: inspectorTheme.valueTextMuted, // Use a muted text color
    border: `1px solid ${vscodeDarkTheme.topBar.border}`, // zinc-700
    borderRadius: '3px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: '0.75rem', // text-xs
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div 
        style={contentStyle} 
        title={conditionExpression}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
    >
      <code className="truncate">{conditionExpression}</code>
    </div>
  );
};
