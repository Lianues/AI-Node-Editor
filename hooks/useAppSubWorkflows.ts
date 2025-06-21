
import { useState, useCallback } from 'react';
import { SubWorkflowItem } from '../features/subworkflows/types/subWorkflowTypes';

export interface UseAppSubWorkflowsOutput {
  subWorkflows: SubWorkflowItem[];
  addNewSubWorkflowItem: () => SubWorkflowItem;
  updateSubWorkflowName: (id: string, newName: string) => void;
  updateSubWorkflowDescription: (id: string, newDescription: string) => void;
  handleDragStartSubWorkflow: (event: React.DragEvent<HTMLDivElement>, subWorkflowId: string) => void;
  commitSubWorkflowChanges: (subWorkflowId: string) => void; 
  revertSubWorkflow: (subWorkflowId: string) => void;      
}

export const useAppSubWorkflows = (): UseAppSubWorkflowsOutput => {
  const [subWorkflows, setSubWorkflows] = useState<SubWorkflowItem[]>([]);
  const [subWorkflowOriginalStates, setSubWorkflowOriginalStates] = useState<Map<string, { name: string; description: string }>>(new Map());

  const generateNewSubWorkflowName = useCallback((): string => {
    const basePrefix = "子程序";
    let nextNumber = 1;
    const relevantSubWorkflows = subWorkflows.filter(sw => sw.name.startsWith(basePrefix + " "));
    
    if (relevantSubWorkflows.length > 0) {
      const existingNumbers = relevantSubWorkflows.map(sw => {
        const match = sw.name.match(new RegExp(`^${basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
      }).filter(num => num > 0);
      
      if (existingNumbers.length > 0) {
        nextNumber = Math.max(0, ...existingNumbers) + 1;
      } else {
        // This case means all items starting with "子程序 " don't have a number after it,
        // or the numbers are invalid. Start from relevantSubWorkflows.length + 1 or subWorkflows.length + 1
        nextNumber = Math.max(relevantSubWorkflows.length, subWorkflows.length) + 1;
      }
    } else {
      // No subworkflows like "子程序 N" exist.
      // Check if there are ANY subworkflows. If so, count them.
      if (subWorkflows.length > 0) {
        nextNumber = subWorkflows.length + 1;
      } else {
        nextNumber = 1; // First subworkflow
      }
    }

    // Ensure unique name by incrementing if the generated name already exists
    let candidateName = `${basePrefix} ${nextNumber}`;
    while(subWorkflows.some(sw => sw.name === candidateName)) {
        nextNumber++;
        candidateName = `${basePrefix} ${nextNumber}`;
    }
    
    return candidateName;
  }, [subWorkflows]);

  const addNewSubWorkflowItem = useCallback((): SubWorkflowItem => {
    const newName = generateNewSubWorkflowName();
    const newDescription = ""; 
    const newSubWorkflow: SubWorkflowItem = {
      id: `subworkflow_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newName,
      description: newDescription, 
      inputs: [], 
      outputs: [], 
    };
    setSubWorkflows(prev => [...prev, newSubWorkflow]);
    // Store initial state as the "original" for potential revert before first save
    setSubWorkflowOriginalStates(prevMap => {
      const newMap = new Map(prevMap);
      newMap.set(newSubWorkflow.id, { name: newName, description: newDescription });
      return newMap;
    });
    return newSubWorkflow;
  }, [generateNewSubWorkflowName]);

  const updateSubWorkflowName = useCallback((id: string, newName: string) => {
    setSubWorkflows(prev =>
      prev.map(sw => (sw.id === id ? { ...sw, name: newName.trim() } : sw))
    );
    // Note: Marking as unsaved is handled by the caller (e.g., SubWorkflowProperties via orchestrator)
  }, []);

  const updateSubWorkflowDescription = useCallback((id: string, newDescription: string) => {
    setSubWorkflows(prev =>
      prev.map(sw => (sw.id === id ? { ...sw, description: newDescription } : sw))
    );
    // Note: Marking as unsaved is handled by the caller
  }, []);

  const commitSubWorkflowChanges = useCallback((subWorkflowId: string) => {
    const currentSubWorkflow = subWorkflows.find(sw => sw.id === subWorkflowId);
    if (currentSubWorkflow) {
      setSubWorkflowOriginalStates(prevMap => {
        const newMap = new Map(prevMap);
        newMap.set(subWorkflowId, { name: currentSubWorkflow.name, description: currentSubWorkflow.description || "" });
        // console.log(`[AppSubWorkflows] Committed changes for ${subWorkflowId}. Original state updated to:`, newMap.get(subWorkflowId));
        return newMap;
      });
    }
  }, [subWorkflows]);

  const revertSubWorkflow = useCallback((subWorkflowId: string) => {
    const originalState = subWorkflowOriginalStates.get(subWorkflowId);
    if (originalState) {
      // console.log(`[AppSubWorkflows] Reverting subworkflow ${subWorkflowId} to:`, originalState);
      setSubWorkflows(prev =>
        prev.map(sw =>
          sw.id === subWorkflowId
            ? { ...sw, name: originalState.name, description: originalState.description }
            : sw
        )
      );
    } else {
      console.warn(`[AppSubWorkflows] No original state found for subworkflow ${subWorkflowId} to revert.`);
    }
  }, [subWorkflowOriginalStates]);


  const handleDragStartSubWorkflow = useCallback((event: React.DragEvent<HTMLDivElement>, subWorkflowId: string) => {
    // console.log("Dragging subworkflow (placeholder in useAppSubWorkflows):", subWorkflowId);
  }, []);

  return {
    subWorkflows,
    addNewSubWorkflowItem,
    updateSubWorkflowName,
    updateSubWorkflowDescription,
    handleDragStartSubWorkflow,
    commitSubWorkflowChanges,
    revertSubWorkflow,
  };
};
