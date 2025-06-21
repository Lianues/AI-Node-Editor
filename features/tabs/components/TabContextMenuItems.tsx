
import { TabContextMenuItem, TabContextMenuItemActionPayload } from '../types/tabContextMenuTypes';
import { Tab } from '../types/tabTypes'; // Assuming Tab type is here

// Placeholder for actions that will be passed in or defined elsewhere
interface TabContextMenuActions {
  onCloseTab: (payload: TabContextMenuItemActionPayload) => void;
  onCloseOtherTabs: (payload: TabContextMenuItemActionPayload) => void;
  onCloseTabsToTheRight: (payload: TabContextMenuItemActionPayload) => void;
  onCloseAllTabs: (payload: TabContextMenuItemActionPayload) => void; 
  onTogglePinTab: (payload: TabContextMenuItemActionPayload) => void; // Changed from onPinTab
}

export const buildTabContextMenuItems = (
  targetTabId: string,
  allTabs: Tab[], 
  actions: TabContextMenuActions
): TabContextMenuItem[] => {
  const targetTab = allTabs.find(t => t.id === targetTabId);
  if (!targetTab) return []; 

  const canCloseOthers = allTabs.length > 1;
  const targetTabIndex = allTabs.findIndex(t => t.id === targetTabId);
  const canCloseToRight = targetTabIndex !== -1 && targetTabIndex < allTabs.length - 1;
  const canCloseAll = allTabs.length > 0;

  const pinLabel = targetTab.isPinned ? "取消固定" : "固定";

  return [
    {
      id: 'close-tab',
      label: '关闭',
      onClick: actions.onCloseTab,
    },
    {
      id: 'close-other-tabs',
      label: '关闭其他',
      onClick: actions.onCloseOtherTabs,
      disabled: !canCloseOthers,
    },
    {
      id: 'close-tabs-to-the-right',
      label: '关闭右侧标签页',
      onClick: actions.onCloseTabsToTheRight,
      disabled: !canCloseToRight,
    },
    {
      id: 'close-all-tabs',
      label: '全部关闭',
      onClick: actions.onCloseAllTabs,
      disabled: !canCloseAll, 
    },
    { id: 'sep1', isSeparator: true, label: '' },
    {
      id: 'toggle-pin-tab',
      label: pinLabel,
      onClick: actions.onTogglePinTab,
    },
  ];
};