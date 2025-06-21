import { Node, NodeTypeDefinition, NodeExecutionState, WorkflowServices, PortDataType } from '../../types';

/**
 * Performs basic type checking for input data.
 * @param dataValue The actual data received.
 * @param expectedType The expected PortDataType.
 * @returns True if the type is valid, false otherwise.
 */
const isValidDataType = (dataValue: any, expectedType: PortDataType): boolean => {
  if (expectedType === PortDataType.ANY) return true;
  if (dataValue === undefined || dataValue === null) return true; // Allow null/undefined to pass, executor should handle missing optional inputs

  switch (expectedType) {
    case PortDataType.STRING:
      return typeof dataValue === 'string';
    case PortDataType.AI_CONFIG:
      return typeof dataValue === 'object' && dataValue !== null;
    // Add checks for other specific types like NUMBER, BOOLEAN if they are used for data ports
    default:
      return true; // For FLOW or UNKNOWN, or other types not strictly checked here
  }
};

/**
 * Atomically executes a single node.
 * It calls the node's executor function.
 *
 * @param node The node to execute.
 * @param definition The definition of the node type.
 * @param inputs The input data for the node.
 * @param services Workflow services available to the executor.
 * @returns A promise that resolves to an object containing the outputs of the execution, 
 *          any error message, and optional executionDetails.
 */
export const executeNodeAtomically = async (
  node: Node,
  definition: NodeTypeDefinition,
  inputs: Record<string, any>,
  services: WorkflowServices,
): Promise<{
  outputs: Record<string, any> | null; // Null if critical error prevents output generation
  error?: string;
  executionDetails?: NodeExecutionState['executionDetails'] & { portSpecificErrors?: { portId: string; message: string }[] };
}> => {
  // Input Data Type Validation
  const inputValidationErrors: { portId: string; message: string }[] = [];
  for (const portDef of definition.inputs) {
    if (inputs.hasOwnProperty(portDef.id)) { // Check only if data is provided for this port
      const dataValue = inputs[portDef.id];
      if (!isValidDataType(dataValue, portDef.dataType)) {
        inputValidationErrors.push({
          portId: portDef.id,
          message: `Incorrect input data type. Expected ${portDef.dataType}, got ${typeof dataValue}.`
        });
      }
    }
  }

  if (inputValidationErrors.length > 0) {
    const errorMsg = "Input data type validation failed.";
    console.warn(`[NodeExecutionEngine] ${node.id} (${definition.type}): ${errorMsg}`, inputValidationErrors);
    return {
      outputs: null,
      error: errorMsg,
      executionDetails: {
        lastRunError: errorMsg,
        portSpecificErrors: inputValidationErrors,
        outputContent: errorMsg, // General error for output content
      }
    };
  }

  if (!definition.executor) {
    const errorMsg = `Node type ${definition.type} (ID: ${node.id}) has no executor.`;
    console.warn(errorMsg);
    return { 
      outputs: null, 
      error: errorMsg, 
      executionDetails: { lastRunError: errorMsg, outputContent: errorMsg } 
    };
  }

  try {
    const resultFromExecutor = await definition.executor(node, inputs, services);
    
    // Ensure portSpecificErrors from executor is an array, even if undefined
    const executorPortErrors = resultFromExecutor.executionDetails?.portSpecificErrors || [];

    return {
      outputs: resultFromExecutor.outputs,
      executionDetails: {
        ...resultFromExecutor.executionDetails,
        portSpecificErrors: executorPortErrors.length > 0 ? executorPortErrors : undefined,
      },
      error: resultFromExecutor.executionDetails?.lastRunError || (executorPortErrors.length > 0 ? "Completed with port errors" : undefined)
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error executing node ${node.id} (${definition.type}) in NodeExecutionEngine:`, error);
    return { 
      outputs: null,
      error: errorMsg,
      executionDetails: { 
        outputContent: `Critical Executor Error: ${errorMsg}`,
        lastRunError: errorMsg 
      }
    };
  }
};