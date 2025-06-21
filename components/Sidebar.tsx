
import React from 'react';
import { SIDEBAR_ITEMS } from './constants';
import { SidebarItemId } from '../types';
import { vscodeDarkTheme } from '../theme/vscodeDark';

interface SidebarProps {
  activeItemId: SidebarItemId | null;
  onSelectItem: (id: SidebarItemId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItemId, onSelectItem }) => {
  return (
    <div className={`w-16 ${vscodeDarkTheme.sidebar.bg} flex flex-col items-center pb-4 shrink-0 border-r ${vscodeDarkTheme.topBar.border}`}>
      {SIDEBAR_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectItem(item.id)}
          className={`flex flex-col items-center p-2 rounded-md w-full transition-colors duration-150 select-none focus:outline-none
            ${activeItemId === item.id 
              ? `${vscodeDarkTheme.sidebar.itemBgActive} ${vscodeDarkTheme.sidebar.itemTextActive}` 
              : `${vscodeDarkTheme.sidebar.itemText} hover:${vscodeDarkTheme.sidebar.itemBgHover} hover:${vscodeDarkTheme.sidebar.itemTextHover}`
            }`}
          title={item.label}
        >
          <item.icon className={`w-6 h-6 mb-1 ${activeItemId === item.id ? vscodeDarkTheme.icons.sidebarActive : vscodeDarkTheme.icons.sidebarDefault }`} />
          <span className="text-xs tracking-tighter">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
