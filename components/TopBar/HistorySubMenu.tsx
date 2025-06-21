
import React, { useRef, forwardRef } from 'react';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { HistoryEntry, HistoryActionType } from '../../features/history/historyTypes'; // Import HistoryEntry & HistoryActionType
import { OverlayScrollbar } from '../shared/OverlayScrollbar'; // Import OverlayScrollbar

interface HistorySubMenuProps {
  isOpen: boolean;
  anchorElement: HTMLButtonElement | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  historyEntries: HistoryEntry[]; 
  currentHistoryIndex: number; 
  onRestore: (entryId: string) => void; 
}

const ITEM_HEIGHT_ESTIMATE_PX = 28; 
const MAX_ITEMS_VISIBLE = 5;


export const HistorySubMenu = forwardRef<HTMLDivElement, HistorySubMenuProps>(({
  isOpen,
  anchorElement,
  onMouseEnter,
  onMouseLeave,
  historyEntries,
  currentHistoryIndex, 
  onRestore, 
}, ref) => {
  const theme = vscodeDarkTheme.topBar.dropdownMenu;
  const scrollableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !anchorElement) {
    return null;
  }

  const anchorRect = anchorElement.getBoundingClientRect();
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${anchorRect.top}px`,
    left: `${anchorRect.right + 2}px`, 
    minWidth: '220px', 
    maxWidth: '350px', 
  };
  
  const scrollableContainerMaxHeight = `${MAX_ITEMS_VISIBLE * ITEM_HEIGHT_ESTIMATE_PX}px`;

  // Removed filter: entry.actionType !== HistoryActionType.INITIAL_STATE
  const visibleHistoryEntries = historyEntries; 

  return (
    <div
      ref={ref} // Assign the forwarded ref here
      data-submenu-id="history-submenu"
      style={menuStyle}
      className={`${theme.bg} ${theme.border} ${theme.shadow} rounded-md py-1 z-[70] flex flex-col`} 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      aria-orientation="vertical"
    >
      {visibleHistoryEntries.length === 0 ? (
        <div className={`px-3 py-1.5 text-sm ${theme.itemDisabledText}`}>无历史操作</div>
      ) : (
        <div className="relative overflow-hidden"> 
          <div
            ref={scrollableRef}
            className="overflow-y-auto hide-native-scrollbar" 
            style={{ maxHeight: scrollableContainerMaxHeight }}
          >
            {visibleHistoryEntries.map((entry, index) => { // Using original index directly from map
              const originalIndex = index; // Since we are not filtering, map index is original index

              const isCurrent = originalIndex === currentHistoryIndex;
              const isFutureEntry = originalIndex < currentHistoryIndex; 

              const itemTextStyle = isFutureEntry 
                ? `${theme.itemDisabledText} opacity-70` 
                : theme.itemText;
              
              const hoverTextStyle = isFutureEntry
                ? `hover:${theme.itemDisabledText} hover:opacity-80` 
                : `hover:${theme.itemTextHover}`;

              return (
                <button
                  key={entry.id}
                  onClick={() => onRestore(entry.id)} 
                  className={`w-full text-left px-3 py-1 text-sm ${itemTextStyle} hover:${theme.itemBgHover} ${hoverTextStyle} focus:outline-none focus:${theme.itemBgHover} cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis
                    ${isCurrent ? `${theme.itemBgHover} ${theme.itemTextHover} font-semibold` : ''} 
                  `}
                  title={entry.description} 
                  role="menuitem"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {entry.description}
                </button>
              );
            })}
          </div>
          <OverlayScrollbar scrollableRef={scrollableRef} orientation="vertical" />
        </div>
      )}
    </div>
  );
});

HistorySubMenu.displayName = 'HistorySubMenu';
