
import { Node, Connection, WorkflowServices, NodeExecutionState, NodeTypeDefinition, WorkflowState, PortDataType, RegisteredAiTool } from '../../../types'; // Added RegisteredAiTool
import { WorkflowExecutionManager } from '../WorkflowExecutionManager'; // Import main WEM
import { START_NODE_TYPE_KEY } from '../../../nodes/Start/Definition'; 
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';
import { InvocationRequest } from '../engine/executionEngineTypes';


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
    customTools?: RegisteredAiTool[] 
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

    const subNodes = hydratedSubNodes; 
    const subConnections = graphData.connections;

    const subworkflowNodeExecutionStates = new Map<string, NodeExecutionState>();
    const onSubNodeStateChange = (nodeId: string, state: NodeExecutionState) => {
      subworkflowNodeExecutionStates.set(nodeId, state);
      
    };

    const onSubNodeDataChange = (nodeId: string, dataUpdates: Record<string, any>) => {
      const nodeIndex = subNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        subNodes[nodeIndex] = {
          ...subNodes[nodeIndex],
          data: { ...(subNodes[nodeIndex].data || {}), ...dataUpdates },
        };
      }
    };

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
          finalOutputsFromHost[internalOutputNodeId] = value;
        }
      },
    };
    const subWEM = new WorkflowExecutionManager(subWorkflowServicesForSubRun);
    
    const noOpOnConnectionUpdate = (_updatedConnection: Connection) => {
      // No-op for subworkflow internal connections
    };

    const getSubNodes = () => subNodes;
    const getSubConnections = () => subConnections;
    const getSubNodeDefinition = (type: string) => this.services.getNodeDefinition(type);

    try {
      subWEM.initializeRun(getSubNodes, getSubConnections, onSubNodeStateChange, noOpOnConnectionUpdate);

      const initialRequestsForSubworkflow: InvocationRequest[] = [];
      const completedOrErroredInSubRun = new Set<string>();
      
      // Use a consistent context ID for the initial propagation wave from inputs within this subworkflow invocation
      const subworkflowInvocationContextId = (subWEM as any).executionContextService.generateContextId(subWorkflowId);

      subNodes.forEach(node => {
        if (node.type === SUBWORKFLOW_INPUT_NODE_TYPE_KEY) {
          const inputValue = parentInputs[node.id]; 
          const swInputNodeOutputs = { 'value_out': inputValue };

          // Mark SubworkflowInputNode as "completed" as it's providing its data
          onSubNodeStateChange(node.id, {
            status: 'completed',
            executionDetails: {
              outputContent: `Provided input: ${inputValue === undefined ? 'undefined' : JSON.stringify(inputValue)}`,
              lastExecutionContextId: subworkflowInvocationContextId,
            },
            activeExecutionContextId: undefined,
          });
          completedOrErroredInSubRun.add(node.id);

          const requestsFromThisInput = subWEM.propagateInitialOutputsAndPrepareRequests(
            node,
            swInputNodeOutputs,
            Date.now(),
            getSubConnections,
            getSubNodes,
            getSubNodeDefinition,
            onSubNodeStateChange,
            subworkflowInvocationContextId 
          );
          initialRequestsForSubworkflow.push(...requestsFromThisInput);
        }
      });
      
      // Also find and prepare requests for traditional StartNodes within the subworkflow
      const internalStartNodes = subNodes.filter(n => n.type === START_NODE_TYPE_KEY);
      internalStartNodes.forEach(startNode => {
          // Internal start nodes initiate their own context wave within the subworkflow
          const internalStartNodeContextId = (subWEM as any).executionContextService.generateContextId(startNode.id);
          initialRequestsForSubworkflow.push({
              nodeId: startNode.id,
              inputs: {},
              consumedSources: new Map(),
              executionContextId: internalStartNodeContextId,
          });
      });


      if (initialRequestsForSubworkflow.length > 0) {
        await (subWEM as any)._processBatchOfRequests( 
          initialRequestsForSubworkflow,
          getSubNodes,
          getSubConnections,
          getSubNodeDefinition,
          onSubNodeStateChange,
          onSubNodeDataChange,
          completedOrErroredInSubRun,
          customTools
        );
      }
      
      (subWEM as any).finalizeWorkflowNodeStates(
          getSubNodes,
          getSubNodeDefinition,
          getSubConnections,
          (subWEM as any).portDataCache, 
          (subWEM as any).activeFlowSignals, 
          onSubNodeStateChange,
          completedOrErroredInSubRun
      );

    } catch (error) {
      
      return { outputs: {}, error: `Subworkflow execution failed: ${error instanceof Error ? error.message : String(error)}` };
    }
    
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
    
    return { 
        outputs: finalOutputsFromHost, 
        error: aggregatedError,
        executionDetails: aggregatedExecutionDetails,
    };
  }
}
