
import React, { useCallback } from 'react';
import { CustomContentRendererProps, PortDataType } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { OverlayScrollbar } from '../../components/shared/OverlayScrollbar';

export const DataDelayNodeContent: React.FC<CustomContentRendererProps> = ({ node, updateNodeData }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const inputBaseClass = `w-full px-2 py-1 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-xs`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-0.5 truncate`;
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  const portDelayTimes = node.data?.portDelayTimes || {};

  const handleDelayChange = useCallback((portId: string, value: string) => {
    if (!updateNodeData) return;
    const newDelay = parseInt(value, 10);
    const updatedDelayTimes = {
      ...portDelayTimes,
      [portId]: isNaN(newDelay) || newDelay < 0 ? 0 : newDelay, // Default to 0 if invalid
    };
    updateNodeData(node.id, { ...node.data, portDelayTimes: updatedDelayTimes });
  }, [node.id, node.data, portDelayTimes, updateNodeData]);
  
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const dataInputPorts = node.inputs.filter(p => p.dataType !== PortDataType.FLOW);

  return (
    <div 
      ref={scrollableRef}
      className="w-full h-full text-xs p-2 box-border overflow-y-auto hide-native-scrollbar relative"
      style={{ backgroundColor: '#1e293b' /* slate-800 */}}
      onMouseDown={stopPropagation} // Prevent node drag
      onClick={stopPropagation}     // Prevent node selection
      onWheel={(e) => { // Prevent canvas zoom when scrolling content
          const element = scrollableRef.current;
          if (element && element.scrollHeight > element.clientHeight) {
              e.stopPropagation();
          }
      }}
    >
      {dataInputPorts.length === 0 ? (
        <p className={`${inspectorTheme.infoText} text-center py-2`}>没有可配置延迟的数据输入端口。</p>
      ) : (
        <div className="space-y-2">
          {dataInputPorts.map(port => (
            <div key={port.id}>
              <label htmlFor={`delay-input-${node.id}-${port.id}`} className={labelClass} title={port.label}>
                {port.label}:
              </label>
              <input
                id={`delay-input-${node.id}-${port.id}`}
                type="number"
                min="0"
                step="100"
                className={inputBaseClass}
                value={portDelayTimes[port.id] !== undefined ? portDelayTimes[port.id] : 1000}
                onChange={(e) => handleDelayChange(port.id, e.target.value)}
                onBlur={(e) => { // Ensure value is committed on blur
                    const finalValue = parseInt(e.target.value, 10);
                    if (portDelayTimes[port.id] !== (isNaN(finalValue) || finalValue < 0 ? 0 : finalValue) ) {
                        handleDelayChange(port.id, e.target.value);
                    }
                }}
                placeholder="默认 1000ms"
              />
            </div>
          ))}
        </div>
      )}
      <OverlayScrollbar scrollableRef={scrollableRef} orientation="vertical" />
    </div>
  );
};
