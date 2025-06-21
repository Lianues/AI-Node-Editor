
import React, { useState, useCallback, useMemo } from 'react';
import { Node, CanvasSnapshot, NodeExecutionState } from '../../../types';
import { DefiningAreaScreenRect, DefinedArea } from '../types/areaDefinitionTypes';
import { useDefinedAreaManager, UseDefinedAreaManagerOutput } from './useDefinedAreaManager';
import { HistoryActionType } from '../../history/historyTypes'; 
import { WorkflowHistoryManagerOutput } from '../../history/useWorkflowHistoryManager'; 
import { NodeManagerAccess } from '../../../hooks/useWorkflowTabsManager'; 
import { ConnectionManagerAccess } from '../../../hooks/useWorkflowTabsManager'; 
import { AppViewManagerOutput } from '../../../hooks/useAppViewManager'; 
import { AppUIManagerOutput } from '../../../hooks/useAppUIManager'; 
import { SidebarItemId } from '../../../types';

const DEFAULT_AREA_PADDING = 20; 

interface UseAppDefinedAreaOrchestrationProps {
  definedAreaManagerHook: UseDefinedAreaManagerOutput;
  workflowHistoryManager: WorkflowHistoryManagerOutput;
  nodeManagerAccess: NodeManagerAccess;
  connectionManagerAccess: ConnectionManagerAccess;
  appViewManager: AppViewManagerOutput; 
  appUIManager: AppUIManagerOutput;
  getCanvasBoundingClientRect: () => DOMRect | null;
  activeTabId: string | null;
}

export interface AppDefinedAreaOrchestrationOutput {
  isDefiningAreaActive: boolean;
  selectedDefinedAreaId: string | null;
  selectedDefinedAreaForInspector: DefinedArea | null;
  appHandleStartDefiningArea: () => void;
  appHandleEndDefiningArea: (screenRect: DefiningAreaScreenRect | null) => void;
  appHandleUpdateDefinedArea: (areaId: string, updates: Partial<Omit<DefinedArea, 'id'>>) => void;
  appHandleDeleteDefinedArea: (areaId: string) => void;
  appHandleCreateAreaFromSelectedNodes: (_event?: any, effectiveSelectedIdsOverride?: string[]) => void;
  handleShowPropertiesForDefinedArea: (areaId: string) => void;
  clearSelectedDefinedArea: () => void;
  addDefinedAreaDirectlyAndCommitHistory: (worldRect: { x: number; y: number; width: number; height: number; }, title: string) => DefinedArea | null; // New
}

