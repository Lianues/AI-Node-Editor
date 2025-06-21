
import { useCallback, useEffect } from 'react'; // Added useEffect
import { Node, NodePort, PortDataType, WorkflowState, NodeTypeDefinition } from '../../../types';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';
import { SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInstance/Definition';
import { UseAppSubWorkflowsOutput, InterfaceUpdateResult } from './useAppSubWorkflows'; // Added InterfaceUpdateResult
import { HistoryActionType } from '../../history/historyTypes';
import { WorkflowHistoryManagerOutput } from '../../history/useWorkflowHistoryManager'; 
import { SubWorkflowInputOutputDefinition, SubWorkflowItem } from '../types/subWorkflowTypes';
import { calculateNodeHeight } from '../../../nodes/nodeLayoutUtils';
import { HEADER_HEIGHT } from '../../../components/renderingConstants';


// Simpler direct access types, assuming refs are resolved by the caller (useAppOrchestration)
interface AppCoreOrchestrationAccess {
  addTab: (options?: { type?: string; title?: string; id?: string }) => any; 
  selectTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<any>) => void; 
  getTabWorkflowStateById: (tabId: string) => WorkflowState | null | undefined;
  tabs: Array<{ id: string; type: string; unsaved?: boolean; title: string }>; 
  closeTab: (tabId: string) => void;
  activeTabId: string | null; // Added activeTabId
}

interface EditorFeaturesOrchestrationAccess {
  addNode: (
    nodeTypeKey?: string,
    position?: { x: number; y: number },
    existingNodeData?: Partial<Node>,
    skipSelection?: boolean
  ) => Node | null;
  nodes: Node[]; // Added nodes
  updateNodesWithNewProperties: (nodeUpdates: Array<{ nodeId: string; updates: Partial<Node> }>) => void; // Added
}

interface UseAppSubWorkflowOrchestrationProps {
  appSubWorkflowsManager: UseAppSubWorkflowsOutput;
  appCoreOrchestration: AppCoreOrchestrationAccess;
  editorFeaturesOrchestration: EditorFeaturesOrchestrationAccess; 
  workflowHistoryManager: WorkflowHistoryManagerOutput;
  getNodeDefinitionProp: (type: string) => NodeTypeDefinition | undefined;
  onSubWorkflowDefinitionChanged: ( // New prop
    updatedSubWorkflowId: string,
    updatedInputs?: SubWorkflowInputOutputDefinition[],
    updatedOutputs?: SubWorkflowInputOutputDefinition[]
  ) => void;
}

export const generateInstancePortsAndMappings = (
  subWorkflowItem: SubWorkflowItem,
  subWorkflowTabState: WorkflowState | null | undefined
): { instanceInputs: NodePort[], instanceOutputs: NodePort[], portMappings: Record<string, string[]> } => {
  const instanceInputs: NodePort[] = [];
  const instanceOutputs: NodePort[] = [];
  const portMappings: Record<string, string[]> = {};

  const inputInterfaceMap = new Map<string, { dataType: PortDataType, isRequired: boolean, internalNodeIds: string[] }>();
  const outputInterfaceMap = new Map<string, { dataType: PortDataType, isRequired: boolean, internalNodeIds: string[] }>();

  // Populate maps from subWorkflowItem which contains definitions from the subworkflow's canvas nodes
  // The subWorkflowItem.inputs/outputs directly reflect the SubworkflowInput/Output nodes.
  // Their `id` is the SubworkflowInput/OutputNode's ID, `name` is the configured portName.
  subWorkflowItem.inputs.forEach(def => {
    const key = `${def.name}_${def.dataType}`;
    if (!inputInterfaceMap.has(key)) {
      inputInterfaceMap.set(key, { dataType: def.dataType, isRequired: def.isRequired, internalNodeIds: [] });
    }
    inputInterfaceMap.get(key)!.internalNodeIds.push(def.id); // def.id is the internal SubworkflowInputNode ID
  });

  subWorkflowItem.outputs.forEach(def => {
    const key = `${def.name}_${def.dataType}`;
    if (!outputInterfaceMap.has(key)) {
      outputInterfaceMap.set(key, { dataType: def.dataType, isRequired: def.isRequired, internalNodeIds: [] });
    }
    outputInterfaceMap.get(key)!.internalNodeIds.push(def.id); // def.id is the internal SubworkflowOutputNode ID
  });

  // Create instance ports and mappings
  inputInterfaceMap.forEach((val, key) => {
    const [name] = key.split(`_${val.dataType}`); // Extract name
    const instancePortId = `instance_in_${name.replace(/\s+/g, '_')}_${val.dataType}`;
    instanceInputs.push({
      id: instancePortId,
      label: name, // Use the interface name as the label
      dataType: val.dataType,
      shape: val.isRequired && val.dataType !== PortDataType.FLOW ? 'diamond' : 'circle',
    });
    portMappings[instancePortId] = val.internalNodeIds;
  });

  outputInterfaceMap.forEach((val, key) => {
    const [name] = key.split(`_${val.dataType}`); // Extract name
    const instancePortId = `instance_out_${name.replace(/\s+/g, '_')}_${val.dataType}`;
    instanceOutputs.push({
      id: instancePortId,
      label: name, // Use the interface name as the label
      dataType: val.dataType,
      shape: val.isRequired && val.dataType !== PortDataType.FLOW ? 'diamond' : 'circle',
    });
    portMappings[instancePortId] = val.internalNodeIds;
  });
  
  // Sort ports by name for consistent display
  instanceInputs.sort((a, b) => a.label.localeCompare(b.label));
  instanceOutputs.sort((a, b) => a.label.localeCompare(b.label));

  return { instanceInputs, instanceOutputs, portMappings };
};


