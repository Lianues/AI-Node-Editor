import React from 'react';
import { CustomContentRendererProps } from '../../types'; // Assuming types.ts is in a path accessible like this
import { vscodeDarkTheme } from '../../theme/vscodeDark'; // Assuming theme is accessible like this

export const JsonViewerContent: React.FC<CustomContentRendererProps> = ({ node }) => {
  const jsonString = node.data?.displayedValue; // Expecting a JSON string here

  let contentToDisplay: string;

  if (jsonString === undefined || jsonString === null || typeof jsonString !== 'string' || jsonString.trim() === "") {
    contentToDisplay = "无数据或非JSON字符串";
  } else {
    try {
      // Attempt to parse and re-stringify for pretty printing, or show raw if not valid JSON
      const parsedJson = JSON.parse(jsonString);
      contentToDisplay = JSON.stringify(parsedJson, null, 2);
    } catch (e) {
      // If parsing fails, display the original string as is (it might be invalid JSON or just a plain string)
      contentToDisplay = jsonString;
    }
  }
  
  const preStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    margin: 0,
    padding: '4px',
    backgroundColor: '#1e293b', // slate-800
    color: vscodeDarkTheme.app.textPrimary,
    border: `1px solid ${vscodeDarkTheme.topBar.border}`, // zinc-700
    borderRadius: '3px',
    boxSizing: 'border-box',
    overflow: 'auto', 
    whiteSpace: 'pre-wrap', 
    wordBreak: 'break-all', 
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace', 
    fontSize: '0.8rem', 
  };

  return (
    <pre style={preStyle} aria-label="JSON content display">
      {contentToDisplay}
    </pre>
  );
};
