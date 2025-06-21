
import React, { useRef } from 'react';
import { XMarkIcon } from '../../../components/icons/XMarkIcon';
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { PinIcon } from '../../../components/icons/PinIcon'; // Import PinIcon
import { Tab } from '../types/tabTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { OverlayScrollbar } from '../../../components/shared/OverlayScrollbar';
import { useTabContextMenu } from '../hooks/useTabContextMenu'; 
import { TabContextMenu } from './TabContextMenu'; 
import { buildTabContextMenuItems } from './TabContextMenuItems'; 

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null; 
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onCloseOtherTabs: (targetTabId: string) => void;
  onCloseTabsToTheRight: (targetTabId: string) => void;
  onCloseAllTabs: () => void;
  onTogglePinTab: (tabId: string) => void; // Added prop
}

export const TabBar: React.FC<TabBarProps> = ({ 
  tabs, 
  activeTabId, 
  onSelectTab, 
  onCloseTab, 
  onAddTab,
  onCloseOtherTabs,
  onCloseTabsToTheRight,
  onCloseAllTabs,
  onTogglePinTab, // Destructure new prop
 }) => {
  const theme = vscodeDarkTheme.tabBar;
  const scrollableTabsRef = useRef<HTMLDivElement>(null);

  const {
    menuConfig: tabMenuConfig,
    openTabContextMenu,
    closeTabContextMenu,
  } = useTabContextMenu();

  const handleTabContextMenu = (event: React.MouseEvent, tabId: string) => {
    event.preventDefault(); 
    const items = buildTabContextMenuItems(tabId, tabs, {
      onCloseTab: ({ tabId: tId }) => onCloseTab(tId),
      onCloseOtherTabs: ({ tabId: tId }) => onCloseOtherTabs(tId),
      onCloseTabsToTheRight: ({ tabId: tId }) => onCloseTabsToTheRight(tId),
      onCloseAllTabs: () => onCloseAllTabs(), 
      onTogglePinTab: ({ tabId: tId }) => onTogglePinTab(tId), // Pass toggle pin action
    });
    openTabContextMenu(event, tabId, items);
  };

  const handleTabIconClick = (event: React.MouseEvent, tab: Tab) => {
    event.stopPropagation();
    if (tab.isPinned) {
      onTogglePinTab(tab.id);
    } else {
      onCloseTab(tab.id);
    }
  };

  return (
    <div className={`h-8 ${theme.bg} flex items-end border-b ${theme.border} shrink-0 relative select-none`}>
      <div
        ref={scrollableTabsRef}
        className="flex items-end h-full overflow-x-auto hide-native-scrollbar flex-grow z-[51]"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            onContextMenu={(e) => handleTabContextMenu(e, tab.id)} 
            className={`relative flex items-center justify-between h-full px-3 border-r ${theme.tabBorderGeneric} cursor-pointer min-w-[120px] max-w-[200px] shrink-0 select-none
              ${activeTabId === tab.id
                ? `${theme.tabBgActive} ${theme.tabTextActive}`
                : `${theme.tabBgInactive} ${theme.tabTextInactive} hover:${theme.tabBgInactiveHover} hover:${theme.tabTextInactiveHover}`
              }
              ${tab.isPinned ? 'font-medium' : ''} 
            `}
            title={tab.title + (tab.isPinned ? " (Pinned)" : "")}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-label={`${tab.title}${tab.isPinned ? ', Pinned' : ''}${tab.unsaved ? ', Unsaved changes' : ''}`}
          >
            {activeTabId === tab.id && (
              <div
                className={`absolute top-0 left-0 w-full h-0.5 bg-sky-500`}
                aria-hidden="true"
              />
            )}
            <span className="text-xs truncate select-none">
              {tab.title}
              {tab.unsaved && <span className={`${theme.tabUnsavedChangesIndicator} ml-1`}>*</span>}
            </span>
            <button
              onClick={(e) => handleTabIconClick(e, tab)}
              className={`p-0.5 rounded ml-2 shrink-0 
                ${activeTabId === tab.id
                  ? `${theme.tabCloseIconActive} ${theme.tabCloseIconActiveHover}`
                  : `${theme.tabCloseIcon} ${theme.tabCloseIconInactiveHover}`
                }`}
              title={tab.isPinned ? "Unpin tab" : "Close tab"}
              aria-label={tab.isPinned ? `Unpin tab ${tab.title}` : `Close tab ${tab.title}`}
            >
              {tab.isPinned 
                ? <PinIcon className="w-3.5 h-3.5" /> 
                : <XMarkIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAddTab}
        className={`h-full px-2 flex items-center justify-center ${theme.addTabIcon} hover:${theme.addTabBgHover} hover:${theme.addTabIconHover} border-l ${theme.tabBorderGeneric} transition-colors shrink-0 select-none`}
        title="New tab"
        aria-label="Add new tab"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
      <OverlayScrollbar scrollableRef={scrollableTabsRef} orientation="horizontal" />
      <TabContextMenu menuConfig={tabMenuConfig} onClose={closeTabContextMenu} />
    </div>
  );
};
