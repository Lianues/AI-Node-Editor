
import { Node, NodeTypeDefinition, NodeExecutionState, WorkflowServices, PortDataType, RegisteredAiTool } from '../../../types'; // Added RegisteredAiTool

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
 * Processes a string, replacing {{port_id}} placeholders with actual data from node inputs.
 * @param templateString The string containing placeholders.
 * @param nodeInputs The object containing data for the node's input ports.
 * @returns The processed string with placeholders replaced.
 */
export const processTemplateString = (templateString: string, nodeInputs: Record<string, any>): string => {
  if (typeof templateString !== 'string') {
    return templateString; // Return as-is if not a string
  }
  return templateString.replace(/{{\s*([\w-]+)\s*}}/g, (match, portId) => {
    const portValue = nodeInputs[portId];
    if (portValue === undefined) {
      return ""; // Replace with empty string if port data is undefined
    }
    if (portValue === null) {
      return "null";
    }
    if (typeof portValue === 'string') {
      return portValue;
    }
    if (typeof portValue === 'number' || typeof portValue === 'boolean') {
      return String(portValue);
    }
    if (typeof portValue === 'object') {
      try {
        return JSON.stringify(portValue);
      } catch (e) {
        return `[Error serializing port data: ${portId}]`;
      }
    }
    return String(portValue); // Fallback for other types
  });
};


/**
 * Atomically executes a single node.
 * It calls the node's executor function.
 *
 * @param node The node to execute.
 * @param definition The definition of the node type.
 * @param inputs The input data for the node.
 * @param services Workflow services available to the executor.
 * @param executionContextId Optional execution context ID.
 * @param customTools Optional array of custom AI tools.
 * @returns A promise that resolves to an object containing the outputs of the execution, 
 *          optional dataUpdates, any error message, and optional executionDetails.
 */
export const executeNodeAtomically = async (
  node: Node,
  definition: NodeTypeDefinition,
  inputs: Record<string, any>,
  services: WorkflowServices,
  executionContextId?: string, // Added executionContextId
  customTools?: RegisteredAiTool[] // Added customTools
): Promise<{
  outputs: Record<string, any> | null; // Null if critical error prevents output generation
  dataUpdates?: Record<string, any>; // ADDED: Optional data updates from executor
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
      dataUpdates: undefined, // No data updates on validation error
      error: errorMsg,
      executionDetails: {
        lastRunError: errorMsg,
        portSpecificErrors: inputValidationErrors,
        outputContent: errorMsg, 
      }
    };
  }

  if (!definition.executor) {
    const errorMsg = `Node type ${definition.type} (ID: ${node.id}) has no executor.`;
    console.warn(errorMsg);
    return { 
      outputs: null, 
      dataUpdates: undefined, // No data updates if no executor
      error: errorMsg, 
      executionDetails: { lastRunError: errorMsg, outputContent: errorMsg } 
    };
  }

  // Process templates in node.data before calling executor
  const processedNodeData = { ...node.data };
  if (node.data) {
    for (const key in node.data) {
      if (typeof node.data[key] === 'string') {
        processedNodeData[key] = processTemplateString(node.data[key] as string, inputs);
      }
      // Specific handling for aiConfig if it's an object and contains templatable fields
      if (key === 'aiConfig' && typeof node.data.aiConfig === 'object' && node.data.aiConfig !== null) {
        const aiConfig = node.data.aiConfig as Record<string, any>;
        const processedAiConfig = { ...aiConfig };
        if (typeof aiConfig.systemInstruction === 'string') {
          processedAiConfig.systemInstruction = processTemplateString(aiConfig.systemInstruction, inputs);
        }
        if (typeof aiConfig.defaultPrompt === 'string') { // Process defaultPrompt too
          processedAiConfig.defaultPrompt = processTemplateString(aiConfig.defaultPrompt, inputs);
        }
        processedNodeData.aiConfig = processedAiConfig;
      }
    }
  }
  
  const nodeWithProcessedData = { ...node, data: processedNodeData };


  try {
    // Pass executionContextId and customTools to the executor
    const resultFromExecutor = await definition.executor(nodeWithProcessedData, inputs, services, executionContextId, customTools);
    
    const executorPortErrors = resultFromExecutor.executionDetails?.portSpecificErrors || [];

    return {
      outputs: resultFromExecutor.outputs,
      dataUpdates: resultFromExecutor.dataUpdates, // Propagate dataUpdates
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
      dataUpdates: undefined, // No data updates on critical executor error
      error: errorMsg,
      executionDetails: { 
        outputContent: `Critical Executor Error: ${errorMsg}`,
        lastRunError: errorMsg 
      }
    };
  }
};
