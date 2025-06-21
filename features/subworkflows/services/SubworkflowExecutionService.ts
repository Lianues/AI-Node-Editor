import { Node, Connection, WorkflowServices, NodeExecutionState, NodeTypeDefinition, WorkflowState, PortDataType, RegisteredAiTool } from '../../../types'; // Added RegisteredAiTool
import { WorkflowExecutionManager } from '../../execution/WorkflowExecutionManager'; // Import main WEM
import { START_NODE_TYPE_KEY } from '../../../nodes/Start/Definition'; // Not directly used but good for context
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';
import { InvocationRequest } from '../../execution/engine/executionEngineTypes';


interface SubworkflowExecutionResult {
  outputs: Record<string, any>;
  error?: string;
  executionDetails?: Record<string, any>; // Aggregated details
}

export class SubworkflowExecutionService {
  private services: WorkflowServices;

  constructor(services: WorkflowServices) {
    this.services = services;
  }

  public async execute(
    subWorkflowId: string,
    parentInputs: Record<string, any>, // Keyed by internal SubworkflowInputNode ID
    parentExecutionContextId?: string,
    customTools?: RegisteredAiTool[] // Added customTools
  ): Promise<SubworkflowExecutionResult> {
    const logPrefix = `[SubWfExecService SW_ID:${subWorkflowId}]`;
    

    const graphData: WorkflowState | null = await this.services.getGraphDefinition(subWorkflowId);

    if (!graphData) {
      
      return { outputs: {}, error: "Subworkflow definition not found." };
    }

    const hydratedSubNodes = graphData.nodes.map(n => {
      const nodeClone = { ...n }; 

      if (nodeClone.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY && nodeClone.outputs && nodeClone.outputs.length > 0) {
        const userConfiguredDataType = nodeClone.data?.portDataType || nodeClone.outputs[0].dataType;
        const userConfiguredShape = nodeClone.data?.isPortRequired ? 'diamond' : (nodeClone.outputs[0].shape || 'circle');
        const userConfiguredLabel = nodeClone.data?.portName || nodeClone.outputs[0].label; 

        nodeClone.outputs = [{ 
          ...nodeClone.outputs[0],
          dataType: userConfiguredDataType,
          shape: userConfiguredShape,
          label: userConfiguredLabel,
        }];
        
      } else if (nodeClone.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY && nodeClone.inputs && nodeClone.inputs.length > 0) {
        const userConfiguredDataType = nodeClone.data?.portDataType || nodeClone.inputs[0].dataType;
        const userConfiguredShape = nodeClone.data?.isPortRequired ? 'diamond' : (nodeClone.inputs[0].shape || 'circle');
        const userConfiguredLabel = nodeClone.data?.portName || nodeClone.inputs[0].label; 

        nodeClone.inputs = [{ 
          ...nodeClone.inputs[0],
          dataType: userConfiguredDataType,
          shape: userConfiguredShape,
          label: userConfiguredLabel,
        }];
        
      }
      return nodeClone;
    });

    const subNodes = hydratedSubNodes; // Use mutable copy if internal data updates are needed
    const subConnections = graphData.connections;

    const subworkflowNodeExecutionStates = new Map<string, NodeExecutionState>();
    const onSubNodeStateChange = (nodeId: string, state: NodeExecutionState) => {
      subworkflowNodeExecutionStates.set(nodeId, state);
      
    };

    // Define onSubNodeDataChange for the subworkflow's context
    const onSubNodeDataChange = (nodeId: string, dataUpdates: Record<string, any>) => {
      const nodeIndex = subNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        // This directly mutates the subNodes array if it's not a deep copy.
        // If subNodes is intended to be a snapshot, it should be deep cloned first.
        // For now, direct mutation of the local 'subNodes' is fine for this execution scope.
        subNodes[nodeIndex] = {
          ...subNodes[nodeIndex],
          data: { ...(subNodes[nodeIndex].data || {}), ...dataUpdates },
        };
        // console.log(`[SubWfExecService] Internal node data change for ${nodeId}:`, dataUpdates);
      }
    };

    // Object to store outputs captured by the host
    const finalOutputsFromHost: Record<string, any> = {};

