
import { useState, useEffect, useCallback } from 'react';
import { NodeCategory } from '../nodes/nodeCategories';
// Removed import of getNodeDefinition as it's unused and was causing an error.
import { NodeTypeDefinition } from '../types'; // Import NodeTypeDefinition

interface DropTargetNodeInfo {
  categoryId: string;
  nodeTypeKey: string;
  position: 'before' | 'after';
}

interface DraggingNodeInfo {
  typeKey: string;
  originalCategoryId: string;
}

interface DropTargetCategoryInfo {
  id: string;
  position: 'before' | 'after';
}

interface UseNodeListPanelBehaviorProps {
  initialNodeCategories: NodeCategory[];
  onSelectNodeTypeForPlacement: (nodeTypeKey: string) => void;
  selectedNodeTypeForPlacement: string | null;
  customNodeDefinitions: NodeTypeDefinition[]; // New prop
  getCombinedNodeDefinition: (type: string) => NodeTypeDefinition | undefined; // New prop
}

export const useNodeListPanelBehavior = ({
  initialNodeCategories,
  onSelectNodeTypeForPlacement,
  selectedNodeTypeForPlacement,
  customNodeDefinitions, // Destructure
  getCombinedNodeDefinition, // Destructure
}: UseNodeListPanelBehaviorProps) => {
  const [categories, setCategories] = useState<NodeCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryInfo, setDropTargetCategoryInfo] = useState<DropTargetCategoryInfo | null>(null);

  const [draggingNodeInfo, setDraggingNodeInfo] = useState<DraggingNodeInfo | null>(null);
  const [dropTargetNodeInfo, setDropTargetNodeInfo] = useState<DropTargetNodeInfo | null>(null);

  useEffect(() => {
    let processedCategories = [...initialNodeCategories].map(cat => ({ ...cat })); // Deep copy

    // Find the custom AI nodes category
    const customAiCategoryIndex = processedCategories.findIndex(cat => cat.id === 'custom_ai_nodes');
    if (customAiCategoryIndex !== -1) {
      // Map custom definitions to their type keys and add them
      const customNodeTypeKeys = customNodeDefinitions.map(def => def.type);
      processedCategories[customAiCategoryIndex] = {
        ...processedCategories[customAiCategoryIndex],
        nodeTypeKeys: [...customNodeTypeKeys], // Replace with custom node types
      };
    }

    const sortedCategories = processedCategories.sort((a, b) => a.order - b.order);
    setCategories(sortedCategories);

    const initialExpandedState: Record<string, boolean> = {};
    sortedCategories.forEach(cat => {
      initialExpandedState[cat.id] = true; // Default to expanded
    });
    setExpandedCategories(initialExpandedState);
  }, [initialNodeCategories, customNodeDefinitions]);


  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleCategoryDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, categoryId: string) => {
    event.dataTransfer.setData('application/category-id', categoryId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingCategoryId(categoryId);
  }, []);

  const handleCategoryDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>, targetCategoryId: string) => {
    // No specific logic needed here for now, dragOver handles visuals
  }, []);

  const handleCategoryDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, targetCategoryId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (draggingCategoryId && draggingCategoryId !== targetCategoryId) {
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      const mouseY = event.clientY;
      const midY = rect.top + rect.height / 2;
      const position = mouseY < midY ? 'before' : 'after';

      if (!dropTargetCategoryInfo || dropTargetCategoryInfo.id !== targetCategoryId || dropTargetCategoryInfo.position !== position) {
        setDropTargetCategoryInfo({ id: targetCategoryId, position });
      }
    } else if (draggingNodeInfo) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetCategoryInfo) {
        setDropTargetCategoryInfo(null);
      }
    } else {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetCategoryInfo && dropTargetCategoryInfo.id === targetCategoryId) {
        setDropTargetCategoryInfo(null);
      }
    }
  }, [draggingCategoryId, draggingNodeInfo, dropTargetCategoryInfo]);

  const handleCategoryDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>, categoryIdLeaving: string) => {
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget as Node | null;

    if (!currentTarget.contains(relatedTarget)) {
      if (dropTargetCategoryInfo && dropTargetCategoryInfo.id === categoryIdLeaving) {
        setDropTargetCategoryInfo(null);
      }
    }
  }, [dropTargetCategoryInfo]);

  const handleCategoryDrop = useCallback((event: React.DragEvent<HTMLDivElement>, droppedOnCategoryId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedIdFromData = event.dataTransfer.getData('application/category-id');

    if (!draggingCategoryId) {
      if (dropTargetCategoryInfo) setDropTargetCategoryInfo(null);
      return;
    }

    const finalDraggedId = draggingCategoryId;

    if (finalDraggedId === droppedOnCategoryId) {
      setDraggingCategoryId(null);
      setDropTargetCategoryInfo(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    const midY = rect.top + rect.height / 2;
    const positionOnDrop = mouseY < midY ? 'before' : 'after';

    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      const draggedItemIndex = newCategories.findIndex(cat => cat.id === finalDraggedId);

      if (draggedItemIndex === -1) {
        return prevCategories;
      }

      const [draggedItem] = newCategories.splice(draggedItemIndex, 1);
      let targetItemIndex = newCategories.findIndex(cat => cat.id === droppedOnCategoryId);

      if (targetItemIndex === -1) {
        return prevCategories;
      }

      let insertionIndex = targetItemIndex;
      if (positionOnDrop === 'after') {
        insertionIndex = targetItemIndex + 1;
      }

      newCategories.splice(insertionIndex, 0, draggedItem);
      const finalCategories = newCategories.map((cat, index) => ({ ...cat, order: index + 1 }));
      return finalCategories;
    });

    setDraggingCategoryId(null);
    setDropTargetCategoryInfo(null);
  }, [draggingCategoryId]);

  const handleCategoryDragEnd = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    setDraggingCategoryId(null);
    setDropTargetCategoryInfo(null);
  }, []);

  const handleNodeDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, nodeTypeKey: string, originalCatId: string) => {
    if (selectedNodeTypeForPlacement === nodeTypeKey) {
      onSelectNodeTypeForPlacement(nodeTypeKey);
    }
    event.dataTransfer.setData('application/reactflow-node-type', nodeTypeKey);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingNodeInfo({ typeKey: nodeTypeKey, originalCategoryId: originalCatId });
  }, [selectedNodeTypeForPlacement, onSelectNodeTypeForPlacement]);

  const handleNodeDragEnd = useCallback(() => {
    setDraggingNodeInfo(null);
    setDropTargetNodeInfo(null);
  }, []);

  const handleNodeListItemDragOver = useCallback((event: React.DragEvent<HTMLLIElement>, targetCategoryId: string, targetNodeTypeKey: string) => {
    event.preventDefault();

    if (draggingCategoryId) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetNodeInfo) setDropTargetNodeInfo(null);
      return;
    }

    if (!draggingNodeInfo) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetNodeInfo) setDropTargetNodeInfo(null);
      return;
    }

    if (draggingNodeInfo.originalCategoryId !== targetCategoryId) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetNodeInfo) setDropTargetNodeInfo(null);
      return;
    }
    if (draggingNodeInfo.typeKey === targetNodeTypeKey) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetNodeInfo) setDropTargetNodeInfo(null);
      return;
    }

    event.dataTransfer.dropEffect = 'move';
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    const midY = rect.top + rect.height / 2;
    const position = mouseY < midY ? 'before' : 'after';

    if (!dropTargetNodeInfo || dropTargetNodeInfo.categoryId !== targetCategoryId || dropTargetNodeInfo.nodeTypeKey !== targetNodeTypeKey || dropTargetNodeInfo.position !== position) {
      setDropTargetNodeInfo({ categoryId: targetCategoryId, nodeTypeKey: targetNodeTypeKey, position });
    }
  }, [draggingCategoryId, draggingNodeInfo, dropTargetNodeInfo]);

  const handleNodeListItemDragLeave = useCallback((event: React.DragEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTargetNodeInfo(null);
    }
  }, []);

  const handleNodeListItemDrop = useCallback((event: React.DragEvent<HTMLLIElement>, targetCategoryId: string, targetNodeTypeKey: string) => {
    event.preventDefault();

    if (draggingCategoryId) {
      if (dropTargetNodeInfo) setDropTargetNodeInfo(null);
      return;
    }
    
    if (!draggingNodeInfo) { 
      setDropTargetNodeInfo(null);
      return;
    }
    
    event.stopPropagation();


    if (event.dataTransfer.getData('application/reactflow-node-type') !== draggingNodeInfo.typeKey) {
      setDropTargetNodeInfo(null);
      setDraggingNodeInfo(null);
      return;
    }
    const draggedKey = draggingNodeInfo.typeKey;

    if (draggedKey === targetNodeTypeKey && draggingNodeInfo.originalCategoryId === targetCategoryId) {
      setDraggingNodeInfo(null);
      setDropTargetNodeInfo(null);
      return;
    }
    if (draggingNodeInfo.originalCategoryId !== targetCategoryId) {
      setDraggingNodeInfo(null);
      setDropTargetNodeInfo(null);
      return;
    }

    const dropPosition = dropTargetNodeInfo?.position || 'before';

    setCategories(prevCategories => {
      return prevCategories.map(cat => {
        if (cat.id === targetCategoryId) {
          const originalKeys = [...cat.nodeTypeKeys];
          const tempKeys = originalKeys.filter(key => key !== draggedKey);
          
          if (tempKeys.length === originalKeys.length && !originalKeys.includes(draggedKey)) { 
             return cat;
          } else if (tempKeys.length === originalKeys.length && originalKeys.includes(draggedKey)) {
            // Should not happen if filter is correct
          }


          let targetItemIndexInTempKeys = tempKeys.indexOf(targetNodeTypeKey);
          let insertionIndex;

          if (targetItemIndexInTempKeys === -1) {
             insertionIndex = dropPosition === 'after' ? tempKeys.length : 0;
          } else {
            insertionIndex = dropPosition === 'after' ? targetItemIndexInTempKeys + 1 : targetItemIndexInTempKeys;
          }

          const finalKeys = [...tempKeys];
          finalKeys.splice(insertionIndex, 0, draggedKey);

          return { ...cat, nodeTypeKeys: finalKeys };
        }
        return cat;
      });
    });
    setDraggingNodeInfo(null);
    setDropTargetNodeInfo(null);
  }, [draggingCategoryId, draggingNodeInfo, dropTargetNodeInfo]);

  return {
    categories,
    expandedCategories,
    draggingCategoryId,
    dropTargetCategoryInfo,
    draggingNodeInfo,
    dropTargetNodeInfo,
    toggleCategory,
    handleCategoryDragStart,
    handleCategoryDragEnter,
    handleCategoryDragOver,
    handleCategoryDragLeave,
    handleCategoryDrop,
    handleCategoryDragEnd,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleNodeListItemDragOver,
    handleNodeListItemDragLeave,
    handleNodeListItemDrop,
  };
};
