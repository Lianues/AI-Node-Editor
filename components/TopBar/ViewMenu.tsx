
import React, { useEffect, useRef, useState } from 'react';
import { ViewMenuItem } from './viewMenuTypes';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { HistorySubMenu } from './HistorySubMenu'; // Import the new submenu component
import { HistoryEntry } from '../../features/history/historyTypes'; // Import HistoryEntry

interface ViewMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: ViewMenuItem[];
  triggerRef: React.RefObject<HTMLButtonElement>;
  activeTabHistory: HistoryEntry[]; 
  currentHistoryIndex: number; // Added prop for current history index
  onRestoreHistoryEntry: (entryId: string) => void; 
}

const SUBMENU_VISIBILITY_DELAY = 100; // milliseconds

export const ViewMenu: React.FC<ViewMenuProps> = ({ 
  isOpen, 
  onClose, 
  menuItems, 
  triggerRef, 
  activeTabHistory,
  currentHistoryIndex, // Destructure new prop
  onRestoreHistoryEntry, 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const historyMenuItemRef = useRef<HTMLButtonElement>(null);
  const historySubMenuRef = useRef<HTMLDivElement>(null); // Ref for the HistorySubMenu
  const theme = vscodeDarkTheme.topBar.dropdownMenu;

  const [isHistorySubmenuOpen, setIsHistorySubmenuOpen] = useState(false);
  const submenuTimeoutRef = useRef<number | null>(null); 

  const clearSubmenuTimeout = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
  };

  const handleOpenHistorySubmenu = () => {
    clearSubmenuTimeout();
    setIsHistorySubmenuOpen(true);
  };

  const handleCloseHistorySubmenuWithDelay = () => {
    clearSubmenuTimeout();
    submenuTimeoutRef.current = window.setTimeout(() => { 
      setIsHistorySubmenuOpen(false);
    }, SUBMENU_VISIBILITY_DELAY);
  };
  
  const handleEffectiveOnClose = () => {
    clearSubmenuTimeout();
    setIsHistorySubmenuOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) {
      clearSubmenuTimeout();
      setIsHistorySubmenuOpen(false);
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      const isClickInMenu = menuRef.current?.contains(target);
      const isClickInTrigger = triggerRef.current?.contains(target);
      const isClickInHistorySubmenu = isHistorySubmenuOpen && historySubMenuRef.current?.contains(target);

      if (!isClickInMenu && !isClickInTrigger && !isClickInHistorySubmenu) {
        handleEffectiveOnClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleEffectiveOnClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
      clearSubmenuTimeout(); 
    };
  }, [isOpen, onClose, triggerRef, isHistorySubmenuOpen]); // Added isHistorySubmenuOpen


  if (!isOpen) {
    return null;
  }
  
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: triggerRef.current ? `${triggerRef.current.offsetHeight + 4}px` : '100%',
    left: '0',
    minWidth: '180px',
  };

  return (
    <>
      <div
        ref={menuRef}
        className={`${theme.bg} ${theme.border} ${theme.shadow} rounded-md py-1 z-[60]`}
        style={menuStyle}
        role="menu"
        aria-orientation="vertical"
        onMouseLeave={handleCloseHistorySubmenuWithDelay} 
        onMouseEnter={clearSubmenuTimeout} 
      >
        {menuItems.map((item) => {
          const isHistoryItem = item.id === 'history' && item.hasSubmenu;
          return (
            <button
              ref={isHistoryItem ? historyMenuItemRef : null}
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  if (!item.hasSubmenu) { 
                    handleEffectiveOnClose();
                  }
                }
              }}
              disabled={item.disabled}
              className={`w-full text-left px-3 text-sm flex items-center justify-between h-7
                ${item.disabled
                  ? `${theme.itemDisabledText} cursor-not-allowed`
                  : `${theme.itemText} 
                    hover:${theme.itemBgHover} hover:${theme.itemTextHover} 
                    focus:${theme.itemBgHover} focus:${theme.itemTextHover} focus:outline-none 
                    cursor-pointer`
                }
              `}
              role="menuitem"
              onMouseEnter={isHistoryItem ? handleOpenHistorySubmenu : clearSubmenuTimeout}
              onMouseLeave={isHistoryItem ? handleCloseHistorySubmenuWithDelay : undefined}
            >
              <span>{item.label}</span>
              {item.shortcut && <span className={`text-xs ${theme.itemDisabledText}`}>{item.shortcut}</span>}
              {item.hasSubmenu && <span className="text-xs ml-auto pl-2">{'>'}</span>}
            </button>
          );
        })}
      </div>
      <HistorySubMenu
        ref={historySubMenuRef} // Pass the ref here
        isOpen={isHistorySubmenuOpen}
        anchorElement={historyMenuItemRef.current}
        onMouseEnter={handleOpenHistorySubmenu} 
        onMouseLeave={handleCloseHistorySubmenuWithDelay} 
        historyEntries={activeTabHistory} 
        currentHistoryIndex={currentHistoryIndex} // Pass currentHistoryIndex
        onRestore={onRestoreHistoryEntry} 
      />
    </>
  );
};
