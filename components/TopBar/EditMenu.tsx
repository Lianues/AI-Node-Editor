import React, { useEffect, useRef } from 'react';
import { EditMenuItem } from './editMenuTypes';
import { vscodeDarkTheme } from '../../theme/vscodeDark';

interface EditMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: EditMenuItem[];
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export const EditMenu: React.FC<EditMenuProps> = ({ isOpen, onClose, menuItems, triggerRef }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = vscodeDarkTheme.topBar.dropdownMenu;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
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
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) {
    return null;
  }
  
  // Basic positioning: directly below the trigger.
  const menuStyle: React.CSSProperties = {
    position: 'absolute', // Changed from fixed to absolute to position relative to TopBar
    top: triggerRef.current ? `${triggerRef.current.offsetHeight + 4}px` : '100%', // Position below the button
    left: '0', // Let the parent div in TopBar handle horizontal alignment
    minWidth: '180px', // Ensure a minimum width, increased slightly
  };


  return (
    <div
      ref={menuRef}
      className={`${theme.bg} ${theme.border} ${theme.shadow} rounded-md py-1 z-[60]`} // Increased z-index to 60
      style={menuStyle}
      role="menu"
      aria-orientation="vertical"
    >
      {menuItems.map((item) => {
        if (item.isSeparator) {
          return <div key={item.id} className={`${theme.separator} my-1`} role="separator" />;
        }
        return (
          <button
            key={item.id}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose(); // Close menu after action
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
          >
            <span>{item.label}</span>
            {item.shortcut && <span className={`text-xs ${theme.itemDisabledText}`}>{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
};