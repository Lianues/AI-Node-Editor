
import { useEffect } from 'react';
import { 
  handleCopyShortcut, 
  handleCutShortcut, 
  handleDeleteShortcut, 
  handlePasteShortcut, 
  handleUndoShortcut, 
  handleRedoShortcut,
  handleSaveShortcut, // Added save handler
  // handleTogglePersistentMarqueeModeShortcut removed
} from './shortcutManager'; 
import type { ShortcutActionDependencies } from './shortcutManager';


export const useShortcutManager = (dependencies: ShortcutActionDependencies) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const inputIsActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement.hasAttribute('contenteditable') && activeElement.getAttribute('contenteditable') === 'true')
      );

      // If an input field is active, check if the key should be handled by the input field itself.
      if (inputIsActive) {
        // For these keys, always let the input field handle them.
        if (
          event.key === 'Backspace' ||
          event.key === 'Delete' ||
          event.key === 'Enter' ||
          event.key.startsWith('Arrow') // ArrowUp, ArrowDown, ArrowLeft, ArrowRight
        ) {
          return; 
        }

        // For Ctrl/Meta + common text editing shortcuts, let the input field handle them.
        const isCtrlOrMeta = event.ctrlKey || event.metaKey;
        if (isCtrlOrMeta) {
          const keyLower = event.key.toLowerCase();
          if (['c', 'x', 'v', 'a', 'z', 'y', 's'].includes(keyLower)) { // Added 's' for save
            // If 's' is pressed with Ctrl/Meta AND an input is active,
            // we let the browser handle its default save action (e.g., save webpage)
            // or let the input field handle it if it has specific behavior.
            // The global save shortcut should only trigger if an input is NOT active
            // OR if the input field doesn't specifically handle Ctrl+S.
            // This typically means if it's a plain input/textarea, browser handles it.
            // If it's a rich editor, it might handle it.
            // For simplicity, we'll assume if input is active, global Ctrl+S is blocked here.
            if (keyLower === 's') {
                // If we want to allow browser's default save on Ctrl+S in input, return.
                // If we want our app's save to *always* trigger, then this check needs refinement
                // or the save function itself needs to be smarter about context.
                // For now, if an input is active, assume the user might be trying to save
                // content within that input or the page itself, not the app's workflow file.
                return; 
            }
            return; 
          }
        }
        // If it's another key not listed above (e.g., 'm', F-keys, etc.) while an input is active,
        // it will fall through to the global shortcut logic below. This is generally fine
        // unless a specific global shortcut conflicts with a less common input behavior.
      }

      // Global shortcut logic (if input is NOT active, or if the key wasn't one handled above)
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      if (isCtrlOrMeta && event.key.toLowerCase() === 'c') {
        event.preventDefault(); 
        handleCopyShortcut(dependencies);
      }
      else if (isCtrlOrMeta && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        handleCutShortcut(dependencies);
      }
      else if (isCtrlOrMeta && event.key.toLowerCase() === 'v') {
        event.preventDefault(); 
        handlePasteShortcut(dependencies);
      }
      else if (isCtrlOrMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndoShortcut(dependencies);
      }
      else if (isCtrlOrMeta && event.key.toLowerCase() === 'y') { 
        event.preventDefault();
        handleRedoShortcut(dependencies);
      }
      else if (isCtrlOrMeta && event.key.toLowerCase() === 's') { // Save shortcut
        event.preventDefault();
        handleSaveShortcut(dependencies);
      }
      // Delete/Backspace for global app actions (only if input is not active)
      else if ((event.key === 'Delete' || event.key === 'Backspace')) {
        // This block is now only reached if inputIsActive was false (due to the check at the top).
        if (dependencies.selectedNodeIds.length > 0 || dependencies.selectedConnectionId) {
          event.preventDefault(); 
          handleDeleteShortcut(dependencies);
        }
      }
      // 'M' key handling for marquee mode is managed in App.tsx globally.
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dependencies]); 
};