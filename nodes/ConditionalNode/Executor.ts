
import { Node, WorkflowServices, NodeExecutionState, PortDataType, RegisteredAiTool } from '../../types';

export const executeConditionalNode = async (
  node: Node,
  inputs: Record<string, any>,
  services: WorkflowServices,
  executionContextId?: string,
  customTools?: RegisteredAiTool[] 
): Promise<{
  outputs: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const conditionExpression = node.data?.conditionExpression || "true";
  const logPrefix = `[ConditionalNodeExec ${node.id}]`;
  let decision = false;
  let executionError: string | undefined = undefined;

  try {
    // Create a string where {{port_id}} is replaced by `inputs['port_id']`
    // This makes the condition string directly usable in the Function constructor
    // with `inputs` as an argument.
    const processedConditionForEval = conditionExpression.replace(
      /{{\s*([\w-]+)\s*}}/g,
      (match, portId) => {
        // We are creating a string that will become part of the function body.
        // Accessing inputs via `inputs['portId']` is safe for port IDs.
        return `inputs['${portId.replace(/'/g, "\\'")}']`; // Ensure portId is safely escaped if it contains quotes (though unlikely for sanitized IDs)
      }
    );
    
    // 'use strict'; can provide a slightly more secure execution environment
    const evaluator = new Function('inputs', `"use strict";\nreturn ( ${processedConditionForEval} );`);
    
    // Ensure that all expected input ports are at least defined in the inputs object,
    // even if they are undefined (not connected or no data).
    const allPossibleInputs = { ...inputs }; 
    node.inputs.forEach(portDef => {
        if (!(portDef.id in allPossibleInputs)) {
            allPossibleInputs[portDef.id] = undefined;
        }
    });

    decision = !!evaluator(allPossibleInputs); // Coerce to boolean
  } catch (e: any) {
    executionError = `条件表达式求值错误: ${e.message || String(e)}`;
    console.error(`${logPrefix} ${executionError}`, e);
    decision = false; // Default to false on error
  }

  const outputsMap: Record<string, any> = {};
  const flowTruePort = node.outputs.find(p => p.id === 'flow_true');
  const flowFalsePort = node.outputs.find(p => p.id === 'flow_false');

  if (decision && flowTruePort) {
    outputsMap[flowTruePort.id] = { flowSignal: true, error: !!executionError, errorMessage: executionError };
  } else if (!decision && flowFalsePort) {
    outputsMap[flowFalsePort.id] = { flowSignal: true, error: !!executionError, errorMessage: executionError };
  } else {
    // This case should ideally not happen if flow_true and flow_false always exist and are required.
    // If an error occurred, it's already captured in executionError.
    // If ports are missing, it's a node definition issue.
    if (!executionError) {
        const missingPortError = `条件判断节点 '${node.title}' (ID: ${node.id}) 缺少必要的 True/False 分支输出端口。`;
        console.error(`${logPrefix} ${missingPortError}`);
        if (!executionError) executionError = missingPortError;
        // Ensure error is propagated if no flow path taken due to missing ports
        if (flowTruePort) outputsMap[flowTruePort.id] = { flowSignal: false, error: true, errorMessage: executionError };
        if (flowFalsePort) outputsMap[flowFalsePort.id] = { flowSignal: false, error: true, errorMessage: executionError };
    }
  }
  
  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: executionError 
      ? `错误: ${executionError}` 
      : `条件 '${conditionExpression}' 结果为 ${decision}。已触发 '${decision ? flowTruePort?.label : flowFalsePort?.label}' 分支。`,
    lastRunError: executionError,
    lastExecutionContextId: executionContextId,
  };

  return { outputs: outputsMap, executionDetails };
};

export default executeConditionalNode;
