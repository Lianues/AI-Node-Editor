
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Node, NodeTypeDefinition, NodePort, NodeExecutionState, PortDataType } from '../../../types';
// Removed static import: import { ALL_NODE_DEFINITIONS, DEFAULT_NODE_TYPE_FALLBACK_KEY, getStaticNodeDefinition as getNodeDefinition } from '../../../nodes';
import { calculateNodeHeight } from '../../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../../components/renderingConstants';
import { FINITE_CHOICE_NODE_TYPE_KEY } from '../../../nodes/FiniteChoiceNode/Definition'; 
import { DEFAULT_NODE_TYPE_FALLBACK_KEY } from '../../../nodes';
import { DATA_SYNCHRONIZATION_NODE_TYPE_KEY } from '../../../nodes/DataSynchronizationNode/Definition';
import { DATA_DELAY_NODE_TYPE_KEY } from '../../../nodes/DataDelayNode/Definition'; // New import


interface UseNodeManagerProps {
  onNodeSelected: (primaryNodeId: string | null, nodeTypeToPlaceCleared: boolean) => void;
  onBeforeNodeDeleted: (nodeId: string) => void;
  onNodeTypeToPlaceChanged: (typeKey: string | null) => void;
  onNodeDataUpdated: (nodeId: string, nodeTitle: string, propertyKey: string, oldValue: any, newValue: any) => void;
  onDeselectConnections: () => void; 
  getNodeDefinition: (type: string) => NodeTypeDefinition | undefined; // Added prop
}

const compareAndReportChanges = (
  basePath: string,
  oldObj: Record<string, any> | undefined | null,
  newObj: Record<string, any> | undefined | null,
  nodeId: string,
  nodeTitle: string,
  reportUpdate: (nodeId: string, nodeTitle: string, propertyKey: string, oldValue: any, newValue: any) => void
) => {
  const oldObjectSafe = oldObj || {};
  const newObjectSafe = newObj || {};
  const allKeys = new Set([...Object.keys(oldObjectSafe), ...Object.keys(newObjectSafe)]);

  for (const key of allKeys) {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    const oldValue = oldObjectSafe[key];
    const newValue = newObjectSafe[key];

    const oldValueIsObject = typeof oldValue === 'object' && oldValue !== null;
    const newValueIsObject = typeof newValue === 'object' && newValue !== null;

    if (oldValueIsObject && newValueIsObject) {
      if (!Array.isArray(oldValue) && !Array.isArray(newValue)) {
        compareAndReportChanges(currentPath, oldValue, newValue, nodeId, nodeTitle, reportUpdate);
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) { // Compare arrays/objects by stringification
        reportUpdate(nodeId, nodeTitle, currentPath, oldValue, newValue);
      }
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) { // Compare primitives and null/undefined
      reportUpdate(nodeId, nodeTitle, currentPath, oldValue, newValue);
    }
  }
};


