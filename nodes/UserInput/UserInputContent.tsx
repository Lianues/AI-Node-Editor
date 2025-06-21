import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomContentRendererProps } from '../../types'; 
import { vscodeDarkTheme } from '../../theme/vscodeDark'; 

export const UserInputContent: React.FC<CustomContentRendererProps> = ({ node, updateNodeData }) => {
  const [text, setText] = useState<string>(() => node.data?.userInput || '');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to synchronize from external changes to node.data.userInput
  useEffect(() => {
    const externalValue = node.data?.userInput || '';
    if (externalValue !== text && document.activeElement !== textAreaRef.current) {
      setText(externalValue);
    }
  }, [node.data?.userInput]); // Re-eval if external data changes. Check activeElement to avoid overwriting during typing.

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value); 
  }, []);

  const handleDocumentMouseDown = useCallback((event: MouseEvent) => {
    if (textAreaRef.current && !textAreaRef.current.contains(event.target as Node)) {
      // Clicked outside the textarea, so blur it.
      // The onBlur handler will then take care of saving.
      textAreaRef.current.blur();
    }
  }, []); // textAreaRef is stable

  const handleFocus = useCallback(() => {
    // When the textarea is focused, listen for mousedowns on the document.
    document.addEventListener('mousedown', handleDocumentMouseDown, true); // Use capture to catch early
  }, [handleDocumentMouseDown]);

  const handleBlur = useCallback(() => {
    // Persist local changes to the global state.
    if (node.data?.userInput !== text) {
      updateNodeData(node.id, { userInput: text });
    }
    // Clean up the document mousedown listener.
    document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  }, [node.id, node.data?.userInput, text, updateNodeData, handleDocumentMouseDown]);

  // Cleanup effect for when the component unmounts.
  useEffect(() => {
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [handleDocumentMouseDown]);

  const handleTextAreaMouseDown = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.stopPropagation(); 
  }, []);

  const textAreaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%', 
    padding: '4px', 
    backgroundColor: '#1e293b', // slate-800
    color: vscodeDarkTheme.app.textPrimary,
    border: `1px solid ${vscodeDarkTheme.topBar.border}`, // zinc-700
    borderRadius: '3px',
    boxSizing: 'border-box', 
    resize: 'none', 
    fontFamily: 'inherit', 
    fontSize: '0.875rem', // text-sm
    outline: '1px solid transparent', // Removes default browser focus outline or makes it non-obtrusive.
  };
  
  return (
    <textarea
      ref={textAreaRef}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur} 
      onMouseDown={handleTextAreaMouseDown} // Prevents node drag when clicking/focusing textarea
      style={textAreaStyle}
      aria-label="User input text area"
      placeholder="输入文本..."
    />
  );
};