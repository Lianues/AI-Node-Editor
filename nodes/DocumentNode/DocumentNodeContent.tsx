
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomContentRendererProps } from '../../types'; 
import { vscodeDarkTheme } from '../../theme/vscodeDark'; 

export const DocumentNodeContent: React.FC<CustomContentRendererProps> = ({ node, updateNodeData }) => {
  // 从 node.data.documentContent 初始化文本状态
  const [text, setText] = useState<string>(() => node.data?.documentContent || '');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // 当外部 node.data.documentContent 变化时（例如，通过执行器更新），同步到本地文本状态
  // 避免在用户输入时覆盖
  useEffect(() => {
    const externalValue = node.data?.documentContent || '';
    if (externalValue !== text && document.activeElement !== textAreaRef.current) {
      setText(externalValue);
    }
  }, [node.data?.documentContent]); // 依赖 node.data.documentContent

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value); 
  }, []);

  // 处理点击 textarea 外部时保存内容
  const handleDocumentMouseDown = useCallback((event: MouseEvent) => {
    if (textAreaRef.current && !textAreaRef.current.contains(event.target as Node)) {
      // 只有当文本实际改变时才调用 updateNodeData
      if (node.data?.documentContent !== text) {
        updateNodeData(node.id, { documentContent: text });
      }
      // 不需要在这里 blur，因为 mousedown 事件可能先于 blur
    }
  }, [node.id, node.data?.documentContent, text, updateNodeData]);


  // 当 textarea 获得焦点时，开始监听外部点击
  const handleFocus = useCallback(() => {
    document.addEventListener('mousedown', handleDocumentMouseDown, true);
  }, [handleDocumentMouseDown]);

  // 当 textarea 失去焦点时，保存内容并移除外部点击监听
  const handleBlur = useCallback(() => {
    if (node.data?.documentContent !== text) {
      updateNodeData(node.id, { documentContent: text });
    }
    document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  }, [node.id, node.data?.documentContent, text, updateNodeData, handleDocumentMouseDown]);
  
  // 组件卸载时清理事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [handleDocumentMouseDown]);


  // 阻止在 textarea 上 mousedown 时触发节点拖拽
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
    outline: '1px solid transparent', 
  };
  
  return (
    <textarea
      ref={textAreaRef}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur} 
      onMouseDown={handleTextAreaMouseDown} 
      style={textAreaStyle}
      aria-label="全局变量内容文本区域"
      placeholder="输入变量内容..."
    />
  );
};