export const useAppDefinedAreaOrchestration = ({
  definedAreaManagerHook,
  workflowHistoryManager,
  nodeManagerAccess,
  connectionManagerAccess,
  appViewManager,
  appUIManager,
  getCanvasBoundingClientRect,
  activeTabId,
}: UseAppDefinedAreaOrchestrationProps): AppDefinedAreaOrchestrationOutput => {
  const [isDefiningAreaActive, setIsDefiningAreaActive] = useState(false);
  const [selectedDefinedAreaId, setSelectedDefinedAreaId] = useState<string | null>(null);

  const clearSelectedDefinedArea = useCallback(() => {
    setSelectedDefinedAreaId(null);
  }, []);

  const appHandleStartDefiningArea = useCallback(() => {
    setIsDefiningAreaActive(true);
    nodeManagerAccess.selectNode(null, false);
    connectionManagerAccess.selectConnection(null);
    nodeManagerAccess.selectNodeTypeForPlacement(null);
    setSelectedDefinedAreaId(null);
  }, [nodeManagerAccess, connectionManagerAccess]);

  const addDefinedAreaDirectlyAndCommitHistory = useCallback((
    worldRect: { x: number; y: number; width: number; height: number; },
    title: string
  ): DefinedArea | null => {
    if (!activeTabId) {
      console.warn('Cannot create defined area directly: No active tab.');
      return null;
    }
    const newArea = definedAreaManagerHook.addDefinedArea(worldRect, title);
    workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_DEFINED_AREA, { area: newArea });
    return newArea;
  }, [activeTabId, definedAreaManagerHook, workflowHistoryManager]);


  const appHandleEndDefiningArea = useCallback((screenRect: DefiningAreaScreenRect | null) => {
    setIsDefiningAreaActive(false); 
    if (screenRect && activeTabId) {
      const canvasBoundingRect = getCanvasBoundingClientRect();
      if (canvasBoundingRect) {
        const { x: panX, y: panY } = appViewManager.currentInteractivePan;
        const currentScale = appViewManager.currentInteractiveScale;

        const worldX = (screenRect.x - panX) / currentScale;
        const worldY = (screenRect.y - panY) / currentScale;
        const worldWidth = screenRect.width / currentScale;
        const worldHeight = screenRect.height / currentScale;

        addDefinedAreaDirectlyAndCommitHistory({ x: worldX, y: worldY, width: worldWidth, height: worldHeight }, undefined);
      } else {
        console.warn('Cannot create defined area: Canvas bounding rect not available.');
      }
    }
  }, [
    activeTabId,
    getCanvasBoundingClientRect,
    appViewManager.currentInteractivePan,
    appViewManager.currentInteractiveScale,
    addDefinedAreaDirectlyAndCommitHistory, // Use the new combined function
  ]);

  const appHandleUpdateDefinedArea = useCallback((areaId: string, updates: Partial<Omit<DefinedArea, 'id'>>) => {
    const oldArea = definedAreaManagerHook.definedAreas.find(a => a.id === areaId);
    if (!oldArea) return;

    const oldValuesForHistory: Partial<Omit<DefinedArea, 'id'>> = {};
    (Object.keys(updates) as Array<keyof typeof updates>).forEach(key => {
      if (oldArea.hasOwnProperty(key) && oldArea[key] !== updates[key]) {
        (oldValuesForHistory as any)[key] = oldArea[key];
      }
    });

    definedAreaManagerHook.updateDefinedArea(areaId, updates);
    workflowHistoryManager.commitHistoryAction(HistoryActionType.UPDATE_DEFINED_AREA, {
      areaId,
      areaTitle: oldArea.title,
      oldValues: oldValuesForHistory,
      newValues: updates,
    });
  }, [definedAreaManagerHook, workflowHistoryManager]);

  const appHandleDeleteDefinedArea = useCallback((areaId: string) => {
    const areaToDelete = definedAreaManagerHook.definedAreas.find(a => a.id === areaId);
    if (areaToDelete) {
      definedAreaManagerHook.deleteDefinedArea(areaId);
      workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_DEFINED_AREA, {
        deletedArea: areaToDelete,
      });
      if (selectedDefinedAreaId === areaId) {
        setSelectedDefinedAreaId(null);
      }
    }
  }, [definedAreaManagerHook, workflowHistoryManager, selectedDefinedAreaId]);

  const appHandleCreateAreaFromSelectedNodes = useCallback((_event?:any, effectiveSelectedIdsOverride?: string[]) => {
    const selectedIds = effectiveSelectedIdsOverride || nodeManagerAccess.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    const currentNodes = nodeManagerAccess.getNodes();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selectedIds.forEach(nodeId => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node) {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      }
    });

    if (minX === Infinity) return;

    const areaX = minX - DEFAULT_AREA_PADDING;
    const areaY = minY - DEFAULT_AREA_PADDING;
    const areaWidth = (maxX - minX) + (DEFAULT_AREA_PADDING * 2);
    const areaHeight = (maxY - minY) + (DEFAULT_AREA_PADDING * 2);

    const newArea = addDefinedAreaDirectlyAndCommitHistory({
      x: areaX,
      y: areaY,
      width: areaWidth,
      height: areaHeight,
    }, undefined);

    if (newArea) {
      setSelectedDefinedAreaId(newArea.id);
      nodeManagerAccess.selectNode(null, false);
      connectionManagerAccess.selectConnection(null);
    }
  }, [nodeManagerAccess, connectionManagerAccess, addDefinedAreaDirectlyAndCommitHistory]);

  const handleShowPropertiesForDefinedArea = useCallback((areaId: string) => {
    appUIManager.setActiveSidebarItemOptimized(SidebarItemId.PropertyInspector);
    nodeManagerAccess.selectNode(null, false);
    connectionManagerAccess.selectConnection(null);
    setSelectedDefinedAreaId(areaId);
    definedAreaManagerHook.bringAreaToTop(areaId); 
  }, [appUIManager, nodeManagerAccess, connectionManagerAccess, definedAreaManagerHook]);

  const selectedDefinedAreaForInspector = useMemo(() => {
    if (!selectedDefinedAreaId) return null;
    return definedAreaManagerHook.definedAreas.find(a => a.id === selectedDefinedAreaId) || null;
  }, [selectedDefinedAreaId, definedAreaManagerHook.definedAreas]);

  return {
    isDefiningAreaActive,
    selectedDefinedAreaId,
    selectedDefinedAreaForInspector,
    appHandleStartDefiningArea,
    appHandleEndDefiningArea,
    appHandleUpdateDefinedArea,
    appHandleDeleteDefinedArea,
    appHandleCreateAreaFromSelectedNodes,
    handleShowPropertiesForDefinedArea,
    clearSelectedDefinedArea,
    addDefinedAreaDirectlyAndCommitHistory,
  };
};
