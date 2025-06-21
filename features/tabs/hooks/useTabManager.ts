
import { useState, useCallback } from 'react';
import { Tab } from '../types/tabTypes';

interface UseTabManagerProps {
  initialTabs: Tab[];
  onTabActivated: (newActiveTabId: string | null, oldActiveTabId: string | null) => void;
  onTabCreated: (newTab: Tab) => void;
}

// Helper to escape special characters for RegExp
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

interface AddTabOptions {
  type?: Tab['type'];
  title?: string;
  id?: string; 
}


export const useTabManager = ({ initialTabs, onTabActivated, onTabCreated }: UseTabManagerProps) => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(initialTabs[0]?.id || null);

  const selectTab = useCallback((id: string) => {
    if (id === activeTabId) return;
    const oldActiveTabId = activeTabId;
    setActiveTabId(id);
    onTabActivated(id, oldActiveTabId);
  }, [activeTabId, onTabActivated, setActiveTabId]);

  const addTab = useCallback((options?: AddTabOptions): Tab => {
    const { type: effectiveType = 'workflow', title: optionTitle, id: optionId } = options || {};
    const newTabId = optionId || `${effectiveType}_tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    let generatedTitle = optionTitle;
    if (!generatedTitle && !optionId) {
      let basePrefix: string;
      switch (effectiveType) {
        case 'subworkflow': basePrefix = '子程序'; break;
        case 'nodegroup': basePrefix = '节点组'; break;
        case 'markdown': basePrefix = 'Markdown'; break;
        case 'workflow':
        default: basePrefix = '页面'; break;
      }

      const tabsOfSameType = tabs.filter(tab => tab.type === effectiveType);
      const titlePattern = new RegExp(`^${escapeRegExp(basePrefix)} (\\d+)$`);
      let nextNumber = 1;
      const existingNumbers: number[] = [];

      tabsOfSameType.forEach(tab => {
        const match = tab.title.match(titlePattern);
        if (match && match[1]) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      });

      if (existingNumbers.length > 0) {
        nextNumber = Math.max(0, ...existingNumbers) + 1;
      } else {
        // Check if any non-numbered tab of this type exists. If so, start from existing count + 1.
        // This handles cases like "Page", "Page Renamed", then new should be "Page 3" (if 2 exist)
        // This part of the original logic was a bit complex. A simpler approach is:
        // If no numbered tabs, check total tabs of this type.
        // This could be simplified if strict "Prefix N" is always desired.
        // For now, keeping existing logic which finds max N or starts from 1.
      }
      if (nextNumber < 1) nextNumber = 1; // Ensure positive
      
      let candidateTitle = `${basePrefix} ${nextNumber}`;
      while (tabs.some(t => t.type === effectiveType && t.title === candidateTitle)) { // Check against all tabs of same type
        nextNumber++;
        candidateTitle = `${basePrefix} ${nextNumber}`;
      }
      generatedTitle = candidateTitle;
    } else if (!generatedTitle && optionId) {
      const typeDisplay = effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1);
      generatedTitle = `${typeDisplay} ${optionId.slice(-6)}`;
    }


    const newTabObject: Tab = {
      id: newTabId,
      title: generatedTitle || "新标签页",
      unsaved: false,
      type: effectiveType,
      isPinned: false,
    };
    
    const oldActiveTabIdFromClosure = activeTabId;

    // Check for duplicate ID first, synchronously using `tabs` from closure
    const existingById = tabs.find(t => t.id === newTabObject.id);
    if (existingById) {
      console.warn(`[useTabManager] addTab: Tab with ID ${newTabObject.id} (Title: '${newTabObject.title}') already exists. Activating it instead.`);
      if (activeTabId !== newTabObject.id) {
        setActiveTabId(newTabObject.id);
        onTabActivated(newTabObject.id, oldActiveTabIdFromClosure);
      }
      return existingById;
    }

    // Check for duplicate title (if ID was auto-generated and title was auto-generated) using `tabs` from closure
    if (!optionId && !optionTitle) { 
        const existingByTitleAndType = tabs.find(t => t.type === newTabObject.type && t.title === newTabObject.title);
        if (existingByTitleAndType) {
            console.warn(`[useTabManager] addTab: Tab with auto-generated title '${newTabObject.title}' (Type: '${newTabObject.type}') already exists. Activating existing.`);
            if (activeTabId !== existingByTitleAndType.id) {
                setActiveTabId(existingByTitleAndType.id);
                onTabActivated(existingByTitleAndType.id, oldActiveTabIdFromClosure);
            }
            return existingByTitleAndType;
        }
    }

    // If not a duplicate, proceed to add and activate
    onTabCreated(newTabObject); // Prepare state (async setTabWorkflowStates + ref update in useWorkflowTabsManager)
    setTabs(prevTabs => [...prevTabs, newTabObject]); // Schedule tab array update
    setActiveTabId(newTabObject.id); // Schedule active ID update
    onTabActivated(newTabObject.id, oldActiveTabIdFromClosure); // Load state (should use ref for just-created state)

    return newTabObject;
  }, [tabs, activeTabId, onTabCreated, setActiveTabId, onTabActivated]);


  const closeTab = useCallback((idToClose: string) => {
    const oldActiveTabIdOnCloseStart = activeTabId;
    let newActiveTabIdToSet: string | null = activeTabId;
    
    const remainingTabs = tabs.filter(tab => tab.id !== idToClose);

    if (activeTabId === idToClose) {
      if (remainingTabs.length > 0) {
        const closedTabIndex = tabs.findIndex(tab => tab.id === idToClose);
        if (closedTabIndex < remainingTabs.length) { 
          newActiveTabIdToSet = remainingTabs[closedTabIndex].id;
        } else if (closedTabIndex > 0 && closedTabIndex <= remainingTabs.length) { 
          newActiveTabIdToSet = remainingTabs[closedTabIndex - 1].id;
        } else { 
          newActiveTabIdToSet = remainingTabs[0].id;
        }
      } else { 
        newActiveTabIdToSet = null;
      }
    }
    
    setTabs(remainingTabs);
    
    if (newActiveTabIdToSet !== activeTabId || (remainingTabs.length === 0 && activeTabId !== null) ) {
        setActiveTabId(newActiveTabIdToSet);
        onTabActivated(newActiveTabIdToSet, oldActiveTabIdOnCloseStart);
    }
  }, [tabs, activeTabId, onTabActivated, setActiveTabId]);


  const closeOtherTabs = useCallback((targetTabId: string) => {
    const targetTab = tabs.find(t => t.id === targetTabId);
    if (!targetTab || tabs.length <= 1) return;
    const oldActiveTabId = activeTabId;
    let tabsToKeep: Tab[] = tabs.filter(t => t.isPinned || t.id === targetTabId);
    tabsToKeep = Array.from(new Set(tabsToKeep.map(t => t.id))).map(id => tabsToKeep.find(t => t.id === id)!);
    setTabs(tabsToKeep);
    if (!tabsToKeep.some(t => t.id === oldActiveTabId) || oldActiveTabId !== targetTabId) {
      setActiveTabId(targetTabId);
      onTabActivated(targetTabId, oldActiveTabId);
    }
  }, [tabs, activeTabId, onTabActivated, setActiveTabId]);

  const closeTabsToTheRight = useCallback((targetTabId: string) => {
    const targetTabIndex = tabs.findIndex(t => t.id === targetTabId);
    if (targetTabIndex === -1 || targetTabIndex === tabs.length - 1) return;
    const oldActiveTabId = activeTabId;
    const tabsOnLeftAndTarget = tabs.slice(0, targetTabIndex + 1);
    const pinnedTabsOnRight = tabs.slice(targetTabIndex + 1).filter(t => t.isPinned);
    let tabsToKeep = [...tabsOnLeftAndTarget, ...pinnedTabsOnRight];
    setTabs(tabsToKeep);
    const activeTabWasClosed = !tabsToKeep.some(t => t.id === oldActiveTabId);
    if (activeTabWasClosed) {
      const newActive = tabsToKeep.find(t => t.id === targetTabId) 
                        ? targetTabId 
                        : (tabsToKeep.length > 0 ? tabsToKeep[tabsToKeep.length - 1].id : null);
      setActiveTabId(newActive);
      onTabActivated(newActive, oldActiveTabId);
    }
  }, [tabs, activeTabId, onTabActivated, setActiveTabId]);

  const closeAllTabs = useCallback(() => {
    if (tabs.length === 0) return;
    const oldActiveTabId = activeTabId;
    const pinnedTabs = tabs.filter(t => t.isPinned);
    setTabs(pinnedTabs);
    if (pinnedTabs.length === 0) {
      setActiveTabId(null);
      onTabActivated(null, oldActiveTabId);
    } else {
      const activeTabStillExists = pinnedTabs.some(t => t.id === oldActiveTabId);
      if (!activeTabStillExists) {
        const newActive = pinnedTabs[0].id;
        setActiveTabId(newActive);
        onTabActivated(newActive, oldActiveTabId);
      }
    }
  }, [tabs, activeTabId, onTabActivated, setActiveTabId]);

  const togglePinTab = useCallback((tabIdToToggle: string) => {
    setTabs(prevTabs => {
      const tabToToggle = prevTabs.find(t => t.id === tabIdToToggle);
      if (!tabToToggle) return prevTabs;
      const otherTabs = prevTabs.filter(t => t.id !== tabIdToToggle);
      const newPinnedState = !tabToToggle.isPinned;
      const updatedTabToToggle = { ...tabToToggle, isPinned: newPinnedState };
      if (newPinnedState) {
          const lastPinnedIndex = otherTabs.reduce((acc, tab, index) => (tab.isPinned ? index : acc), -1);
          return [ ...otherTabs.slice(0, lastPinnedIndex + 1), updatedTabToToggle, ...otherTabs.slice(lastPinnedIndex + 1) ];
      } else { 
          const firstUnpinnedIndex = otherTabs.findIndex(t => !t.isPinned);
          if (firstUnpinnedIndex === -1) return [...otherTabs, updatedTabToToggle];
          return [ ...otherTabs.slice(0, firstUnpinnedIndex), updatedTabToToggle, ...otherTabs.slice(firstUnpinnedIndex) ];
      }
    });
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<Omit<Tab, 'id'>>) => {
    setTabs(prevTabs =>
      prevTabs.map(t => (t.id === tabId ? { ...t, ...updates } : t))
    );
  }, []);


  return {
    tabs,
    activeTabId,
    selectTab,
    closeTab,
    addTab,
    closeOtherTabs,
    closeTabsToTheRight,
    closeAllTabs,
    togglePinTab,
    updateTab, 
  };
};
