
import React from 'react';
import { CustomContentRendererProps } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark'; 

export const CustomUiNodeContent: React.FC<CustomContentRendererProps> = ({ node, updateNodeData, onOpenCustomUiPreview }) => {
  const customHtml = node.data?.customHtml || '<p>无自定义内容。</p>';
  // uiHeight from node.data now refers to the content height inside the full-screen modal
  const modalContentHeight = node.data?.uiHeight || 300; 

  const buttonTheme = vscodeDarkTheme.topBar;

  const handleOpenPreview = () => {
    if (onOpenCustomUiPreview) {
      const currentInputs = node.data?.lastReceivedInputs as Record<string, any> | undefined;
      onOpenCustomUiPreview(customHtml, modalContentHeight, node.id, currentInputs); // Pass node.id before currentInputs
    } else {
      console.warn("onOpenCustomUiPreview callback is not provided to CustomUiNodeContent.");
      // Fallback alert or log if the prop isn't passed, for debugging
      alert("预览功能未正确配置。");
    }
  };
  
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div 
      className="flex items-center justify-center w-full h-full p-2 box-border"
      onMouseDown={stopPropagation} // Prevent node drag when interacting with button area
      onClick={stopPropagation}     // Prevent node selection when clicking button area
    >
      <button
        onClick={handleOpenPreview}
        className={`w-full h-full text-sm px-3 py-1.5 rounded-md transition-colors 
                    ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} 
                    ${buttonTheme.buttonDefaultText} focus:outline-none focus:ring-2 
                    focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500`}
        aria-label="查看自定义界面"
      >
        查看界面
      </button>
    </div>
  );
};