export const useNodeManager = ({
  onNodeSelected,
  onBeforeNodeDeleted,
  onNodeTypeToPlaceChanged,
  onNodeDataUpdated,
  onDeselectConnections,
  getNodeDefinition, // Destructure the new prop
}: UseNodeManagerProps) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNodeIds, _setSelectedNodeIdsInternal] = useState<string[]>([]); 
  const [primarySelectedNodeId, setPrimarySelectedNodeIdInternal] = useState<string | null>(null); 
  const [nodeTypeToPlace, setNodeTypeToPlace] = useState<string | null>(null);

  const selectNode = useCallback((nodeId: string | null, shiftKey: boolean = false) => {
    let nodeTypeToPlaceClearedDueToSelection = false;

    _setSelectedNodeIdsInternal(currentInternalSelectedIds => {
      let newSelectedIdsArray: string[];

      if (shiftKey && nodeId) {
        let tempSelectedIds = [...currentInternalSelectedIds];
        if (tempSelectedIds.includes(nodeId)) {
          tempSelectedIds = tempSelectedIds.filter(id => id !== nodeId);
          tempSelectedIds.push(nodeId);
        } else {
          tempSelectedIds.push(nodeId);
        }
        newSelectedIdsArray = tempSelectedIds;
      } else if (nodeId) { 
        newSelectedIdsArray = [nodeId];
      } else { 
        newSelectedIdsArray = [];
      }
      
      const newPrimaryId = newSelectedIdsArray.length > 0 ? newSelectedIdsArray[newSelectedIdsArray.length - 1] : null;

      let callOnNodeSelectedUpdater = false;
      if (primarySelectedNodeId !== newPrimaryId || 
          JSON.stringify(currentInternalSelectedIds) !== JSON.stringify(newSelectedIdsArray)) {
        callOnNodeSelectedUpdater = true;
      }
      
      if (newSelectedIdsArray.length > 0 && nodeTypeToPlace) {
        nodeTypeToPlaceClearedDueToSelection = true;
        callOnNodeSelectedUpdater = true; 
      }

      if (callOnNodeSelectedUpdater) {
        onNodeSelected(newPrimaryId, nodeTypeToPlaceClearedDueToSelection);
      }
      
      if (primarySelectedNodeId !== newPrimaryId) {
          setPrimarySelectedNodeIdInternal(newPrimaryId);
      }
      
      return newSelectedIdsArray;
    });

    if (nodeId && nodeTypeToPlace) { 
        setNodeTypeToPlace(null); 
        onNodeTypeToPlaceChanged(null);
    }
    
    if (nodeId) { 
      onDeselectConnections();
    }

  }, [primarySelectedNodeId, nodeTypeToPlace, onNodeSelected, onNodeTypeToPlaceChanged, onDeselectConnections]);

  const addNodesToSelection = useCallback((nodeIdsToAdd: string[]) => {
    _setSelectedNodeIdsInternal(prevSelectedIds => {
      const currentSelection = new Set(prevSelectedIds);
      nodeIdsToAdd.forEach(id => currentSelection.add(id));
      const newSelectedArray = Array.from(currentSelection);
  
      const newPrimaryId = newSelectedArray.length > 0 ? newSelectedArray[newSelectedArray.length - 1] : null;
  
      if (primarySelectedNodeId !== newPrimaryId || JSON.stringify(prevSelectedIds) !== JSON.stringify(newSelectedArray)) {
        onNodeSelected(newPrimaryId, false); 
      }
      if (primarySelectedNodeId !== newPrimaryId) {
        setPrimarySelectedNodeIdInternal(newPrimaryId);
      }
      return newSelectedArray;
    });
  }, [primarySelectedNodeId, onNodeSelected]);


  const selectNodeTypeForPlacement = useCallback((typeKey: string | null) => {
    const newTypeKey = nodeTypeToPlace === typeKey ? null : typeKey;
    setNodeTypeToPlace(newTypeKey);
    if (newTypeKey) {
      _setSelectedNodeIdsInternal([]); 
      setPrimarySelectedNodeIdInternal(null);
      onNodeSelected(null, false); 
      onDeselectConnections();
    }
    onNodeTypeToPlaceChanged(newTypeKey);
  }, [nodeTypeToPlace, onNodeTypeToPlaceChanged, onNodeSelected, onDeselectConnections]);

  const addNode = useCallback((
    nodeTypeKeyParam?: string,
    position?: { x: number; y: number },
    existingNodeData?: Partial<Node>, 
    skipSelection?: boolean 
  ) => {
    const typeKeyToUse = existingNodeData?.type || nodeTypeKeyParam || nodeTypeToPlace || DEFAULT_NODE_TYPE_FALLBACK_KEY;
    const definition = getNodeDefinition(typeKeyToUse); // Use prop

    if (!definition) {
      if (nodeTypeToPlace === typeKeyToUse && !skipSelection) { 
        setNodeTypeToPlace(null);
        onNodeTypeToPlaceChanged(null);
      }
      return null;
    }
    
    let baseNodeData: Partial<Node> = {};
    if (existingNodeData) {
        baseNodeData = { ...existingNodeData };
        if (definition.defaultData && !existingNodeData.data) { 
            baseNodeData.data = { ...definition.defaultData, ...(existingNodeData.data || {}) };
        } else if (existingNodeData.data) {
            baseNodeData.data = existingNodeData.data;
        } else {
            baseNodeData.data = { ...(definition.defaultData || {}) };
        }
        baseNodeData.inputs = existingNodeData.inputs || definition.inputs.map(p => ({...p}));
        baseNodeData.outputs = existingNodeData.outputs || definition.outputs.map(p => ({...p}));
    } else {
        baseNodeData = {
            title: definition.defaultTitle,
            type: definition.type,
            inputs: definition.inputs.map(p => ({...p})),
            outputs: definition.outputs.map(p => ({...p})),
            headerColor: definition.headerColor,
            bodyColor: definition.bodyColor,
            width: definition.width,
            data: { ...(definition.defaultData || {}) },
        };
    }

    if (definition.type === FINITE_CHOICE_NODE_TYPE_KEY && (!baseNodeData.data || !baseNodeData.data.portConfigs)) {
      baseNodeData.data = { ...(baseNodeData.data || {}), portConfigs: {} };
    }
    // For DataDelayNode, ensure portDelayTimes is initialized for default ports if not present
    if (definition.type === DATA_DELAY_NODE_TYPE_KEY && (!baseNodeData.data || !baseNodeData.data.portDelayTimes)) {
      const initialDelayTimes: Record<string, number> = {};
      (baseNodeData.inputs || definition.inputs).forEach(inputPort => {
        if (inputPort.dataType !== PortDataType.FLOW) {
          initialDelayTimes[inputPort.id] = 1000; // Default delay
        }
      });
      baseNodeData.data = { ...(baseNodeData.data || {}), portDelayTimes: initialDelayTimes };
    }


    let currentInputs = baseNodeData.inputs!; 
    let currentOutputs = baseNodeData.outputs!; 

    const resolvedCustomContentHeight = baseNodeData.hasOwnProperty('customContentHeight') && typeof baseNodeData.customContentHeight === 'number'
        ? baseNodeData.customContentHeight
        : definition.customContentHeight || 0;
    const resolvedCustomContentTitle = baseNodeData.customContentTitle || definition.customContentTitle;

    const nodeWidth = baseNodeData.width ?? definition.width;
    const nodeHeight = baseNodeData.height ?? calculateNodeHeight(currentInputs, currentOutputs, HEADER_HEIGHT, resolvedCustomContentHeight, resolvedCustomContentTitle);

    let finalX: number, finalY: number;
    if (existingNodeData && typeof existingNodeData.x === 'number' && typeof existingNodeData.y === 'number') {
      finalX = existingNodeData.x;
      finalY = existingNodeData.y;
    } else if (position) {
      finalX = position.x - nodeWidth / 2;
      finalY = position.y - nodeHeight / 2;
    } else {
      const nodeGridSpacingX = nodeWidth + 40;
      const nodeGridSpacingY = nodeHeight + 40;
      const nodesPerRow = 5;
      finalX = 50 + (nodes.length % nodesPerRow) * nodeGridSpacingX;
      finalY = 50 + Math.floor(nodes.length / nodesPerRow) * nodeGridSpacingY;
    }
    
    let newNodeId: string;
    if (existingNodeData && existingNodeData.id) {
      newNodeId = existingNodeData.id;
    } else {
      newNodeId = `${definition.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const newNode: Node = {
      id: newNodeId,
      title: baseNodeData.title ?? definition.defaultTitle,
      type: definition.type,
      x: finalX,
      y: finalY,
      width: nodeWidth,
      height: nodeHeight, 
      inputs: currentInputs,
      outputs: currentOutputs,
      headerColor: baseNodeData.headerColor || definition.headerColor,
      bodyColor: baseNodeData.bodyColor || definition.bodyColor,
      data: baseNodeData.data || {},
      executionState: existingNodeData?.executionState || undefined,
      customContentHeight: resolvedCustomContentHeight > 0 ? resolvedCustomContentHeight : undefined,
      customContentTitle: resolvedCustomContentTitle || undefined,
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    
    if (!skipSelection) {
      _setSelectedNodeIdsInternal([newNode.id]);
      setPrimarySelectedNodeIdInternal(newNode.id);
      onNodeSelected(newNode.id, nodeTypeToPlace === typeKeyToUse); 
      onDeselectConnections();
    }

    if (nodeTypeToPlace === typeKeyToUse && !skipSelection) { 
      setNodeTypeToPlace(null);
      onNodeTypeToPlaceChanged(null);
    }
    return newNode;
  }, [nodes, nodeTypeToPlace, onNodeTypeToPlaceChanged, onNodeSelected, onDeselectConnections, getNodeDefinition]);

  const addNodeAtPosition = useCallback((worldX: number, worldY: number) => {
    if (!nodeTypeToPlace) return;
    addNode(nodeTypeToPlace, { x: worldX, y: worldY });
  }, [nodeTypeToPlace, addNode]);

  const addPastedNode = useCallback((nodeDataToPaste: Partial<Node>, position?: {x: number, y: number}) => {
    addNode(undefined, position, nodeDataToPaste, true); 
  }, [addNode]);

  const addNodeOnDrop = useCallback((nodeTypeKey: string, x: number, y: number, overrideData?: Partial<Node>) => {
    addNode(nodeTypeKey, { x, y }, overrideData);
  }, [addNode]);

  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, x, y } : node
      )
    );
  }, []);

  const updateNodeData = useCallback((nodeId: string, updates: Record<string, any>) => {
    setNodes(prevNodes =>
      prevNodes.map(n => {
        if (n.id === nodeId) {
          const oldNode = { ...n }; 
          const newNode = { ...n };
          let structuralChange = false;

          const definitionForUpdate = getNodeDefinition(newNode.type); // Use prop
  
          if (updates.hasOwnProperty('title')) {
            const newTitle = String(updates.title).trim();
            if (newNode.title !== newTitle) {
              newNode.title = newTitle || (definitionForUpdate ? definitionForUpdate.defaultTitle : "Untitled");
              onNodeDataUpdated(nodeId, oldNode.title, 'title', oldNode.title, newNode.title);
            }
          }
          
          const shouldSyncOutputsToInputs = newNode.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY || newNode.type === DATA_DELAY_NODE_TYPE_KEY;

          if (shouldSyncOutputsToInputs && updates.hasOwnProperty('inputs')) {
            const newInputsArray = updates.inputs as NodePort[];
            const completeNewOutputsArray: NodePort[] = [];
            
            newInputsArray.forEach(inPort => {
              let outputPortId = inPort.id; 
              let outputLabelPrefix = "输出: ";
              if (inPort.dataType === PortDataType.FLOW) {
                outputLabelPrefix = "流程输出: ";
              }

              if (inPort.id.startsWith('data_in_')) {
                outputPortId = inPort.id.replace(/^data_in_/, 'data_out_');
              } else if (inPort.id.startsWith('flow_in_')) {
                outputPortId = inPort.id.replace(/^flow_in_/, 'flow_out_');
              }
              
              if (!completeNewOutputsArray.some(op => op.id === outputPortId)) {
                completeNewOutputsArray.push({
                  id: outputPortId,
                  label: `${outputLabelPrefix}${inPort.label}`,
                  dataType: inPort.dataType, // Output dataType matches input dataType
                  shape: inPort.dataType === PortDataType.FLOW ? (inPort.isPortRequired ? 'diamond' : 'circle') : 'circle', 
                  isPortRequired: inPort.isPortRequired, 
                  isDataRequiredOnConnection: inPort.isDataRequiredOnConnection === undefined ? true : inPort.isDataRequiredOnConnection,
                });
              }
            });
            
            completeNewOutputsArray.sort((a, b) => {
                if (a.dataType === PortDataType.FLOW && b.dataType !== PortDataType.FLOW) return 1;
                if (a.dataType !== PortDataType.FLOW && b.dataType === PortDataType.FLOW) return -1;
                return a.label.localeCompare(b.label);
            });

            if (JSON.stringify(newNode.outputs) !== JSON.stringify(completeNewOutputsArray)) {
              newNode.outputs = completeNewOutputsArray;
              structuralChange = true; 
              onNodeDataUpdated(nodeId, newNode.title, 'outputs_derived_from_inputs', oldNode.outputs, newNode.outputs);
            }

            if (newNode.type === DATA_DELAY_NODE_TYPE_KEY) {
              const oldDelayTimes = { ...(oldNode.data?.portDelayTimes || {}) };
              const newDelayTimes: Record<string, number> = {};
              newInputsArray.forEach(inPort => {
                if (inPort.dataType !== PortDataType.FLOW) { // Only for non-flow ports
                  newDelayTimes[inPort.id] = oldDelayTimes[inPort.id] !== undefined ? oldDelayTimes[inPort.id] : 1000;
                }
              });
              if (JSON.stringify(newNode.data?.portDelayTimes || {}) !== JSON.stringify(newDelayTimes)) {
                newNode.data = { ...(newNode.data || {}), portDelayTimes: newDelayTimes };
                 // No direct onNodeDataUpdated call for this specific sub-property change for now,
                 // as the overall 'inputs' change already signals a node update.
                 // If granular history for portDelayTimes is needed, add a compareAndReportChanges call.
              }
            }
          }


          if (updates.hasOwnProperty('inputs') && Array.isArray(updates.inputs)) {
            if (JSON.stringify(newNode.inputs) !== JSON.stringify(updates.inputs)) {
              newNode.inputs = updates.inputs;
              structuralChange = true;
              onNodeDataUpdated(nodeId, newNode.title, 'inputs', oldNode.inputs, newNode.inputs);
            }
          }
          
          if (updates.hasOwnProperty('outputs') && Array.isArray(updates.outputs) && !shouldSyncOutputsToInputs) {
            if (JSON.stringify(newNode.outputs) !== JSON.stringify(updates.outputs)) {
              newNode.outputs = updates.outputs;
              structuralChange = true;
              onNodeDataUpdated(nodeId, newNode.title, 'outputs', oldNode.outputs, newNode.outputs);
            }
          }


          const dataUpdates: Record<string, any> = { ...updates };
          delete dataUpdates.title;
          delete dataUpdates.inputs;
          delete dataUpdates.outputs;
  
          if (Object.keys(dataUpdates).length > 0) {
            const oldNodeDataForComparison = { ...(oldNode.data || {}) };
            const currentNewNodeData = newNode.data ? JSON.parse(JSON.stringify(newNode.data)) : {};
            const tempNewNodeDataWithUpdates = { ...currentNewNodeData };

            if (dataUpdates.portConfigs) {
                tempNewNodeDataWithUpdates.portConfigs = {
                    ...(currentNewNodeData.portConfigs || {}),
                    ...dataUpdates.portConfigs,
                };
                for (const portId in dataUpdates.portConfigs) {
                    if (dataUpdates.portConfigs[portId] === null || dataUpdates.portConfigs[portId] === undefined) {
                        if (tempNewNodeDataWithUpdates.portConfigs) {
                           delete tempNewNodeDataWithUpdates.portConfigs[portId];
                           if (Object.keys(tempNewNodeDataWithUpdates.portConfigs).length === 0) {
                               delete tempNewNodeDataWithUpdates.portConfigs;
                           }
                        }
                    }
                }
                delete dataUpdates.portConfigs; 
            }
            
            Object.assign(tempNewNodeDataWithUpdates, dataUpdates);
            
            compareAndReportChanges(
              'data', 
              oldNodeDataForComparison,
              tempNewNodeDataWithUpdates,
              nodeId,
              newNode.title, 
              onNodeDataUpdated
            );
            newNode.data = tempNewNodeDataWithUpdates;
            if (updates.portConfigs) structuralChange = true; 
          }

          if (structuralChange && definitionForUpdate) { 
             newNode.height = calculateNodeHeight(
                newNode.inputs,
                newNode.outputs,
                HEADER_HEIGHT,
                newNode.customContentHeight || definitionForUpdate.customContentHeight || 0,
                newNode.customContentTitle || definitionForUpdate.customContentTitle
            );
          }
          return newNode;
        }
        return n;
      })
    );
  }, [onNodeDataUpdated, getNodeDefinition]);

  const updateNodesWithNewProperties = useCallback((
    nodeUpdates: Array<{ nodeId: string; updates: Partial<Node> }>
  ) => {
    setNodes(prevNodes => {
      const updatesMap = new Map(nodeUpdates.map(nu => [nu.nodeId, nu.updates]));
      return prevNodes.map(node => {
        if (updatesMap.has(node.id)) {
          const oldNode = { ...node }; // For history comparison if needed for onNodeDataUpdated
          const nodeSpecificUpdates = updatesMap.get(node.id)!;
          const updatedNode = { ...node, ...nodeSpecificUpdates };

          const shouldSyncOutputsToInputsUpdate = updatedNode.type === DATA_SYNCHRONIZATION_NODE_TYPE_KEY || updatedNode.type === DATA_DELAY_NODE_TYPE_KEY;

          if (shouldSyncOutputsToInputsUpdate && nodeSpecificUpdates.inputs) {
            const newInputsArray = updatedNode.inputs;
            const completeNewOutputsArray: NodePort[] = [];
            
            newInputsArray.forEach(inPort => {
              let outputPortId = inPort.id;
              let outputLabelPrefix = "输出: ";
              if (inPort.dataType === PortDataType.FLOW) {
                outputLabelPrefix = "流程输出: ";
              }

              if (inPort.id.startsWith('data_in_')) {
                outputPortId = inPort.id.replace(/^data_in_/, 'data_out_');
              } else if (inPort.id.startsWith('flow_in_')) {
                outputPortId = inPort.id.replace(/^flow_in_/, 'flow_out_');
              }
              
              if (!completeNewOutputsArray.some(op => op.id === outputPortId)) {
                completeNewOutputsArray.push({
                  id: outputPortId, 
                  label: `${outputLabelPrefix}${inPort.label}`, 
                  dataType: inPort.dataType, // Output dataType matches input dataType
                  shape: inPort.dataType === PortDataType.FLOW ? (inPort.isPortRequired ? 'diamond' : 'circle') : 'circle', 
                  isPortRequired: inPort.isPortRequired, 
                  isDataRequiredOnConnection: inPort.isDataRequiredOnConnection === undefined ? true : inPort.isDataRequiredOnConnection,
                });
              }
            });
            completeNewOutputsArray.sort((a, b) => {
                if (a.dataType === PortDataType.FLOW && b.dataType !== PortDataType.FLOW) return 1;
                if (a.dataType !== PortDataType.FLOW && b.dataType === PortDataType.FLOW) return -1;
                return a.label.localeCompare(b.label);
            });
            // No onNodeDataUpdated call here as updateNodesWithNewProperties is for bulk/silent updates
            updatedNode.outputs = completeNewOutputsArray;

            if (updatedNode.type === DATA_DELAY_NODE_TYPE_KEY) {
              const oldDelayTimes = { ...(updatedNode.data?.portDelayTimes || {}) };
              const newDelayTimes: Record<string, number> = {};
              newInputsArray.forEach(inPort => {
                if (inPort.dataType !== PortDataType.FLOW) {
                  newDelayTimes[inPort.id] = oldDelayTimes[inPort.id] !== undefined ? oldDelayTimes[inPort.id] : 1000;
                }
              });
              updatedNode.data = { ...(updatedNode.data || {}), portDelayTimes: newDelayTimes };
            }
          }


          if (nodeSpecificUpdates.inputs || nodeSpecificUpdates.outputs || (nodeSpecificUpdates.data && nodeSpecificUpdates.data.portConfigs) || (shouldSyncOutputsToInputsUpdate && nodeSpecificUpdates.inputs)) {
             const nodeDef = getNodeDefinition(updatedNode.type); // Use prop
             if (nodeDef) {
                updatedNode.height = calculateNodeHeight(
                    updatedNode.inputs,
                    updatedNode.outputs,
                    HEADER_HEIGHT,
                    updatedNode.customContentHeight || nodeDef.customContentHeight || 0,
                    updatedNode.customContentTitle || nodeDef.customContentTitle
                );
             }
          }
          return updatedNode;
        }
        return node;
      });
    });
  }, [getNodeDefinition]); // Removed onNodeDataUpdated from deps as this is for bulk updates

  const deleteNodeCompletely = useCallback((nodeIdToDelete: string) => {
    onBeforeNodeDeleted(nodeIdToDelete);
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeIdToDelete));

    let newPrimaryAfterDelete: string | null = null;
    _setSelectedNodeIdsInternal(prevIds => {
      const newIds = prevIds.filter(id => id !== nodeIdToDelete);
      newPrimaryAfterDelete = newIds.length > 0 ? newIds[newIds.length - 1] : null;
      return newIds;
    });
    if (primarySelectedNodeId !== newPrimaryAfterDelete) {
      setPrimarySelectedNodeIdInternal(newPrimaryAfterDelete);
    }
    onNodeSelected(newPrimaryAfterDelete, false); 

  }, [onBeforeNodeDeleted, onNodeSelected, primarySelectedNodeId]);

  const clearAllNodesAndState = useCallback(() => {
    setNodes([]);
    _setSelectedNodeIdsInternal([]);
    setPrimarySelectedNodeIdInternal(null);
    setNodeTypeToPlace(null);
    onNodeSelected(null, true); 
    onNodeTypeToPlaceChanged(null);
  }, [onNodeSelected, onNodeTypeToPlaceChanged]);

  const setNodesDirectly = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
    _setSelectedNodeIdsInternal([]);
    setPrimarySelectedNodeIdInternal(null);
    setNodeTypeToPlace(null);
    onNodeSelected(null, true); 
    onNodeTypeToPlaceChanged(null);
  }, [onNodeSelected, onNodeTypeToPlaceChanged]);

  useEffect(() => {
    if (selectedNodeIds.length === 0 && primarySelectedNodeId === null) return; 
  
    setNodes(prevNodes => {
      const currentSelectedIds = selectedNodeIds;
      const primaryId = primarySelectedNodeId;
  
      const selectedNodesFromState = currentSelectedIds
        .map(id => prevNodes.find(n => n.id === id))
        .filter(Boolean) as Node[];
  
      const orderedSelectedNodes: Node[] = [];
      if (primaryId) {
        selectedNodesFromState.forEach(n => { if (n.id !== primaryId) orderedSelectedNodes.push(n); });
        const primaryNodeInstance = selectedNodesFromState.find(n => n.id === primaryId);
        if (primaryNodeInstance) orderedSelectedNodes.push(primaryNodeInstance);
      } else if (selectedNodesFromState.length > 0) {
        const lastSelected = selectedNodesFromState.pop();
        if (lastSelected) {
            orderedSelectedNodes.push(...selectedNodesFromState);
            orderedSelectedNodes.push(lastSelected);
        } else {
            orderedSelectedNodes.push(...selectedNodesFromState);
        }
      } else {
        orderedSelectedNodes.push(...selectedNodesFromState);
      }
  
      const unselectedNodes = prevNodes.filter(n => !currentSelectedIds.includes(n.id));
      const newNodesArray = [...unselectedNodes, ...orderedSelectedNodes];
  
      if (prevNodes.length === newNodesArray.length && prevNodes.every((node, index) => node.id === newNodesArray[index].id)) {
        return prevNodes; 
      }
      return newNodesArray;
    });
  }, [selectedNodeIds, primarySelectedNodeId]);

  const selectedNode = useMemo(() => { 
    return nodes.find(node => node.id === primarySelectedNodeId) || null;
  }, [nodes, primarySelectedNodeId]);

  const selectedNodeDefinition = useMemo(() => {
    if (!selectedNode) return null;
    return getNodeDefinition(selectedNode.type) || null; // Use prop
  }, [selectedNode, getNodeDefinition]); 

  return {
    nodes,
    getNodes: () => nodes,
    selectedNodeIds,
    getSelectedNodeIds: () => selectedNodeIds,
    primarySelectedNodeId,
    getSelectedNodeId: () => primarySelectedNodeId,
    selectedNode,
    selectedNodeDefinition,
    nodeTypeToPlace,
    getNodeTypeToPlace: () => nodeTypeToPlace,
    addNode,
    addNodeAtPosition,
    addNodeOnDrop,
    addPastedNode, 
    updateNodePosition,
    updateNodeData,
    updateNodesWithNewProperties, 
    selectNode,
    addNodesToSelection,
    selectNodeTypeForPlacement,
    deleteNodeCompletely,
    clearAllNodesAndState,
    setNodesDirectly,
  };
};
