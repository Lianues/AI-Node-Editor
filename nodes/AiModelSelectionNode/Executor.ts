
import { Node, WorkflowServices, AiServiceConfig, NodeExecutionState, ModelConfigGroup, EditableAiModelConfig, PortDataType } from '../../types';
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs';
import { getFullAiConfigFromGroupId as getFullAiConfigFromGroupIdUtil } from '../../features/ai/execution/commonAiExecutorUtils';

export const executeAiModelSelectionNode = async (
  node: Node,
  inputs: Record<string, any>, 
  services: WorkflowServices & { getMergedModelConfigs?: () => Array<ModelConfigGroup | EditableAiModelConfig> }
): Promise<{
  outputs: Record<string, any>;
  executionDetails?: NodeExecutionState['executionDetails'];
}> => {
  const logPrefix = `[AiModelSelectionExec ${node.id}]`;
  const outputsMap: Record<string, any> = {};
  let executionError: string | undefined = undefined;
  let outputConfigForPort: Partial<AiServiceConfig> | null = null;

  const groupId = node.data?.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;
  const modelOverride = node.data?.modelOverride?.trim() || '';

  if (!services.getMergedModelConfigs) {
    executionError = "无法访问AI模型配置服务。";
  } else {
    const allConfigs = services.getMergedModelConfigs();
    const resolvedGroupConfig = getFullAiConfigFromGroupIdUtil(groupId, allConfigs);

    if (!resolvedGroupConfig) {
      executionError = `AI模型配置组 '${groupId}' 未找到。`;
    } else {
      const modelToUse = modelOverride || resolvedGroupConfig.model;

      // Construct the simplified output object
      outputConfigForPort = {
        aiModelConfigGroupId: groupId,
        model: modelToUse,
      };
      outputsMap['ai_config_out'] = outputConfigForPort;
    }
  }

  // Pass through flow signal
  const flowEndPort = node.outputs.find(p => p.id === 'flow_end' && p.dataType === PortDataType.FLOW);
  if (flowEndPort) {
    outputsMap[flowEndPort.id] = { flowSignal: true, error: !!executionError, errorMessage: executionError };
  }

  const executionDetails: NodeExecutionState['executionDetails'] = {
    outputContent: executionError 
      ? `错误: ${executionError}` 
      : `已选择模型: ${outputConfigForPort?.model || '未知'} (组: ${groupId})`,
    lastRunError: executionError,
  };

  return { outputs: outputsMap, executionDetails };
};

export default executeAiModelSelectionNode;