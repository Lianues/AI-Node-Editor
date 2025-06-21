import React from 'react';
import { CustomContentRendererProps } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';

export const DataViewerContent: React.FC<CustomContentRendererProps> = ({ node }) => {
  const displayedValue = node.data?.displayedValue;

  let contentToDisplay: React.ReactNode;

  if (displayedValue === undefined) {
    contentToDisplay = <span className="italic">undefined</span>;
  } else if (displayedValue === null) {
    contentToDisplay = <span className="italic">null</span>;
  } else if (typeof displayedValue === 'string') {
    contentToDisplay = displayedValue;
  } else if (typeof displayedValue === 'number' || typeof displayedValue === 'boolean') {
    contentToDisplay = String(displayedValue);
  } else if (typeof displayedValue === 'object') {
    try {
      contentToDisplay = JSON.stringify(displayedValue, null, 2);
    } catch (e) {
      contentToDisplay = "[Error stringifying object]";
    }
  } else {
    contentToDisplay = String(displayedValue);
  }
  
  const preStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    margin: 0,
    padding: '4px',
    backgroundColor: '#1e293b', // slate-800 from UserInputContent
    color: vscodeDarkTheme.app.textPrimary,
    border: `1px solid ${vscodeDarkTheme.topBar.border}`, // zinc-700
    borderRadius: '3px',
    boxSizing: 'border-box',
    overflow: 'auto', // Add scroll for large content
    whiteSpace: 'pre-wrap', // Allow wrapping for long strings
    wordBreak: 'break-all', // Break words to prevent overflow
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace', // Monospace font
    fontSize: '0.8rem', // Slightly smaller for dense info
  };

  return (
    <pre style={preStyle} aria-label="Displayed data content">
      {contentToDisplay}
    </pre>
  );
};