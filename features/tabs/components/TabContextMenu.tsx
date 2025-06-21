
import React, { useEffect, useRef } from 'react';
import { TabContextMenuComponentProps } from '../types/tabContextMenuTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

export const TabContextMenu: React.FC<TabContextMenuComponentProps> = ({ menuConfig, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = vscodeDarkTheme.contextMenu; // Using general context menu theme for consistency

  useEffect(() => {
    if (!menuConfig) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [menuConfig, onClose]);

  if (!menuConfig) {
    return null;
  }

  const { x, y, items, targetTabId } = menuConfig;

  // Adjust position if menu would go off-screen
  const menuWidth = 200; // Approximate width, can be dynamic if needed
  const itemHeight = 28; // h-7
  const separatorHeight = 1; // border-t
  const containerPaddingY = 8; // py-1
  const estimatedMenuHeight = items.reduce((acc, item) => {
    return acc + (item.isSeparator ? separatorHeight : itemHeight);
  }, containerPaddingY);

  const adjustedX = window.innerWidth - x < menuWidth ? x - menuWidth : x;
  const adjustedY = window.innerHeight - y < estimatedMenuHeight ? y - estimatedMenuHeight : y;

  return (
    <div
      ref={menuRef}
      className={`fixed ${theme.bg} ${theme.border} ${theme.shadow} rounded-md z-[70] min-w-[180px] py-1`} // Increased z-index
      style={{
        top: `${adjustedY}px`,
        left: `${adjustedX}px`,
      }}
      role="menu"
      aria-orientation="vertical"
    >
      {items.map((item) => {
        if (item.isSeparator) {
          return <div key={item.id} className={`${theme.separator} my-0.5`} role="separator" />;
        }
        return (
          <button
            key={item.id}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick({ tabId: targetTabId });
                onClose(); // Close menu after action
              } else if (!item.disabled && !item.onClick) {
                // For items without onClick (e.g., pure display or handled by parent)
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`w-full text-left px-3 text-sm flex items-center h-7
              ${item.disabled
                ? `${theme.itemDisabledText} cursor-not-allowed`
                : `${theme.itemText} 
                   hover:${theme.itemBgHover} hover:${theme.itemTextHover} 
                   focus:${theme.itemBgHover} focus:${theme.itemTextHover} focus:outline-none 
                   cursor-pointer`
              }
            `}
            role="menuitem"
          >
            {item.icon && <item.icon className="w-4 h-4 mr-2" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
