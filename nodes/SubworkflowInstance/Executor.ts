
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types'; // Added RegisteredAiTool
import { SubworkflowExecutionService } from '../../features/execution/services/SubworkflowExecutionService'; // Corrected path
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../SubworkflowOutput/Definition'; // For type checking

export const executeSubworkflowInstance = async (
  node: Node,
  inputs: Record<string, any>, // Inputs from parent workflow, keyed by instance node's input port IDs
  services: WorkflowServices,
  executionContextId?: string, // Context ID from the parent workflow's execution wave
  customTools?: RegisteredAiTool[] // Added customTools (passed to SubworkflowExecutionService)
): Promise<{ outputs: Record<string, any>; executionDetails?: NodeExecutionState['executionDetails'] }> => {
  const subWorkflowId = node.data?.subWorkflowId;
  const logPrefix = `[Executor.SW_Inst ${node.id} (${node.title}) for SW_ID:${subWorkflowId}]`;

  if (!subWorkflowId) {
    const errorMsg = "Subworkflow ID missing from node data.";
    
    return { 
      outputs: {}, 
      executionDetails: { 
        lastRunError: errorMsg,
        outputContent: `Error: ${errorMsg}`,
        lastExecutionContextId: executionContextId,
      } 
    };
  }

  if (!services.getGraphDefinition || !services.getNodeDefinition) {
    const errorMsg = "Core services (getGraphDefinition or getNodeDefinition) missing for subworkflow execution.";
    
    return {
      outputs: {},
      executionDetails: {
        lastRunError: errorMsg,
        outputContent: `Error: ${errorMsg}`,
        lastExecutionContextId: executionContextId,
      }
    };
  }

  // Prepare inputs for the SubworkflowExecutionService, mapping from instance ports to internal node IDs
  const parentInputsForService: Record<string, any> = {};
  const portMappings = node.data?.portMappings || {}; // portMappings structure: { [instancePortId: string]: string[] /* list of internal node IDs */ }

  for (const instancePortId in inputs) {
    if (Object.prototype.hasOwnProperty.call(inputs, instancePortId)) {
      const inputValue = inputs[instancePortId];
      // Check if this instancePortId (which is an input port of the instance node) exists in portMappings
      if (portMappings[instancePortId]) {
        const internalNodeIds: string[] = portMappings[instancePortId];
        if (Array.isArray(internalNodeIds)) {
          internalNodeIds.forEach(internalNodeId => {
            parentInputsForService[internalNodeId] = inputValue;
          });
        }
      }
    }
  }
  

  const subworkflowRunner = new SubworkflowExecutionService(services);
  
  try {
    // Pass customTools to the subworkflow execution
    const result = await subworkflowRunner.execute(subWorkflowId, parentInputsForService, executionContextId, customTools);
    
    const finalOutputsForInstance: Record<string, any> = {};
    // Map outputs from internalOutputNodeId (key in result.outputs) to instancePortId
    if (result.outputs && node.data?.portMappings) {
      // No need to fetch swDefinition again if portMappings is comprehensive and correct
      // const swDefinition = await services.getGraphDefinition(subWorkflowId); 

      for (const instancePortId in node.data.portMappings) {
        // Check if this mapping entry is for an output port of the instance node
        const portDef = node.outputs.find(p => p.id === instancePortId);
        if (!portDef) continue; 

        const mappedInternalNodeIds: string[] = node.data.portMappings[instancePortId];
        if (!mappedInternalNodeIds || mappedInternalNodeIds.length === 0) continue;

        // Sort the internal nodes by ID to ensure a deterministic order if multiple provide output
        const sortedInternalNodeIds = mappedInternalNodeIds.slice().sort((a, b) => a.localeCompare(b));
        
        for (const internalId of sortedInternalNodeIds) {
          if (result.outputs.hasOwnProperty(internalId)) {
            finalOutputsForInstance[instancePortId] = result.outputs[internalId];
            break; // First one (after sorting by ID) wins
          }
        }
      }
    }
    
    const executionDetails: NodeExecutionState['executionDetails'] = {
      ...(result.executionDetails || {}),
      lastRunError: result.error || result.executionDetails?.lastRunError,
      outputContent: result.error 
        ? `Subworkflow Error: ${result.error}` 
        : (Object.keys(finalOutputsForInstance).length > 0 
            ? `Subworkflow completed. Outputs: ${Object.keys(finalOutputsForInstance).join(', ')}`
            : "Subworkflow completed with no outputs."),
      lastExecutionContextId: (result.executionDetails as any)?.lastExecutionContextId || executionContextId,
    };
    
    if ((result.executionDetails as any)?.overallThoughts) {
        executionDetails.thoughts = (result.executionDetails as any).overallThoughts;
    }
    if ((result.executionDetails as any)?.overallTokenCount) {
        executionDetails.tokenCount = (result.executionDetails as any).overallTokenCount;
    }
    
    
    return { outputs: finalOutputsForInstance, executionDetails };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return { 
      outputs: {}, 
      executionDetails: { 
        lastRunError: `Critical subworkflow execution error: ${errorMsg}`,
        outputContent: `Error: ${errorMsg}`,
        lastExecutionContextId: executionContextId,
      } 
    };
  }
};

export default executeSubworkflowInstance;