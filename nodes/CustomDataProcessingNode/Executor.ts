
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';
import { processTemplateString } from '../../features/execution/engine/NodeExecutionEngine'; // Import the template processor

export const executeCustomDataProcessingNode = async (
  node: Node, // Note: node.data.customLogic would have been pre-processed by NodeExecutionEngine
  inputs: Record<string, any>,
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] // Though not directly used by this node type's core logic
): Promise<{
  outputs: Record<string, any>;
  dataUpdates?: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  let customLogic = node.data?.customLogic as string || '';
  const logPrefix = `[CustomDataProcExec ${node.id}]`;
  let executionError: string | undefined = undefined;
  let outputsFromScript: Record<string, any> = {};

  try {
    // Preprocess customLogic to replace {{port_id}} placeholders
    const processedLogic = customLogic.replace(/{{\s*([\w-]+)\s*}}/g, (match, portId) => {
      const portValue = inputs[portId];
      if (portValue === undefined) {
        return ""; // Replace with empty string if undefined
      }
      if (portValue === null) {
        return "null"; // Replace with the string "null"
      }
      if (typeof portValue === 'string') {
        // For direct string replacement into code, ensure it's a valid JS string literal.
        // JSON.stringify will handle escaping quotes, newlines, etc.
        return JSON.stringify(portValue);
      }
      if (typeof portValue === 'number' || typeof portValue === 'boolean') {
        return String(portValue); // Numbers and booleans can be directly stringified
      }
      // For objects and arrays, stringify them as JSON.
      // This means in the script, `{{my_object}}` would become `'{"key":"value"}'`
      // if my_object was {key:"value"}. The user would need to JSON.parse() it if they
      // want to use it as an object directly from the placeholder.
      // Alternatively, they can always use `inputs.my_object`.
      try {
        return JSON.stringify(portValue);
      } catch (e) {
        console.warn(`${logPrefix} Failed to stringify port data for {{${portId}}}:`, e);
        return `"[Error serializing ${portId}]"`; // Placeholder for error
      }
    });

    // Create a function with 'inputs' as an argument.
    // 'use strict'; is added for slightly safer execution environment.
    const userFunction = new Function('inputs', `"use strict";\n${processedLogic}`);
    const result = userFunction(inputs); // inputs object is still available for direct access

    if (typeof result === 'object' && result !== null) {
      outputsFromScript = result;
    } else if (result !== undefined) {
      const defaultDataOutPort = node.outputs.find(p => p.id === 'data_out_1' && p.dataType !== PortDataType.FLOW);
      if (defaultDataOutPort) {
        outputsFromScript[defaultDataOutPort.id] = result;
      } else {
        console.warn(`${logPrefix} Script returned a non-object value but no default data output port (like 'data_out_1') was found.`);
      }
    }
  } catch (e: any) {
    executionError = `自定义逻辑执行错误: ${e.message || String(e)}`;
    console.error(`${logPrefix} ${executionError}`, e);
  }

  const flowEndPort = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  let flowPortTriggered = false;
  for (const key in outputsFromScript) {
    if (outputsFromScript[key] && typeof outputsFromScript[key] === 'object' && outputsFromScript[key].flowSignal === true) {
      const outputPortDef = node.outputs.find(p => p.id === key && p.dataType === PortDataType.FLOW);
      if (outputPortDef) {
        flowPortTriggered = true;
        break;
      }
    }
  }

  if (flowEndPort && !flowPortTriggered && !executionError) {
    outputsFromScript[flowEndPort.id] = { flowSignal: true };
  }
  
  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: executionError ? `错误: ${executionError}` : Object.keys(outputsFromScript).length > 0 ? `成功执行脚本` : "脚本未产生输出",
    lastRunError: executionError,
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsFromScript, executionDetails };
};

export default executeCustomDataProcessingNode;