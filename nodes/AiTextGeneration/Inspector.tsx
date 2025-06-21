
import React, { useState, useEffect, useCallback } from 'react';
import { SpecificNodeInspectorProps, NodeTypeDefinition, NodeExecutionState, GeminiFunctionDeclaration, AiServiceConfig, EditableAiModelConfig, ModelConfigGroup as GlobalModelConfigGroup } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs';
import { ChevronDownIcon } from '../../components/icons';

interface AiTextGenerationInspectorProps extends SpecificNodeInspectorProps {
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  mergedModelConfigs: Array<GlobalModelConfigGroup | EditableAiModelConfig>;
}

const AiTextGenerationInspector: React.FC<AiTextGenerationInspectorProps> = ({
  node,
  updateNodeData,
  executionDetails,
  customTools,
  mergedModelConfigs
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const [prompt, setPrompt] = useState(
    node.data?.defaultPrompt ?? nodeDefinition?.defaultData?.defaultPrompt ?? ''
  );
  const [systemInstruction, setSystemInstruction] = useState(
    node.data?.aiConfig?.systemInstruction ?? nodeDefinition?.defaultData?.aiConfig?.systemInstruction ?? ''
  );
  const [temperature, setTemperature] = useState<string | number>(
    node.data?.aiConfig?.temperature ?? nodeDefinition?.defaultData?.aiConfig?.temperature ?? 0.7
  );
  const [topP, setTopP] = useState<string | number>(
    node.data?.aiConfig?.topP ?? nodeDefinition?.defaultData?.aiConfig?.topP ?? 0.9
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
    setPrompt(node.data?.defaultPrompt ?? nodeDefinition?.defaultData?.defaultPrompt ?? '');
    const currentAiConfig = node.data?.aiConfig || {};
    const defaultAiConfig = nodeDefinition?.defaultData?.aiConfig || {};

    setSelectedModelGroupId(currentAiConfig.aiModelConfigGroupId ?? defaultAiConfig.aiModelConfigGroupId ?? DEFAULT_ENV_GEMINI_CONFIG_ID);
    setSystemInstruction(currentAiConfig.systemInstruction ?? defaultAiConfig.systemInstruction ?? '');
    setTemperature(currentAiConfig.temperature ?? defaultAiConfig.temperature ?? 0.7);
    setTopP(currentAiConfig.topP ?? defaultAiConfig.topP ?? 0.9);
    setTopK(currentAiConfig.topK ?? defaultAiConfig.topK ?? 40);

    const currentThinkingConfig = currentAiConfig.thinkingConfig || {};
    const defaultThinkingConfig = defaultAiConfig.thinkingConfig || {};
    setThinkingBudget(currentThinkingConfig.thinkingBudget ?? defaultThinkingConfig.thinkingBudget ?? '');
    setIncludeThoughts(currentThinkingConfig.includeThoughts ?? defaultThinkingConfig.includeThoughts ?? false);

  }, [node.id, node.data, nodeDefinition?.defaultData]);


  const handleDataUpdate = useCallback((field: string, value: any) => {
    if (field === 'defaultPrompt') {
      updateNodeData(node.id, { defaultPrompt: value });
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
      updateNodeData(node.id, { aiConfig: currentAiConfig });
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
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载AI文本生成节点的检查器：节点定义未找到。</p>;
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
           <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            {`AI配置优先级: 输入端口连接 ${'>'} 此处配置 ${'>'} 模型选择节点 ${'>'} 全局默认。`}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor={`prompt-${node.id}`}>默认提示词 (Prompt)</label>
          <textarea
            id={`prompt-${node.id}`}
            className={`${inputBaseClass} min-h-[80px]`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={(e) => handleDataUpdate('defaultPrompt', e.target.value)}
            onMouseDown={stopPropagationMouseDown}
            aria-label="Prompt"
          />
          <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            {`此提示词将在 '用户输入' 端口未连接或无数据时使用。您可以在此提示词中使用 {{port_id}} 语法来动态插入来自其他输入端口的数据 (例如 {{some_other_input}})。`}
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
          <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>
            {`系统指令用于指导 AI 的行为。您也可以在此处使用 {{port_id}} 语法来动态插入数据。此设置可被连接到“系统指令输入”端口的数据覆盖。`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`temperature-${node.id}`}>Temperature</label>
            <input
              id={`temperature-${node.id}`}
              type="number"
              step="0.01"
              className={inputBaseClass}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              onBlur={(e) => handleDataUpdate('temperature', parseFloat(e.target.value))}
              onMouseDown={stopPropagationMouseDown}
              aria-label="Temperature"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`topP-${node.id}`}>Top P</label>
            <input
              id={`topP-${node.id}`}
              type="number"
              step="0.01"
              className={inputBaseClass}
              value={topP}
              onChange={(e) => setTopP(e.target.value)}
              onBlur={(e) => handleDataUpdate('topP', parseFloat(e.target.value))}
              onMouseDown={stopPropagationMouseDown}
              aria-label="Top P"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`topK-${node.id}`}>Top K</label>
            <input
              id={`topK-${node.id}`}
              type="number"
              step="1"
              min="1"
              className={inputBaseClass}
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              onBlur={(e) => handleDataUpdate('topK', parseInt(e.target.value, 10))}
              onMouseDown={stopPropagationMouseDown}
              aria-label="Top K"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`thinkingBudget-${node.id}`}>思考预算 (ms)</label>
            <input
              id={`thinkingBudget-${node.id}`}
              type="number"
              step="100"
              min="0"
              placeholder="留空或0禁用"
              className={inputBaseClass}
              value={thinkingBudget}
              onChange={(e) => setThinkingBudget(e.target.value)}
              onBlur={(e) => handleDataUpdate('thinkingBudget', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
              onMouseDown={stopPropagationMouseDown}
              aria-label="Thinking Budget in milliseconds"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center">
              <input
                  id={`includeThoughts-${node.id}`}
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700"
                  checked={includeThoughts}
                  onChange={(e) => {
                      setIncludeThoughts(e.target.checked);
                      handleDataUpdate('includeThoughts', e.target.checked);
                  }}
                  onMouseDown={stopPropagationMouseDown}
                  aria-label="Include thoughts"
              />
              <label htmlFor={`includeThoughts-${node.id}`} className={checkboxLabelClass}>
                  包含思考过程 (Include Thoughts)
              </label>
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
                <label className={labelClass}>输出内容:</label>
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

export default AiTextGenerationInspector;
