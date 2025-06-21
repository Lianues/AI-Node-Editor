
import React, { useEffect, useRef } from 'react';
import { ContextMenuComponentProps, ContextMenuItem } from './contextMenuTypes';
import { vscodeDarkTheme } from '../../theme/vscodeDark';

export const ContextMenu: React.FC<ContextMenuComponentProps> = ({ menuConfig, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = vscodeDarkTheme.contextMenu;

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

    // Use capture phase for mousedown to ensure it fires before potential stopPropagation calls
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

  const { x, y, items } = menuConfig;

  // Adjust position if menu would go off-screen
  const menuWidth = 180; 
  // Approximate height: 28px (h-7) per item, 1px for separator (border-t), plus py-1 (8px total) for container padding
  const containerPaddingY = 8; // 4px top + 4px bottom from py-1
  const itemHeight = 28; // h-7
  const separatorHeight = 1; // border-t
  const estimatedMenuHeight = items.reduce((acc, item) => {
    return acc + (item.isSeparator ? separatorHeight : itemHeight);
  }, containerPaddingY);


  const adjustedX = window.innerWidth - x < menuWidth ? x - menuWidth : x;
  const adjustedY = window.innerHeight - y < estimatedMenuHeight ? y - estimatedMenuHeight : y;


  return (
    <div
      ref={menuRef}
      className={`fixed ${theme.bg} ${theme.border} ${theme.shadow} rounded-md z-50 min-w-[160px] py-1`}
      style={{
        top: `${adjustedY}px`,
        left: `${adjustedX}px`,
      }}
      role="menu"
      aria-orientation="vertical"
    >
      {items.map((item) => {
        if (item.isSeparator) {
          return <div key={item.id} className={`${theme.separator}`} role="separator" />;
        }
        return (
          <button
            key={item.id}
            onClick={(e) => {
              if (!item.disabled) {
                item.onClick(e);
                onClose(); // Close menu after action
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
            {/* Placeholder for icon if item.icon is provided */}
            {/* {item.icon && <item.icon className="w-4 h-4 mr-2" />} */}
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