export const useAppSubWorkflowOrchestration = ({
  appSubWorkflowsManager,
  appCoreOrchestration,
  editorFeaturesOrchestration,
  workflowHistoryManager,
  getNodeDefinitionProp,
  onSubWorkflowDefinitionChanged,
}: UseAppSubWorkflowOrchestrationProps) => {

  const handleAddNewSubWorkflowTab = useCallback(() => {
    const newSubWorkflow = appSubWorkflowsManager.addNewSubWorkflowItem();
    if (newSubWorkflow) {
      appCoreOrchestration.addTab({ type: 'subworkflow', title: newSubWorkflow.name, id: newSubWorkflow.id });
    }
  }, [appSubWorkflowsManager, appCoreOrchestration]);

  const handleOpenSubWorkflowTabById = useCallback((subWorkflowId: string) => {
    const subWorkflowItem = appSubWorkflowsManager.subWorkflows.find(sw => sw.id === subWorkflowId);
    if (!subWorkflowItem) {
      return;
    }
    const existingTab = appCoreOrchestration.tabs.find(
      t => t.id === subWorkflowItem.id && t.type === 'subworkflow'
    );
    if (existingTab) {
      appCoreOrchestration.selectTab(existingTab.id);
    } else {
      appCoreOrchestration.addTab({
        type: 'subworkflow',
        title: subWorkflowItem.name,
        id: subWorkflowItem.id,
      });
    }
  }, [appSubWorkflowsManager.subWorkflows, appCoreOrchestration]);

  const handleMarkSubWorkflowTabUnsaved = useCallback((subWorkflowId: string) => {
    const tabToMark = appCoreOrchestration.tabs.find(
      t => t.id === subWorkflowId && t.type === 'subworkflow'
    );
    if (tabToMark) {
      appCoreOrchestration.updateTab(tabToMark.id, { unsaved: true });
    }
  }, [appCoreOrchestration]);

  const handleDropSubWorkflowInstanceOnCanvas = useCallback((subWorkflowId: string, worldX: number, worldY: number) => {
    const subWorkflowItem = appSubWorkflowsManager.subWorkflows.find(sw => sw.id === subWorkflowId);
    if (!subWorkflowItem) return;

    const subWorkflowTabState = appCoreOrchestration.getTabWorkflowStateById(subWorkflowId);
    // subWorkflowTabState is not strictly needed here if SubWorkflowItem has the canonical interface definition
    
    const { instanceInputs, instanceOutputs, portMappings } = generateInstancePortsAndMappings(subWorkflowItem, subWorkflowTabState);

    const nodeDefinition = getNodeDefinitionProp(SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY);
    if (!nodeDefinition) return;

    const newHeight = calculateNodeHeight(instanceInputs, instanceOutputs, HEADER_HEIGHT);

    const newNodeData: Partial<Node> = {
      type: SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY,
      title: subWorkflowItem.name,
      data: {
        subWorkflowId: subWorkflowItem.id,
        subWorkflowName: subWorkflowItem.name,
        portMappings: portMappings,
      },
      inputs: instanceInputs,
      outputs: instanceOutputs,
      height: newHeight,
      headerColor: nodeDefinition.headerColor,
      bodyColor: nodeDefinition.bodyColor,
    };

    const addedNode = editorFeaturesOrchestration.addNode(
      undefined, { x: worldX, y: worldY }, newNodeData
    );

    if (addedNode) {
      workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_NODE, {
        newNodeId: addedNode.id,
        newNodeType: addedNode.type,
        newNodeTitle: addedNode.title,
        committedNewNodeInstance: JSON.parse(JSON.stringify(addedNode)),
      });
    }
  }, [
    appSubWorkflowsManager.subWorkflows,
    appCoreOrchestration,
    editorFeaturesOrchestration,
    workflowHistoryManager,
    getNodeDefinitionProp,
  ]);

  const handlePreTabClose = useCallback((tabIdToClose: string) => {
    const tabToCloseInstance = appCoreOrchestration.tabs.find(t => t.id === tabIdToClose);
    if (tabToCloseInstance && tabToCloseInstance.type === 'subworkflow' && tabToCloseInstance.unsaved) {
      appSubWorkflowsManager.revertSubWorkflow(tabToCloseInstance.id);
    }
  }, [appCoreOrchestration.tabs, appSubWorkflowsManager]);

  const handlePostTabSave = useCallback((savedTabId: string) => {
    const savedTabInstance = appCoreOrchestration.tabs.find(t => t.id === savedTabId);
    if (savedTabInstance && savedTabInstance.type === 'subworkflow' && !savedTabInstance.unsaved) {
      appSubWorkflowsManager.commitSubWorkflowChanges(savedTabInstance.id);
    }
  }, [appCoreOrchestration.tabs, appSubWorkflowsManager]);

  useEffect(() => {
    const activeTabId = appCoreOrchestration.activeTabId;
    const nodesOfActiveTab = editorFeaturesOrchestration.nodes;

    if (!activeTabId || !nodesOfActiveTab) return;

    const activeTab = appCoreOrchestration.tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.type === 'subworkflow') {
      const nodesForUpdate = [...nodesOfActiveTab];
      const interfaceUpdateResult = (appSubWorkflowsManager as any).updateSubWorkflowInterfaceFromNodes(activeTab.id, nodesForUpdate);
      
      if (interfaceUpdateResult) {
        const subWorkflowItem = appSubWorkflowsManager.subWorkflows.find(sw => sw.id === interfaceUpdateResult.subWorkflowId);
        if (subWorkflowItem) {
            const { instanceInputs, instanceOutputs, portMappings } = generateInstancePortsAndMappings(subWorkflowItem, null); // Pass null for state, rely on item
            const newHeight = calculateNodeHeight(instanceInputs, instanceOutputs, HEADER_HEIGHT);

            const nodeUpdatesForInstances: Array<{ nodeId: string; updates: Partial<Node> }> = [];
            // Need to iterate over ALL nodes on ALL tabs to update instances.
            // This requires access to all tab states or a centralized way to update nodes across tabs.
            // For now, this will only update instances on the *currently active* tab if it's not the subworkflow definition tab.
            // A more robust solution would involve iterating `appCoreOrchestration.getTabWorkflowStateById` for all relevant tabs.

            // Simplified: If the active tab IS the subworkflow definition, we don't update instances on *this* tab.
            // The `onSubWorkflowDefinitionChanged` callback handles updates across other tabs.
            
        }
        onSubWorkflowDefinitionChanged(
          interfaceUpdateResult.subWorkflowId, 
          interfaceUpdateResult.newInputs, 
          interfaceUpdateResult.newOutputs
        );
         handleMarkSubWorkflowTabUnsaved(activeTab.id);
      }
    }
  }, [
    appCoreOrchestration.activeTabId, 
    appCoreOrchestration.tabs, 
    editorFeaturesOrchestration.nodes, 
    appSubWorkflowsManager, 
    onSubWorkflowDefinitionChanged,
    handleMarkSubWorkflowTabUnsaved, 
    editorFeaturesOrchestration.updateNodesWithNewProperties 
  ]);

  return {
    handleAddNewSubWorkflowTab,
    handleOpenSubWorkflowTabById,
    handleMarkSubWorkflowTabUnsaved,
    handleDropSubWorkflowInstanceOnCanvas,
    handlePreTabClose,
    handlePostTabSave,
  };
};
