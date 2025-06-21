import React, { useEffect, useRef } from 'react';
import { AddMenuItem } from './addMenuTypes';
import { vscodeDarkTheme } from '../../theme/vscodeDark';

interface AddMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: AddMenuItem[];
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export const AddMenu: React.FC<AddMenuProps> = ({ isOpen, onClose, menuItems, triggerRef }) => {
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

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: triggerRef.current ? `${triggerRef.current.offsetHeight + 4}px` : '100%',
    left: '0',
    minWidth: '180px',
  };

  return (
    <div
      ref={menuRef}
      className={`${theme.bg} ${theme.border} ${theme.shadow} rounded-md py-1 z-[60]`}
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
                onClose();
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
