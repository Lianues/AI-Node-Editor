

import { useState, useCallback } from 'react';
import { Node, PortDataType } from '../../../types'; // Added Node, PortDataType
import { SubWorkflowItem, SubWorkflowInputOutputDefinition } from '../types/subWorkflowTypes'; // Updated import path
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';

export interface InterfaceUpdateResult {
  subWorkflowId: string;
  newInputs: SubWorkflowInputOutputDefinition[];
  newOutputs: SubWorkflowInputOutputDefinition[];
}
export interface UseAppSubWorkflowsOutput {
  subWorkflows: SubWorkflowItem[];
  setSubWorkflows: React.Dispatch<React.SetStateAction<SubWorkflowItem[]>>; // Expose setter
  addNewSubWorkflowItem: () => SubWorkflowItem;
  updateSubWorkflowName: (id: string, newName: string) => void;
  updateSubWorkflowDescription: (id: string, newDescription: string) => void;
  updateSubWorkflowInterfaceFromNodes: (subWorkflowId: string, nodesInSubWorkflow: Node[]) => InterfaceUpdateResult | null; 
  handleDragStartSubWorkflow: (event: React.DragEvent<HTMLDivElement>, subWorkflowId: string) => void;
  commitSubWorkflowChanges: (subWorkflowId: string) => void; 
  revertSubWorkflow: (subWorkflowId: string) => void;  
  reorderSubWorkflowItem: (draggedItemId: string, targetItemId: string, position: 'before' | 'after') => void; 
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
        nextNumber = Math.max(relevantSubWorkflows.length, subWorkflows.length) + 1;
      }
    } else {
      if (subWorkflows.length > 0) {
        nextNumber = subWorkflows.length + 1;
      } else {
        nextNumber = 1; 
      }
    }

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
    // Prepend the new subworkflow to the beginning of the array
    setSubWorkflows(prev => [newSubWorkflow, ...prev]);
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
  }, []);

  const updateSubWorkflowDescription = useCallback((id: string, newDescription: string) => {
    setSubWorkflows(prev =>
      prev.map(sw => (sw.id === id ? { ...sw, description: newDescription } : sw))
    );
  }, []);

  const updateSubWorkflowInterfaceFromNodes = useCallback((subWorkflowId: string, nodesInSubWorkflow: Node[]): InterfaceUpdateResult | null => {
    const subWorkflowToUpdate = subWorkflows.find(sw => sw.id === subWorkflowId);
    if (!subWorkflowToUpdate) {
      return null;
    }

    const newInputsDef: SubWorkflowInputOutputDefinition[] = [];
    const newOutputsDef: SubWorkflowInputOutputDefinition[] = [];

    nodesInSubWorkflow.forEach(node => {
      if (node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY) {
        const outputPort = node.outputs && node.outputs.length > 0 ? node.outputs[0] : null;
        newInputsDef.push({
          id: node.id, 
          name: node.data?.portName || outputPort?.label || 'Input',
          dataType: node.data?.portDataType || outputPort?.dataType || PortDataType.ANY,
          isRequired: node.data?.isPortRequired || false,
        });
      } else if (node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY) {
        const inputPort = node.inputs && node.inputs.length > 0 ? node.inputs[0] : null;
        newOutputsDef.push({
          id: node.id, 
          name: node.data?.portName || inputPort?.label || 'Output',
          dataType: node.data?.portDataType || inputPort?.dataType || PortDataType.ANY,
          isRequired: node.data?.isPortRequired || false,
        });
      }
    });
    
    const sortPortsById = (ports: SubWorkflowInputOutputDefinition[]) => ports.slice().sort((a, b) => a.id.localeCompare(b.id));

    const currentInputsSorted = sortPortsById(subWorkflowToUpdate.inputs);
    const newInputsSorted = sortPortsById(newInputsDef);
    const currentOutputsSorted = sortPortsById(subWorkflowToUpdate.outputs);
    const newOutputsSorted = sortPortsById(newOutputsDef);

    const inputsChanged = JSON.stringify(currentInputsSorted) !== JSON.stringify(newInputsSorted);
    const outputsChanged = JSON.stringify(currentOutputsSorted) !== JSON.stringify(newOutputsSorted);

    if (inputsChanged || outputsChanged) {
      setSubWorkflows(prev =>
        prev.map(sw =>
          sw.id === subWorkflowId ? { ...sw, inputs: newInputsDef, outputs: newOutputsDef } : sw
        )
      );
      return { subWorkflowId, newInputs: newInputsDef, newOutputs: newOutputsDef }; 
    }
    return null; 
  }, [subWorkflows]); 


  const commitSubWorkflowChanges = useCallback((subWorkflowId: string) => {
    const currentSubWorkflow = subWorkflows.find(sw => sw.id === subWorkflowId);
    if (currentSubWorkflow) {
      setSubWorkflowOriginalStates(prevMap => {
        const newMap = new Map(prevMap);
        newMap.set(subWorkflowId, { name: currentSubWorkflow.name, description: currentSubWorkflow.description || "" });
        return newMap;
      });
    }
  }, [subWorkflows]);

  const revertSubWorkflow = useCallback((subWorkflowId: string) => {
    const originalState = subWorkflowOriginalStates.get(subWorkflowId);
    if (originalState) {
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

  const reorderSubWorkflowItem = useCallback((draggedItemId: string, targetItemId: string, position: 'before' | 'after') => {
    setSubWorkflows(prevItems => {
      const newItems = [...prevItems];
      const draggedItemIndex = newItems.findIndex(item => item.id === draggedItemId);
      if (draggedItemIndex === -1) return prevItems;

      const [draggedItem] = newItems.splice(draggedItemIndex, 1);
      let targetItemIndex = newItems.findIndex(item => item.id === targetItemId);
      if (targetItemIndex === -1) return prevItems; // Should not happen

      if (position === 'before') {
        newItems.splice(targetItemIndex, 0, draggedItem);
      } else {
        newItems.splice(targetItemIndex + 1, 0, draggedItem);
      }
      return newItems;
    });
  }, []);


  const handleDragStartSubWorkflow = useCallback((event: React.DragEvent<HTMLDivElement>, subWorkflowId: string) => {
    // This function is primarily for dragging onto the canvas, which is handled by the panel itself.
    // The reordering drag start is also handled by the panel.
  }, []);

  return {
    subWorkflows,
    setSubWorkflows, // Expose setter
    addNewSubWorkflowItem,
    updateSubWorkflowName,
    updateSubWorkflowDescription,
    updateSubWorkflowInterfaceFromNodes,
    handleDragStartSubWorkflow,
    commitSubWorkflowChanges,
    revertSubWorkflow,
    reorderSubWorkflowItem, // Expose new function
  };
};
