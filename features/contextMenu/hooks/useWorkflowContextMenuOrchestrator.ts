
import React, { useCallback } from 'react';
import { Node } from '../../../types';
import { DefinedArea } from '../../areaDefinition/types/areaDefinitionTypes';
import { ContextMenuItem } from '../../../components/ContextMenu/contextMenuTypes'; // Corrected import path
import { buildContextMenuItems } from '../contextMenuUtils';
import { SelectConnectionOptions } from '../../connections/hooks/useConnectionManager'; // Added import

interface UseWorkflowContextMenuOrchestratorProps {
  openContextMenu: (event: React.MouseEvent, items: ContextMenuItem[]) => void;
  canPaste: boolean;
  onCopyNode: (nodeId?: string) => void;
  onCutNode: (nodeId?: string) => void;
  onPasteNode: (worldX?: number, worldY?: number) => void;
  onDelete: (ids?: { nodeId?: string; connectionId?: string }, menuTargetId?: string) => void;
  onShowProperties: (type: 'node' | 'connection' | 'canvas' | 'defined-area', id?: string) => void; 
  onSelectNode: (nodeId: string | null, shiftKey?: boolean) => void;
  onSelectConnection: (connectionId: string | null, options?: SelectConnectionOptions) => void;
  getCanvasBoundingClientRect: () => DOMRect | null;
  pan: { x: number; y: number };
  scale: number;
  activeTabId: string | null;
  selectedNodeIds: string[];
  onDeleteDefinedArea?: (areaId: string) => void;
  onCreateAreaFromSelection?: (_event?: any, effectiveSelectedIdsOverride?: string[]) => void;
  onStartDefiningArea?: () => void;
  onCreateNodeGroup?: (_event?: any, effectiveSelectedIdsOverride?: string[]) => void; // Corrected type
}

const getPastePositionForCanvas = (
    event: React.MouseEvent,
    getCanvasBoundingClientRect: () => DOMRect | null,
    pan: { x: number, y: number },
    scale: number
): { x: number, y: number } => {
    const canvasRect = getCanvasBoundingClientRect();
    if (!canvasRect) return { x: 0, y: 0 };
    const clickCanvasX = event.clientX - canvasRect.left;
    const clickCanvasY = event.clientY - canvasRect.top;
    const worldX = (clickCanvasX - pan.x) / scale;
    const worldY = (clickCanvasY - pan.y) / scale;
    return { x: worldX, y: worldY };
};

const calculateEffectiveSelectionCount = (
  currentSelectedIds: string[],
  targetId: string,
  isShiftPressed: boolean
): number => {
  if (isShiftPressed) {
    const isTargetCurrentlySelected = currentSelectedIds.includes(targetId);
    if (isTargetCurrentlySelected) {
      return currentSelectedIds.length;
    } else {
      return currentSelectedIds.length + 1;
    }
  } else {
    return 1;
  }
};


