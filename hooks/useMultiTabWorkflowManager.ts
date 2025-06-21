
// This file is being replaced by hooks/useWorkflowTabsManager.ts
// Its content has been migrated and adapted into the new hook.
// This file can be safely deleted after the transition is complete.

/*
Original content of useMultiTabWorkflowManager.ts was here.
It included:
- WorkflowState interface
- Utility functions like deepCloneArray, createInitialSnapshot, createInitialHistoryEntry, deepCloneWorkflowState
- Accessor interface types (NodeManagerAccess, ConnectionManagerAccess, etc.)
- The main useMultiTabWorkflowManager hook logic, including:
  - State for tabWorkflowStates, persistedInternalFileStates, previousActiveTabIdRef, tabFileHandlesRef
  - Internal use of useTabManager
  - useEffect for saving/loading state on tab switch
  - addTab, saveActiveTabWorkflowState, getActiveTabFileHandle functions
*/
export {}; // Add an empty export to make it a module and avoid TypeScript errors if it's still imported somewhere temporarily.
