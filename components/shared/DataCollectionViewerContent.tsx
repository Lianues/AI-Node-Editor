
import React from 'react';
import { CustomContentRendererProps, PortDataType } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { OverlayScrollbar } from './OverlayScrollbar'; // Assuming OverlayScrollbar is in the same directory or adjust path

interface DataCollectionItem {
  portId: string;
  label: string;
  type: string; // PortDataType as string
  value: any;
}

export const getDataTypeBadgeStyles = (dataTypeString: string): { bgClass: string; textClass: string } => {
  const themePorts = vscodeDarkTheme.ports.dataTypeColors;
  const defaultLightText = 'text-slate-100';
  const defaultDarkText = 'text-zinc-900'; // zinc-900

  let resolvedDataTypeKey: PortDataType | undefined;
  for (const key in PortDataType) {
    if (PortDataType[key as keyof typeof PortDataType].toLowerCase() === dataTypeString.toLowerCase()) {
      resolvedDataTypeKey = PortDataType[key as keyof typeof PortDataType];
      break;
    }
  }
  if (!resolvedDataTypeKey) {
    resolvedDataTypeKey = PortDataType.UNKNOWN;
  }
  
  let bgClass = themePorts[resolvedDataTypeKey]?.output.bg || themePorts[PortDataType.UNKNOWN]?.output.bg || 'bg-gray-500';
  let textClass = defaultLightText;

  const typeColors = themePorts[resolvedDataTypeKey]?.output;
  if (typeColors) {
    bgClass = typeColors.bg;
    // Updated logic for text color based on background color patterns in vscodeDark.ts
    const darkTextDataTypes: PortDataType[] = [
        PortDataType.FLOW,         // bg-slate-300
        PortDataType.AI_CONFIG,    // bg-slate-400
        PortDataType.DATA_COLLECTION // bg-amber-500
    ];
     // Specific check for 'ANY' type if its color is light (e.g., purple-500 might be okay with light text)
    // For 'STRING' (emerald-500), 'UNKNOWN' (pink-500), light text is generally fine.
    // If a new PortDataType is added with a light background, it should be added to darkTextDataTypes.
    if (darkTextDataTypes.includes(resolvedDataTypeKey)) {
        textClass = defaultDarkText;
    } else {
        textClass = defaultLightText;
    }
  }
  return { bgClass, textClass };
};


const formatValueForDisplay = (value: any): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return '[无法序列化内容]';
  }
};

export const DataCollectionViewerContent: React.FC<CustomContentRendererProps> = ({ node }) => {
  const jsonString = node.data?.displayedValue;
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  let parsedData: DataCollectionItem[] = [];
  let parseError: string | null = null;

  if (typeof jsonString === 'string' && jsonString.trim() !== "") {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        parsedData = data;
      } else {
        parseError = "数据集合必须是一个JSON数组。";
      }
    } catch (e) {
      parseError = "解析JSON失败。内容可能不是有效的JSON字符串。";
    }
  } else {
    parseError = "无有效数据或数据集合为空。";
  }

  const itemStyle: React.CSSProperties = {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${vscodeDarkTheme.topBar.border}`, // zinc-700
  };
  const lastItemStyle: React.CSSProperties = {
    marginBottom: '0px',
    paddingBottom: '0px',
    borderBottom: 'none',
  };
  const labelKeyStyle: React.CSSProperties = {
    color: vscodeDarkTheme.propertyInspector.labelText, // zinc-400
    fontWeight: 500,
    marginRight: '6px',
    minWidth: '50px', // Ensure alignment
    display: 'inline-block',
  };
  const valueStyle: React.CSSProperties = {
    color: vscodeDarkTheme.propertyInspector.valueText, // zinc-200
    wordBreak: 'break-all',
  };
  const preStyle: React.CSSProperties = {
    backgroundColor: '#0f172a', // slate-900 (darker than node body for contrast)
    padding: '4px 6px',
    borderRadius: '3px',
    marginTop: '2px',
    maxHeight: '80px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    color: vscodeDarkTheme.propertyInspector.valueTextMuted, // zinc-300
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    // Stop the event from bubbling up to the canvas only if the content area is actually scrollable
    const element = scrollableRef.current;
    if (element) {
      const isScrollable = element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
      if (isScrollable) {
          // Check if the scroll event would actually scroll this element
          const canScrollVertically = (event.deltaY < 0 && element.scrollTop > 0) || (event.deltaY > 0 && element.scrollTop < element.scrollHeight - element.clientHeight);
          const canScrollHorizontally = (event.deltaX < 0 && element.scrollLeft > 0) || (event.deltaX > 0 && element.scrollLeft < element.scrollWidth - element.clientWidth);

          if ((Math.abs(event.deltaY) > Math.abs(event.deltaX) && canScrollVertically) || // Primarily vertical scroll and can scroll vertically
              (Math.abs(event.deltaX) >= Math.abs(event.deltaY) && canScrollHorizontally) || // Primarily horizontal scroll and can scroll horizontally
              (event.deltaY !== 0 && canScrollVertically && !canScrollHorizontally) || // Only vertical scroll and can scroll vertically
              (event.deltaX !== 0 && canScrollHorizontally && !canScrollVertically)    // Only horizontal scroll and can scroll horizontally
          ) {
              event.stopPropagation();
          }
      }
    }
  };

  return (
    <div 
        ref={scrollableRef}
        className="w-full h-full text-xs p-2 box-border overflow-y-auto hide-native-scrollbar relative" // Added relative for OverlayScrollbar
        style={{ fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace', backgroundColor: '#1e293b' /* slate-800 */}}
        onWheel={handleWheel} // Added wheel event handler
    >
      {parseError ? (
        <div style={{ color: vscodeDarkTheme.propertyInspector.warningText }}>{parseError}</div>
      ) : parsedData.length === 0 ? (
        <div style={{ color: vscodeDarkTheme.propertyInspector.infoText }}>数据集合为空。</div>
      ) : (
        parsedData.map((item, index) => {
          const badgeStyles = getDataTypeBadgeStyles(item.type);
          return (
            <div key={item.portId + index} style={index === parsedData.length - 1 ? lastItemStyle : itemStyle}>
              <div><span style={labelKeyStyle}>来源 ID:</span><span style={valueStyle}>{item.portId}</span></div>
              <div><span style={labelKeyStyle}>标签:</span><span style={valueStyle}>{item.label}</span></div>
              <div className="flex items-center">
                <span style={labelKeyStyle}>类型:</span>
                <span className={`px-1.5 py-0.5 rounded-sm text-xs ${badgeStyles.bgClass} ${badgeStyles.textClass}`}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
              </div>
              <div>
                <span style={labelKeyStyle}>内容:</span>
                <pre style={preStyle}>{formatValueForDisplay(item.value)}</pre>
              </div>
            </div>
          );
        })
      )}
      <OverlayScrollbar scrollableRef={scrollableRef} orientation="vertical" />
    </div>
  );
};