    const subWorkflowServicesForSubRun: WorkflowServices = {
      ...this.services,
      getGraphDefinition: async (_workflowId: string) => {
        
        return null; 
      },
      subworkflowHost: {
        getInputValue: (internalInputNodeId: string) => {
          return parentInputs[internalInputNodeId];
        },
        setOutputValue: (internalOutputNodeId: string, value: any) => {
          
          finalOutputsFromHost[internalOutputNodeId] = value; // Store the output
        }
      },
    };
    const subWEM = new WorkflowExecutionManager(subWorkflowServicesForSubRun);
    
    const noOpOnConnectionUpdate = (_updatedConnection: Connection) => {
      // Subworkflow internal connection updates are not propagated to the main UI visually in real-time.
    };

    const getSubNodes = () => subNodes;
    const getSubConnections = () => subConnections;
    const getSubNodeDefinition = (type: string) => this.services.getNodeDefinition(type);


    try {
      // Pass customTools to the subWEM.runWorkflow call
      await subWEM.runWorkflow(
        getSubNodes, 
        getSubConnections, 
        getSubNodeDefinition, // Pass the wrapped getNodeDefinition
        onSubNodeStateChange,
        onSubNodeDataChange,
        noOpOnConnectionUpdate, // Pass no-op for connection updates
        customTools // Pass customTools here
      );
      // The old logic using subWEM.initializeRun and subWEM.processRequests manually
      // is replaced by calling the full subWEM.runWorkflow.

    } catch (error) {
      
      return { outputs: {}, error: `Subworkflow execution failed: ${error instanceof Error ? error.message : String(error)}` };
    }

    // Use finalOutputsFromHost directly
    // const finalOutputs: Record<string, any> = {}; // This line is removed/replaced

    let aggregatedError: string | undefined = undefined;
    const aggregatedExecutionDetails: Record<string, any> = {
        subWorkflowId,
        nodeStates: {},
        overallTokenCount: 0,
        overallThoughts: [],
        lastExecutionContextId: parentExecutionContextId, 
    };
    
    let lastInternalContextId: string | undefined = undefined;

    subNodes.forEach(node => {
      const nodeState = subworkflowNodeExecutionStates.get(node.id);
      if (nodeState) {
        (aggregatedExecutionDetails.nodeStates as any)[node.id] = { 
            status: nodeState.status, 
            error: nodeState.error, 
            lastContext: nodeState.executionDetails?.lastExecutionContextId 
        };
        if (nodeState.executionDetails?.lastExecutionContextId) {
            lastInternalContextId = nodeState.executionDetails.lastExecutionContextId;
        }
        if (nodeState.executionDetails?.tokenCount) {
            aggregatedExecutionDetails.overallTokenCount += nodeState.executionDetails.tokenCount;
        }
        if (nodeState.executionDetails?.thoughts) {
            (aggregatedExecutionDetails.overallThoughts as string[]).push(`Node ${node.title}(${node.id}): ${nodeState.executionDetails.thoughts}`);
        }
      }

      // The following block trying to read from subWEM cache is now redundant
      // if (node.type === SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY) {
      //   const inputPortId = node.inputs.find(p => p.id === 'value_in')?.id;
      //   if (inputPortId) {
      //     const outputDataEntries = subWEM.getQueuedDataForInputPort(node.id, inputPortId);
      //     if (outputDataEntries && outputDataEntries.length > 0) {
      //       finalOutputs[node.id] = outputDataEntries[0].value; // Key by internal output node ID
      //       
      //     } else {
      //       
      //     }
      //   }
      // }

      if (nodeState?.error && !aggregatedError) {
        aggregatedError = `Error in sub-node '${node.title}': ${nodeState.error}`;
      }
    });
    
    aggregatedExecutionDetails.lastExecutionContextId = lastInternalContextId || parentExecutionContextId;

    if (aggregatedExecutionDetails.overallThoughts.length === 0) {
        delete aggregatedExecutionDetails.overallThoughts;
    } else {
        aggregatedExecutionDetails.overallThoughts = (aggregatedExecutionDetails.overallThoughts as string[]).join('\n---\n');
    }
    if (aggregatedExecutionDetails.overallTokenCount === 0) {
        delete aggregatedExecutionDetails.overallTokenCount;
    }
    
    // Use finalOutputsFromHost as the source of truth for outputs
    
    return { 
        outputs: finalOutputsFromHost, // Use the outputs collected by the host
        error: aggregatedError,
        executionDetails: aggregatedExecutionDetails,
    };
  }
}