
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomContentRendererProps, EditableAiModelConfig } from '../../types';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { ChevronDownIcon } from '../../components/icons';
import { PREDEFINED_MODEL_CONFIG_GROUPS, DEFAULT_ENV_GEMINI_CONFIG_ID, ModelConfigGroup } from '../../globalModelConfigs';

export const AiModelSelectionNodeContent: React.FC<CustomContentRendererProps & { mergedModelConfigs?: Array<ModelConfigGroup | EditableAiModelConfig> }> = ({ 
  node, 
  updateNodeData,
  mergedModelConfigs = PREDEFINED_MODEL_CONFIG_GROUPS // Fallback, ideally passed from App or context
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    node.data?.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID
  );
  // currentModelName will store the value for the input field.
  // It will be the override if set, otherwise the default of the selected group.
  const [currentModelName, setCurrentModelName] = useState<string>('');

  const selectedGroupDetails = useMemo(() => 
    mergedModelConfigs.find(g => g.id === selectedGroupId),
    [mergedModelConfigs, selectedGroupId]
  );

  // Effect to sync selectedGroupId from node.data.aiModelConfigGroupId
  useEffect(() => {
    const newGroupIdFromNodeData = node.data?.aiModelConfigGroupId || DEFAULT_ENV_GEMINI_CONFIG_ID;
    if (selectedGroupId !== newGroupIdFromNodeData) {
      setSelectedGroupId(newGroupIdFromNodeData);
    }
  }, [node.data?.aiModelConfigGroupId, selectedGroupId]);

  // Effect to set the displayed model name (currentModelName) based on override or group default
  useEffect(() => {
    const group = mergedModelConfigs.find(g => g.id === selectedGroupId);
    const defaultModelFromGroup = group ? ('defaultModel' in group ? group.defaultModel : group.model) : '';
    
    const modelOverrideFromNode = node.data?.modelOverride;

    let modelToDisplay: string;
    if (modelOverrideFromNode && modelOverrideFromNode.trim() !== '') {
      modelToDisplay = modelOverrideFromNode;
    } else {
      modelToDisplay = defaultModelFromGroup;
    }
    
    if (currentModelName !== modelToDisplay) {
      setCurrentModelName(modelToDisplay);
    }
  }, [node.data?.modelOverride, selectedGroupId, mergedModelConfigs, currentModelName]);


  const handleGroupChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroupIdFromEvent = event.target.value;

    // Guard: Only process the change if the selected option actually exists in the current list of mergedModelConfigs.
    // This helps prevent processing spurious onChange events fired by the browser
    // when the select's value prop doesn't match any available option (e.g., during async loading of options).
    const optionExists = mergedModelConfigs.some(group => group.id === newGroupIdFromEvent);
    if (!optionExists) {
      // console.warn(`[AiModelSelectionNodeContent] onChange for group ignored: Value '${newGroupIdFromEvent}' not in current options. This might be a browser default selection during async option loading.`);
      return;
    }
  
    if (updateNodeData) {
      updateNodeData(node.id, { 
        ...node.data, 
        aiModelConfigGroupId: newGroupIdFromEvent,
      });
    }
  }, [updateNodeData, node.id, node.data, mergedModelConfigs]);

  const handleModelNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentModelName(event.target.value);
  }, []);

  const handleModelNameBlur = useCallback(() => {
    if (updateNodeData) {
      const group = mergedModelConfigs.find(g => g.id === selectedGroupId);
      const defaultModelFromGroup = group ? ('defaultModel' in group ? group.defaultModel : group.model) : '';
      
      const finalModelOverride = (currentModelName.trim() === defaultModelFromGroup.trim() || currentModelName.trim() === '') 
        ? '' 
        : currentModelName.trim();

      if (node.data?.modelOverride !== finalModelOverride) {
        updateNodeData(node.id, { ...node.data, modelOverride: finalModelOverride });
      }
    }
  }, [updateNodeData, node.id, node.data, selectedGroupId, currentModelName, mergedModelConfigs]);
  
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
  
  const placeholderText = selectedGroupDetails 
    ? ('defaultModel' in selectedGroupDetails ? selectedGroupDetails.defaultModel : selectedGroupDetails.model) 
    : '选择组以查看默认模型';

  return (
    <div 
      className="p-2 space-y-2 h-full box-border overflow-hidden"
      onMouseDown={stopPropagation} 
      onClick={stopPropagation}
    >
      <div>
        <label htmlFor={`model-group-select-${node.id}`} className={labelClass}>模型配置组:</label>
        <div className="relative">
          <select
            id={`model-group-select-${node.id}`}
            className={`${inputBaseClass} appearance-none pr-7`}
            value={selectedGroupId}
            onChange={handleGroupChange}
            aria-label="AI Model Configuration Group"
          >
            {mergedModelConfigs.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
                {'notes' in group && group.notes ? group.notes : ''}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      </div>
      <div>
        <label htmlFor={`model-name-override-${node.id}`} className={labelClass}>模型名称 (可选覆盖):</label>
        <input
          id={`model-name-override-${node.id}`}
          type="text"
          className={inputBaseClass}
          value={currentModelName} // Value is now managed to show default if override is empty
          onChange={handleModelNameChange}
          onBlur={handleModelNameBlur}
          placeholder={placeholderText} // Placeholder shows the default if input is cleared
          aria-label="Override Model Name"
        />
      </div>
    </div>
  );
};