export const useWorkflowContextMenuOrchestrator = (props: UseWorkflowContextMenuOrchestratorProps) => {
  const {
    openContextMenu,
    canPaste,
    onCopyNode,
    onCutNode,
    onPasteNode,
    onDelete,
    onShowProperties,
    onSelectNode,
    onSelectConnection,
    getCanvasBoundingClientRect,
    pan,
    scale,
    activeTabId,
    onDeleteDefinedArea,
    onStartDefiningArea,
  } = props;

  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (activeTabId === null) return;

    const nodesWereSelectedBeforeClear = props.selectedNodeIds.length > 0;
    onSelectNode(null, event.shiftKey);

    const worldPos = getPastePositionForCanvas(event, getCanvasBoundingClientRect, pan, scale);

    const items = buildContextMenuItems({
      type: 'canvas',
      canPaste,
      actions: {
        onPaste: () => onPasteNode(worldPos.x, worldPos.y),
        onShowProperties: (type, id) => onShowProperties(type as 'canvas', id), 
        onStartDefiningArea: onStartDefiningArea,
        onCreateNodeGroup: props.onCreateNodeGroup ? (_evt, ids) => props.onCreateNodeGroup!(undefined, []) : undefined, 
      },
      currentSelectedNodeIdsCount: 0, 
    });
    openContextMenu(event, items);
  }, [
      activeTabId, getCanvasBoundingClientRect, pan, scale, canPaste, onPasteNode,
      onShowProperties, openContextMenu, onSelectNode, props.selectedNodeIds,
      onStartDefiningArea, props.onCreateNodeGroup
    ]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeTabId === null) return;

    onSelectNode(node.id, event.shiftKey);
    const targetIdInScope = node.id;

    let effectiveSelectedNodeIds: string[];
    if (event.shiftKey) {
      let tempSelectedIds = [...props.selectedNodeIds]; 
      if (!tempSelectedIds.includes(targetIdInScope)) { 
        tempSelectedIds.push(targetIdInScope); 
      }
      effectiveSelectedNodeIds = tempSelectedIds;
    } else {
      effectiveSelectedNodeIds = [targetIdInScope];
    }
    const effectiveCount = effectiveSelectedNodeIds.length;


    const items = buildContextMenuItems({
      type: 'node',
      targetId: targetIdInScope,
      canPaste, 
      actions: {
        onCopy: () => onCopyNode(targetIdInScope),
        onCut: () => onCutNode(targetIdInScope),
        onDelete: () => onDelete({ nodeId: targetIdInScope }, targetIdInScope),
        onShowProperties: (type, id) => {
          onShowProperties(type as 'node', id); 
        },
        onCreateAreaFromSelection: props.onCreateAreaFromSelection
          ? () => props.onCreateAreaFromSelection!(undefined, effectiveSelectedNodeIds)
          : undefined,
        onCreateNodeGroup: props.onCreateNodeGroup
          ? (_evt, _ids) => props.onCreateNodeGroup!(undefined, effectiveSelectedNodeIds) 
          : undefined,
      },
      currentSelectedNodeIdsCount: effectiveCount, 
    });
    openContextMenu(event, items);
  }, [
    activeTabId, onSelectNode, canPaste, onCopyNode, onCutNode, onDelete, onShowProperties,
    openContextMenu, props.selectedNodeIds, props.onCreateAreaFromSelection, props.onCreateNodeGroup
  ]);

  const handleConnectionContextMenu = useCallback((event: React.MouseEvent, connectionId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeTabId === null) return;

    onSelectConnection(connectionId, { isContextMenu: true }); 
    const targetIdInScope = connectionId;

    const items = buildContextMenuItems({
      type: 'connection',
      targetId: targetIdInScope,
      canPaste: false,
      actions: {
        onDelete: () => onDelete({ connectionId: targetIdInScope }, targetIdInScope),
        onShowProperties: (type, id) => onShowProperties(type as 'connection', id), 
      }
    });
    openContextMenu(event, items);
  }, [activeTabId, onSelectConnection, onDelete, onShowProperties, openContextMenu]);

  const handleDefinedAreaContextMenu = useCallback((event: React.MouseEvent, area: DefinedArea) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeTabId === null) return;

    const areaSpecificItems = buildContextMenuItems({
      type: 'defined-area',
      targetId: area.id,
      canPaste: false,
      actions: {
        onShowProperties: (type, id) => onShowProperties('defined-area', id), 
        onDeleteDefinedArea: onDeleteDefinedArea ? () => onDeleteDefinedArea(area.id) : undefined,
      }
    });

    const canvasPropertiesItem = buildContextMenuItems({
        type: 'canvas',
        canPaste: false,
        actions: {
            onShowProperties: (_type, _id) => onShowProperties('canvas', undefined) 
        }
    }).find(item => item.id === 'properties-canvas');


    const finalItems = [...areaSpecificItems];
    if (canvasPropertiesItem) {
      if (finalItems.length > 0 && !finalItems[finalItems.length -1].isSeparator && areaSpecificItems.some(it => !it.isSeparator)) {
        finalItems.push({ id: 'sep-area-canvas-props', isSeparator: true, label: '', onClick: () => {} });
      }
      finalItems.push(canvasPropertiesItem);
    }

    const cleanedFinalItems = finalItems.reduce((acc, current) => {
        if (current.isSeparator && (acc.length === 0 || acc[acc.length - 1].isSeparator)) {
            return acc;
        }
        acc.push(current);
        return acc;
    }, [] as ContextMenuItem[]);
    if (cleanedFinalItems.length > 0 && cleanedFinalItems[cleanedFinalItems.length - 1].isSeparator) {
        cleanedFinalItems.pop();
    }

    openContextMenu(event, cleanedFinalItems);
  }, [activeTabId, onShowProperties, onDeleteDefinedArea, openContextMenu]);

  return {
    handleCanvasContextMenu,
    handleNodeContextMenu,
    handleConnectionContextMenu,
    handleDefinedAreaContextMenu,
  };
};