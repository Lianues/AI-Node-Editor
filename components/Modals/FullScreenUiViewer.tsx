
import React, { useEffect, useRef, useMemo } from 'react';
import { XMarkIcon } from '../icons/XMarkIcon'; // Assuming you have an XMarkIcon
import { vscodeDarkTheme } from '../../theme/vscodeDark';

interface FullScreenUiViewerProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  nodeId: string; // Added nodeId prop
  contentHeight: number; // Height for the inner content div
  inputData?: Record<string, any>; // New prop for input data
}

const processHtmlWithData = (htmlTemplate: string, nodeId: string, data?: Record<string, any>): string => {
  let processedHtml = htmlTemplate;

  // Replace {{node_id}} first
  processedHtml = processedHtml.replace(/\{\{\s*node_id\s*\}\}/g, nodeId);

  // Then process data placeholders
  if (!data) {
    // Replace any remaining data placeholders if no data is provided
    return processedHtml.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, p1) => `[${p1} - 无数据]`);
  }
  
  // Replace placeholders for which data is available
  for (const portId in data) {
    if (Object.prototype.hasOwnProperty.call(data, portId)) {
      const value = data[portId];
      let displayValue: string;

      if (value === undefined) {
        displayValue = `[${portId} - 无数据]`; 
      } else if (value === null) {
        displayValue = 'null';
      } else if (typeof value === 'string') {
        displayValue = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        displayValue = String(value);
      } else {
        try {
          // For objects/arrays, display pretty-printed JSON inside a <pre> tag for better readability
          displayValue = `<pre style="margin:0; padding:0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(value, null, 2)}</pre>`;
        } catch (e) {
          displayValue = `[序列化 ${portId} 出错]`;
        }
      }
      const placeholderRegex = new RegExp(`\\{\\{\\s*${portId}\\s*\\}\\}`, 'g');
      processedHtml = processedHtml.replace(placeholderRegex, displayValue);
    }
  }
  // Replace any remaining data placeholders that didn't have corresponding data
  processedHtml = processedHtml.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, p1) => `[${p1} - 无数据]`);
  return processedHtml;
};


export const FullScreenUiViewer: React.FC<FullScreenUiViewerProps> = ({
  isOpen,
  onClose,
  htmlContent,
  nodeId, 
  contentHeight,
  inputData, 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); 
  const theme = vscodeDarkTheme.contextMenu; 

  const processedHtmlString = useMemo(() => {
    return processHtmlWithData(htmlContent, nodeId, inputData);
  }, [htmlContent, nodeId, inputData]);


  useEffect(() => {
    if (isOpen && contentRef.current && processedHtmlString) {
      const container = contentRef.current;
      // Clear existing content first to remove old DOM and scripts
      container.innerHTML = '';

      // Use DOMParser to handle the HTML string and script extraction
      const parser = new DOMParser();
      const doc = parser.parseFromString(processedHtmlString, 'text/html');
      
      const scriptsFromDoc = Array.from(doc.getElementsByTagName('script'));
      
      // Set the HTML content (everything from body, scripts will be handled separately)
      // This ensures that the DOM elements are in place before scripts that might target them are run.
      // We iterate through all child nodes of the parsed body and append them.
      // This is safer than doc.body.innerHTML if the body itself has attributes we want to preserve (though unlikely here).
      while (doc.body.firstChild) {
        container.appendChild(doc.body.firstChild);
      }
      
      // Remove script tags that were just appended via innerHTML of doc.body
      // because they won't execute. We need to create new script elements.
      Array.from(container.getElementsByTagName('script')).forEach(s => s.remove());

      // Now, create and append new script elements for each script found in the original HTML string.
      // This causes them to be executed by the browser.
      scriptsFromDoc.forEach(scriptEl => {
        if (scriptEl.textContent) { // Only execute inline scripts
          const scriptTag = document.createElement('script');
          // The scriptEl.textContent already has {{node_id}} and other placeholders replaced
          // because it was parsed from processedHtmlString.
          scriptTag.textContent = scriptEl.textContent;
          scriptTag.setAttribute('data-dynamic-ui-script', 'true'); // Mark for potential cleanup
          
          // Appending to the live container causes execution
          // It's important that the container's HTML is set *before* these scripts run,
          // so they can find elements by ID.
          container.appendChild(scriptTag);
        }
      });
    }
    // Cleanup function for the useEffect
    return () => {
      if (contentRef.current) {
        // Clear dynamically added scripts when the component/modal closes or dependencies change before re-execution
        const oldDynamicScripts = contentRef.current.querySelectorAll('script[data-dynamic-ui-script="true"]');
        oldDynamicScripts.forEach(s => s.remove());
      }
    };
  }, [isOpen, processedHtmlString]); // Effect re-runs if isOpen or processedHtmlString changes


  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  

  if (!isOpen) {
    return null;
  }

  const contentStyle: React.CSSProperties = {
    height: `${contentHeight}px`,
    width: '100%', 
    overflow: 'auto', // Ensure content within the styled div is scrollable
    backgroundColor: '#0f172a', // A default dark background for the content box
    border: `1px solid ${vscodeDarkTheme.nodes.common.borderUnselected}`, // Consistent border
    borderRadius: '4px',
    boxSizing: 'border-box',
    // The customHtml itself should define padding if needed, or we add it here.
    // Adding default padding to the container so user HTML doesn't have to.
    padding: '0px', // Set to 0px if customHtml is expected to handle all internal layout
  };

  return (
    <div
      ref={modalRef} 
      className="fixed inset-0 bg-zinc-900 bg-opacity-95 flex flex-col items-center justify-center z-[200] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-ui-viewer-title"
      onMouseDown={onClose} // Click on backdrop closes
    >
      <div 
        className="w-full max-w-5xl flex flex-col items-center relative bg-zinc-800 p-4 rounded-lg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()} // Prevent backdrop click when clicking on modal content itself
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-zinc-800 focus:ring-sky-500`}
            aria-label="关闭全屏预览"
          >
            <XMarkIcon className={`w-5 h-5 ${theme.itemText}`} />
          </button>
        </div>
        
        <h2 id="fullscreen-ui-viewer-title" className="text-xl font-semibold text-slate-200 mb-3 self-start">
          自定义界面预览
        </h2>
        <div 
          ref={contentRef} 
          style={contentStyle}
          // HTML is set by useEffect to allow script execution
        />
        <p className="text-sm text-zinc-400 mt-2 self-center">按 Esc 键关闭。</p>
      </div>
    </div>
  );
};

export default FullScreenUiViewer;
