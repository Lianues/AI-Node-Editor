
import { useState, useCallback } from 'react';

const INITIAL_PAN = { x: 0, y: 0 };
const INITIAL_SCALE = 1;

export interface ViewAccessForTabsManager {
  getCurrentPan: () => { x: number; y: number };
  getCurrentScale: () => number;
  setPan: (newPanOrCallback: { x: number; y: number } | ((prevState: { x: number; y: number }) => { x: number; y: number })) => void;
  setScale: (newScaleOrCallback: number | ((prevState: number) => number)) => void;
}

export interface ViewPropsForCanvas {
  externalPanForCanvas: { x: number; y: number };
  externalScaleForCanvas: number;
  onCanvasViewUpdate: (pan: { x: number; y: number }, scale: number) => void;
}

export interface AppViewManagerOutput {
  currentInteractivePan: { x: number; y: number };
  currentInteractiveScale: number;
  viewAccessForTabsManager: ViewAccessForTabsManager;
  viewPropsForCanvas: ViewPropsForCanvas;
}

export const useAppViewManager = (): AppViewManagerOutput => {
  const [currentLoadedPan, setCurrentLoadedPan] = useState(INITIAL_PAN);
  const [currentLoadedScale, setCurrentLoadedScale] = useState(INITIAL_SCALE);

  const [currentInteractivePan, setCurrentInteractivePan] = useState(INITIAL_PAN);
  const [currentInteractiveScale, setCurrentInteractiveScale] = useState(INITIAL_SCALE);

  const syncLoadedToInteractiveView = useCallback((pan: { x: number, y: number }, scale: number) => {
    setCurrentLoadedPan(pan);
    setCurrentLoadedScale(scale);
    setCurrentInteractivePan(pan);
    setCurrentInteractiveScale(scale);
  }, []);
  
  const handleCanvasViewUpdate = useCallback((pan: {x: number, y: number}, scale: number) => {
    setCurrentInteractivePan(pan);
    setCurrentInteractiveScale(scale);
  }, []);

  // Changed: Removed useCallback(...)() for direct object creation.
  // This means viewAccessForTabsManager object will be recreated on every render of useAppViewManager.
  // If it's a dependency of useEffect/useCallback in useWorkflowTabsManager, those will re-run/re-create more often.
  const viewAccessForTabsManager: ViewAccessForTabsManager = {
    getCurrentPan: () => currentInteractivePan,
    getCurrentScale: () => currentInteractiveScale,
    setPan: (newPanOrCallback: { x: number; y: number } | ((prevState: { x: number; y: number }) => { x: number; y: number })) => {
      const newPanVal = typeof newPanOrCallback === 'function' ? newPanOrCallback(currentLoadedPan) : newPanOrCallback;
      syncLoadedToInteractiveView(newPanVal, currentLoadedScale);
    },
    setScale: (newScaleOrCallback: number | ((prevState: number) => number)) => {
      const newScaleVal = typeof newScaleOrCallback === 'function' ? newScaleOrCallback(currentLoadedScale) : newScaleOrCallback;
      syncLoadedToInteractiveView(currentLoadedPan, newScaleVal);
    },
  };

  const viewPropsForCanvas: ViewPropsForCanvas = {
    externalPanForCanvas: currentLoadedPan,
    externalScaleForCanvas: currentLoadedScale,
    onCanvasViewUpdate: handleCanvasViewUpdate,
  };

  return {
    currentInteractivePan,
    currentInteractiveScale,
    viewAccessForTabsManager,
    viewPropsForCanvas,
  };
};
