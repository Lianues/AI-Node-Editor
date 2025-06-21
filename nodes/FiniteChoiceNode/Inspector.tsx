
import React, { useState, useEffect, useCallback } from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition, AiServiceConfig, EditableAiModelConfig, ModelConfigGroup as GlobalModelConfigGroup } from '../../types'; // Added ModelConfigGroup
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs'; // Removed PREDEFINED_MODEL_CONFIG_GROUPS
import { ChevronDownIcon } from '../../components/icons';
// initialEditableConfigsForService is no longer needed here

interface FiniteChoiceInspectorProps extends SpecificNodeInspectorProps {
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  mergedModelConfigs: Array<GlobalModelConfigGroup | EditableAiModelConfig>; // New prop
}

const FiniteChoiceInspector: React.FC<FiniteChoiceInspectorProps> = ({ 
  node, 
  updateNodeData, 
  executionDetails, 
  customTools,
  mergedModelConfigs // Destructure new prop
}) => { 
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const [defaultPrompt, setDefaultPrompt] = useState(
    node.data?.defaultPrompt ?? nodeDefinition?.defaultData?.defaultPrompt ?? ''
  );
  const [systemInstruction, setSystemInstruction] = useState(
    node.data?.aiConfig?.systemInstruction ?? nodeDefinition?.defaultData?.aiConfig?.systemInstruction ?? ''
  );
  const [temperature, setTemperature] = useState<string | number>(
    node.data?.aiConfig?.temperature ?? nodeDefinition?.defaultData?.aiConfig?.temperature ?? 0.5
  );
  const [topP, setTopP] = useState<string | number>(
    node.data?.aiConfig?.topP ?? nodeDefinition?.defaultData?.aiConfig?.topP ?? 0.95
  );
  const [topK, setTopK] = useState<string | number>(
    node.data?.aiConfig?.topK ?? nodeDefinition?.defaultData?.aiConfig?.topK ?? 40
  );
  const [thinkingBudget, setThinkingBudget] = useState<string | number>(
    node.data?.aiConfig?.thinkingConfig?.thinkingBudget ?? nodeDefinition?.defaultData?.aiConfig?.thinkingConfig?.thinkingBudget ?? ''
  );
  const [includeThoughts, setIncludeThoughts] = useState<boolean>(
     node.data?.aiConfig?.thinkingConfig?.includeThoughts ?? nodeDefinition?.defaultData?.aiConfig?.thinkingConfig?.includeThoughts ?? false
  );
  const [selectedModelGroupId, setSelectedModelGroupId] = useState(node.data?.aiConfig?.aiModelConfigGroupId ?? DEFAULT_ENV_GEMINI_CONFIG_ID);

  useEffect(() => {
    setDefaultPrompt(node.data?.defaultPrompt ?? nodeDefinition?.defaultData?.defaultPrompt ?? '');
    const currentAiConfig = node.data?.aiConfig || {};
    const defaultAiConfig = nodeDefinition?.defaultData?.aiConfig || {};

    setSelectedModelGroupId(currentAiConfig.aiModelConfigGroupId ?? defaultAiConfig.aiModelConfigGroupId ?? DEFAULT_ENV_GEMINI_CONFIG_ID);
    setSystemInstruction(currentAiConfig.systemInstruction ?? defaultAiConfig.systemInstruction ?? '');
    setTemperature(currentAiConfig.temperature ?? defaultAiConfig.temperature ?? 0.5);
    setTopP(currentAiConfig.topP ?? defaultAiConfig.topP ?? 0.95);
    setTopK(currentAiConfig.topK ?? defaultAiConfig.topK ?? 40);

    const currentThinkingConfig = currentAiConfig.thinkingConfig || {};
    const defaultThinkingConfig = defaultAiConfig.thinkingConfig || {};
    setThinkingBudget(currentThinkingConfig.thinkingBudget ?? defaultThinkingConfig.thinkingBudget ?? '');
    setIncludeThoughts(currentThinkingConfig.includeThoughts ?? defaultThinkingConfig.includeThoughts ?? false);

  }, [node.id, node.data, nodeDefinition?.defaultData]);

  const handleDataUpdate = useCallback((field: string, value: any) => {
    if (!updateNodeData) return;

    if (field === 'defaultPrompt') {
      updateNodeData(node.id, { ...node.data, defaultPrompt: value });
    } else { 
      const currentAiConfig = JSON.parse(JSON.stringify(node.data?.aiConfig || { ...(nodeDefinition?.defaultData?.aiConfig || {}) })) as AiServiceConfig & { model?: string };
      currentAiConfig.thinkingConfig = currentAiConfig.thinkingConfig || { ...(nodeDefinition?.defaultData?.aiConfig?.thinkingConfig || {}) };
      
      if (field === 'aiModelConfigGroupId') {
        currentAiConfig.aiModelConfigGroupId = value;
      } else if (field === 'thinkingBudget') {
        currentAiConfig.thinkingConfig.thinkingBudget = value === '' ? undefined : Number(value);
      } else if (field === 'includeThoughts') {
        currentAiConfig.thinkingConfig.includeThoughts = value as boolean;
      } else if (field !== 'model') { 
        (currentAiConfig as any)[field] = value;
      }
      delete currentAiConfig.model;
      updateNodeData(node.id, { ...node.data, aiConfig: currentAiConfig });
    }
  }, [node.id, node.data, nodeDefinition?.defaultData, updateNodeData]);

  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const checkboxLabelClass = `ml-2 text-sm ${inspectorTheme.labelText}`;

  const thoughtsToDisplay = executionDetails?.thoughts ? executionDetails.thoughts.split('\n---\n').map((thought, index) => (
    <div key={index} className="mb-2">
      <p className={`text-xs ${inspectorTheme.labelText}`}>思考步骤 {index + 1}:</p>
      <pre className={`text-xs ${inspectorTheme.valueTextMuted} bg-zinc-700 p-1.5 rounded whitespace-pre-wrap break-all`}>{thought.trim()}</pre>
    </div>
  )) : <p className={`text-sm ${inspectorTheme.infoText}`}>无</p>;

  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载节点检查器：节点定义未找到。</p>;
  }
  
  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
      customTools={customTools} 
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor={`aiModelConfigGroupId-${node.id}`}>模型配置组:</label>
          <div className="relative">
            <select
              id={`aiModelConfigGroupId-${node.id}`}
              className={`${inputBaseClass} appearance-none pr-7`}
              value={selectedModelGroupId}
              onChange={(e) => {
                const newGroupId = e.target.value;
                setSelectedModelGroupId(newGroupId);
                handleDataUpdate('aiModelConfigGroupId', newGroupId);
              }}
              onMouseDown={stopPropagationMouseDown}
              aria-label="AI Model Configuration Group"
            >
              {mergedModelConfigs.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                  {('notes' in group && group.notes) ? group.notes : ''}
                  </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor={`prompt-${node.id}`}>默认提示词 (Prompt)</label>
          <textarea
            id={`prompt-${node.id}`}
            className={`${inputBaseClass} min-h-[80px]`}
            value={defaultPrompt}
            onChange={(e) => setDefaultPrompt(e.target.value)}
            onBlur={(e) => handleDataUpdate('defaultPrompt', e.target.value)}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Default Prompt"
          />
          <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            {`当 '判断内容' 端口未连接时使用。使用 \`{{user_input}}\` 插入判断内容，使用 \`{{available_choices_as_string}}\` 插入可用选项列表 (例如: [\"选项A\", \"选项B\"])。选项列表将根据配置为 "AI选项" 的输出端口的标签动态生成。`}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor={`systemInstruction-${node.id}`}>系统指令 (System Instruction)</label>
          <textarea
            id={`systemInstruction-${node.id}`}
            className={`${inputBaseClass} min-h-[60px]`}
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            onBlur={(e) => handleDataUpdate('systemInstruction', e.target.value)}
            onMouseDown={stopPropagationMouseDown}
            aria-label="System Instruction"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`temperature-${node.id}`}>Temperature</label>
            <input
              id={`temperature-${node.id}`} type="number" step="0.01" className={inputBaseClass}
              value={temperature} onChange={(e) => setTemperature(e.target.value)}
              onBlur={(e) => handleDataUpdate('temperature', parseFloat(e.target.value))}
              onMouseDown={stopPropagationMouseDown} aria-label="Temperature"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`topP-${node.id}`}>Top P</label>
            <input
              id={`topP-${node.id}`} type="number" step="0.01" className={inputBaseClass}
              value={topP} onChange={(e) => setTopP(e.target.value)}
              onBlur={(e) => handleDataUpdate('topP', parseFloat(e.target.value))}
              onMouseDown={stopPropagationMouseDown} aria-label="Top P"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`topK-${node.id}`}>Top K</label>
            <input
              id={`topK-${node.id}`} type="number" step="1" min="1" className={inputBaseClass}
              value={topK} onChange={(e) => setTopK(e.target.value)}
              onBlur={(e) => handleDataUpdate('topK', parseInt(e.target.value, 10))}
              onMouseDown={stopPropagationMouseDown} aria-label="Top K"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`thinkingBudget-${node.id}`}>思考预算 (ms)</label>
            <input
              id={`thinkingBudget-${node.id}`} type="number" step="100" min="0"
              placeholder="留空或0禁用" className={inputBaseClass}
              value={thinkingBudget} onChange={(e) => setThinkingBudget(e.target.value)}
              onBlur={(e) => handleDataUpdate('thinkingBudget', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
              onMouseDown={stopPropagationMouseDown} aria-label="Thinking Budget"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center">
            <input
              id={`includeThoughts-${node.id}`} type="checkbox"
              className="h-4 w-4 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700"
              checked={includeThoughts}
              onChange={(e) => { setIncludeThoughts(e.target.checked); handleDataUpdate('includeThoughts', e.target.checked); }}
              onMouseDown={stopPropagationMouseDown} aria-label="Include thoughts"
            />
            <label htmlFor={`includeThoughts-${node.id}`} className={checkboxLabelClass}>包含思考过程</label>
          </div>
          <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>模型: gemini-2.5-flash-preview-04-17。选中后，模型会尝试返回其思考步骤。</p>
        </div>

        <hr className={`border-t ${vscodeDarkTheme.contextMenu.separator} my-3`} />

        <div>
          <h3 className={`text-md font-semibold ${inspectorTheme.headerText} mb-2`}>上次运行详情</h3>
          {executionDetails ? (
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Token 数量:</label>
                <p className={`text-sm ${inspectorTheme.valueText}`}>{executionDetails.tokenCount ?? 'N/A'}</p>
              </div>
              <div>
                <label className={labelClass}>输出内容 (AI选择):</label>
                <pre className={`text-sm ${inspectorTheme.valueTextMuted} bg-zinc-700 p-2 rounded max-h-48 overflow-y-auto whitespace-pre-wrap break-all`}>
                  {executionDetails.outputContent ?? 'N/A'}
                </pre>
              </div>
              <div>
                <label className={labelClass}>思考过程:</label>
                <div className="max-h-60 overflow-y-auto p-1 border border-zinc-700 rounded-md">
                  {thoughtsToDisplay}
                </div>
              </div>
              {executionDetails.lastRunError && (
                <div>
                  <label className={labelClass}>上次运行错误:</label>
                  <pre className={`text-sm ${inspectorTheme.warningText} bg-zinc-700 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap break-all`}>
                    {executionDetails.lastRunError}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-sm ${inspectorTheme.infoText}`}>尚未运行或无运行详情。</p>
          )}
        </div>
      </div>
    </BaseNodeInspector>
  );
};

export default FiniteChoiceInspector;