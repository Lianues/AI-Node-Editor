
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { PlusIcon, TrashIcon, PencilSquareIcon } from '../../icons';
import { PREDEFINED_MODEL_CONFIG_GROUPS, ModelConfigGroup, DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../../globalModelConfigs'; 
import * as geminiService from '../../../services/geminiService';
import { SpinnerIcon } from '../../icons/SpinnerIcon';


export type ApiFormat = 'gemini' | 'openai';

export interface EditableAiModelConfig {
  id: string;
  name: string;
  format: ApiFormat;
  apiUrl: string;
  apiKey: string;
  model: string; 
}

const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'; 
const DEFAULT_GEMINI_MODEL = PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === DEFAULT_ENV_GEMINI_CONFIG_ID)?.defaultModel || "gemini-2.5-flash-preview-04-17";
const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';


// This is used to initialize the editable state in App.tsx for predefined groups that allow API key editing.
export const initialEditableConfigsForService: EditableAiModelConfig[] = PREDEFINED_MODEL_CONFIG_GROUPS
  .filter(group => group.id !== DEFAULT_ENV_GEMINI_CONFIG_ID) 
  .map(group => ({
    id: group.id,
    name: group.name,
    format: group.format,
    apiUrl: group.apiUrl || (group.format === 'gemini' ? DEFAULT_GEMINI_API_URL : DEFAULT_OPENAI_API_URL),
    apiKey: '', 
    model: group.defaultModel, 
  }));


interface AiModelConfigSettingsProps {
  editableConfigs: EditableAiModelConfig[]; 
  setEditableConfigs: React.Dispatch<React.SetStateAction<EditableAiModelConfig[]>>;
  selectedConfigKey: string;
  setSelectedConfigKey: (key: string) => void;
  onAddNewConfig: () => void;
  onRenameSelectedConfig: () => void; 
  onDeleteSelectedConfig: () => void;
  isRenamingGroup: boolean;
  setIsRenamingGroup: React.Dispatch<React.SetStateAction<boolean>>;
  renameGroupValue: string;
  setRenameGroupValue: React.Dispatch<React.SetStateAction<string>>;
  currentSelectedEditableConfig?: EditableAiModelConfig | null; // Added this prop
  mergedModelConfigs: Array<ModelConfigGroup | EditableAiModelConfig>; 
}

export const AiModelConfigSettings: React.FC<AiModelConfigSettingsProps> = ({
  editableConfigs, 
  setEditableConfigs,
  selectedConfigKey,
  setSelectedConfigKey,
  onAddNewConfig,
  onRenameSelectedConfig,
  onDeleteSelectedConfig,
  isRenamingGroup,
  setIsRenamingGroup,
  renameGroupValue,
  setRenameGroupValue,
  currentSelectedEditableConfig, // Destructure the new prop
  mergedModelConfigs,
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const buttonTheme = vscodeDarkTheme.topBar;

  const [currentEditFormat, setCurrentEditFormat] = useState<ApiFormat>('gemini');
  const [currentEditApiUrl, setCurrentEditApiUrl] = useState('');
  const [currentEditApiKey, setCurrentEditApiKey] = useState('');
  const [currentEditModel, setCurrentEditModel] = useState(DEFAULT_GEMINI_MODEL);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // currentSelectedEditableConfig is now passed as a prop, no need to derive it here.

  const selectedConfigDetails = useMemo(() => 
    mergedModelConfigs.find(c => c.id === selectedConfigKey),
  [mergedModelConfigs, selectedConfigKey]);

  const isEnvVarSelected = selectedConfigKey === DEFAULT_ENV_GEMINI_CONFIG_ID;
  const isPredefinedEditableSelected = PREDEFINED_MODEL_CONFIG_GROUPS.some(pg => pg.id === selectedConfigKey && pg.id !== DEFAULT_ENV_GEMINI_CONFIG_ID);
  const isUserCustomSelected = !isEnvVarSelected && !isPredefinedEditableSelected;


  const loadConfigIntoFormFields = useCallback((configId: string) => {
    setTestResult(null); 
    setTestError(null);
    const configToLoad = mergedModelConfigs.find(c => c.id === configId);

    if (configToLoad) {
      if ('defaultModel' in configToLoad) { // It's a ModelConfigGroup (predefined)
        setCurrentEditFormat(configToLoad.format);
        setCurrentEditApiUrl(configToLoad.apiUrl || (configToLoad.format === 'gemini' ? DEFAULT_GEMINI_API_URL : DEFAULT_OPENAI_API_URL));
        // For predefined, apiKey comes from the corresponding item in `editableConfigs`
        const editableCounterpart = editableConfigs.find(ec => ec.id === configToLoad.id);
        setCurrentEditApiKey(editableCounterpart?.apiKey || '');
        setCurrentEditModel(configToLoad.defaultModel);
      } else { // It's an EditableAiModelConfig (user-defined or editable predefined)
        setCurrentEditFormat(configToLoad.format);
        setCurrentEditApiUrl(configToLoad.apiUrl);
        setCurrentEditApiKey(configToLoad.apiKey);
        setCurrentEditModel(configToLoad.model);
      }
    } else { // Fallback if somehow not found (e.g., after delete then trying to load)
        setCurrentEditFormat('gemini');
        setCurrentEditApiUrl(DEFAULT_GEMINI_API_URL);
        setCurrentEditApiKey('');
        setCurrentEditModel(DEFAULT_GEMINI_MODEL);
    }
  }, [mergedModelConfigs, editableConfigs]);

  useEffect(() => {
    loadConfigIntoFormFields(selectedConfigKey);
  }, [selectedConfigKey, loadConfigIntoFormFields]);


  const handleFieldChangeAndUpdateParent = (field: keyof Omit<EditableAiModelConfig, 'id' | 'name'>, value: string | ApiFormat) => {
    if (isEnvVarSelected) return; // Cannot edit ENV var config

    const selectedEditable = editableConfigs.find(c => c.id === selectedConfigKey);
    if (!selectedEditable && !isPredefinedEditableSelected) return; // Should not happen for user custom


    let newApiUrl = currentEditApiUrl;
    let newModelVal = currentEditModel;

    if (field === 'format') {
      setCurrentEditFormat(value as ApiFormat);
      const newFormat = value as ApiFormat;
      if (newFormat === 'gemini') {
        newApiUrl = (currentEditApiUrl === DEFAULT_OPENAI_API_URL || currentEditApiUrl === '') ? DEFAULT_GEMINI_API_URL : currentEditApiUrl;
        newModelVal = (currentEditModel === DEFAULT_OPENAI_MODEL || currentEditModel === '') ? DEFAULT_GEMINI_MODEL : currentEditModel;
      } else { // openai
        newApiUrl = (currentEditApiUrl === DEFAULT_GEMINI_API_URL || currentEditApiUrl === '') ? DEFAULT_OPENAI_API_URL : currentEditApiUrl;
        newModelVal = (currentEditModel === DEFAULT_GEMINI_MODEL || currentEditModel === '') ? DEFAULT_OPENAI_MODEL : currentEditModel;
      }
      setCurrentEditApiUrl(newApiUrl);
      setCurrentEditModel(newModelVal);
    }
    else if (field === 'apiUrl') { newApiUrl = value as string; setCurrentEditApiUrl(newApiUrl); }
    else if (field === 'apiKey') setCurrentEditApiKey(value as string);
    else if (field === 'model') { newModelVal = value as string; setCurrentEditModel(newModelVal); }
    
    setEditableConfigs(prev => prev.map(c => {
      if (c.id === selectedConfigKey) {
        const updatedConfig = { ...c, [field]: value };
        if (field === 'format') {
          updatedConfig.apiUrl = newApiUrl;
          updatedConfig.model = newModelVal;
        } else if (field === 'model') {
          updatedConfig.model = newModelVal;
        }
        return updatedConfig;
      }
      return c;
    }));
  };
  
  const handleTestConfiguration = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    let serviceCallConfig: {
        apiFormat: 'gemini' | 'openai';
        model: string;
        prompt: string;
        apiKey?: string;
        apiUrl?: string;
    };

    if (isEnvVarSelected) {
        const envGroup = PREDEFINED_MODEL_CONFIG_GROUPS.find(g => g.id === DEFAULT_ENV_GEMINI_CONFIG_ID);
        serviceCallConfig = {
            apiFormat: 'gemini',
            model: currentEditModel, 
            prompt: "你好，请问你工作正常吗？",
            // apiKey and apiUrl are implicitly from ENV for this group
        };
    } else if (selectedConfigDetails) { // For both predefined-editable and user-custom
        serviceCallConfig = {
            apiFormat: currentEditFormat,
            model: currentEditModel,
            prompt: "Hello, are you working?",
            apiKey: currentEditApiKey, // This is the live value from the form state
            apiUrl: currentEditApiUrl,   // This is the live value from the form state
        };
    } else {
        setTestError("没有选定的配置可供测试。");
        setIsTesting(false);
        return;
    }
    
    try {
        const result = await geminiService.testAiModel(serviceCallConfig);
        if (result?.text) {
            setTestResult(result.text.substring(0, 100) + (result.text.length > 100 ? "..." : ""));
        } else if (result?.error) {
            setTestError(result.error);
        } else {
            setTestError("测试未返回有效响应。");
        }
    } catch (e) {
        setTestError(e instanceof Error ? e.message : "测试期间发生未知错误。");
    } finally {
        setIsTesting(false);
    }
  };


  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  
  // Use the passed-in currentSelectedEditableConfig for disabling buttons
  const disableRename = isEnvVarSelected || !currentSelectedEditableConfig;
  const disableDelete = isEnvVarSelected || !currentSelectedEditableConfig;


  return (
    <div>
      <h3 className={`text-lg font-semibold ${inspectorTheme.headerText} mb-3`}>AI模型配置</h3>
      
      <div className="mb-4 p-3 border border-zinc-700 rounded-md bg-zinc-900/30">
        <label htmlFor="config-group-select" className={`${labelClass} mb-1.5`}>当前配置:</label>
        <div className="flex items-center space-x-2 mb-2">
          <select
            id="config-group-select"
            value={selectedConfigKey}
            onChange={(e) => setSelectedConfigKey(e.target.value)}
            className={`${inputBaseClass} flex-grow`}
            aria-label="选择AI模型配置"
          >
            {/* Display all merged configs in the dropdown */}
            {mergedModelConfigs.map(conf => (
              <option key={conf.id} value={conf.id}>
                {conf.name}
                {'notes' in conf && conf.notes ? conf.notes : ''}
                </option>
            ))}
          </select>
          <button 
            onClick={onAddNewConfig}
            className={`${buttonTheme.buttonPrimaryBg} p-1.5 rounded-md hover:${buttonTheme.buttonPrimaryBgHover}`}
            title="添加新配置"
            aria-label="添加新AI模型配置"
          >
            <PlusIcon className={`w-4 h-4 ${buttonTheme.buttonPrimaryText}`} />
          </button>
           <button 
            onClick={() => { 
                if (currentSelectedEditableConfig) { // Use prop here
                  setIsRenamingGroup(true); 
                  setRenameGroupValue(currentSelectedEditableConfig.name); 
                }
              }}
            className={`${buttonTheme.buttonDefaultBg} p-1.5 rounded-md hover:${buttonTheme.buttonDefaultBgHover} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="重命名所选配置"
            aria-label="重命名当前AI模型配置"
            disabled={disableRename} // Use prop-derived disable state
          >
            <PencilSquareIcon className={`w-4 h-4 ${buttonTheme.buttonDefaultText}`} />
          </button>
          <button 
            onClick={onDeleteSelectedConfig}
            className={`${buttonTheme.buttonDefaultBg} p-1.5 rounded-md hover:bg-red-700/50 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="删除所选配置"
            aria-label="删除当前AI模型配置"
            disabled={disableDelete} // Use prop-derived disable state
          >
            <TrashIcon className={`w-4 h-4 ${buttonTheme.buttonDefaultText} hover:text-red-300`} />
          </button>
        </div>
        {isRenamingGroup && currentSelectedEditableConfig && ( // Use prop here
          <div className="flex items-center space-x-2 mt-2 animation-fadeInQuick">
            <input 
              type="text" 
              value={renameGroupValue}
              onChange={(e) => setRenameGroupValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRenameSelectedConfig()}
              className={`${inputBaseClass} flex-grow`}
              placeholder="输入新名称"
              aria-label="输入新的配置名称"
            />
            <button onClick={onRenameSelectedConfig} className={`${buttonTheme.buttonPrimaryBg} text-xs px-2 py-1 rounded-md`}>保存</button>
            <button onClick={() => setIsRenamingGroup(false)} className={`${buttonTheme.buttonDefaultBg} text-xs px-2 py-1 rounded-md`}>取消</button>
          </div>
        )}
      </div>

      {isEnvVarSelected ? (
        <div className={`p-3 rounded-md ${inspectorTheme.valueTextMuted} bg-zinc-700/50 border border-zinc-600 text-sm`}>
          此配置使用通过 <code>process.env.API_KEY</code> 环境变量设置的 Gemini API 密钥。
          <div className="mt-2">
            <label htmlFor="env-config-model" className={labelClass}>模型 (预设):</label>
            <input id="env-config-model" type="text" value={currentEditModel} className={`${inputBaseClass} bg-zinc-600 cursor-not-allowed`} disabled aria-label="模型名称 (环境变量)"/>
          </div>
           <div className="mt-2">
            <label htmlFor="env-config-format" className={labelClass}>API 格式 (预设):</label>
            <input id="env-config-format" type="text" value={currentEditFormat} className={`${inputBaseClass} bg-zinc-600 cursor-not-allowed`} disabled aria-label="API 格式 (环境变量)"/>
          </div>
        </div>
      ) : selectedConfigDetails ? ( 
        // This block now handles both user-custom and predefined-editable configs
        <div className="space-y-3 animation-fadeInQuick">
          <div>
            <label htmlFor="config-format" className={labelClass}>API 格式:</label>
            <select
              id="config-format"
              value={currentEditFormat}
              onChange={(e) => handleFieldChangeAndUpdateParent('format', e.target.value as ApiFormat)}
              className={inputBaseClass}
              aria-label="API格式"
              disabled={!isUserCustomSelected} // Format only editable for fully custom user configs
            >
              <option value="gemini">Gemini 格式</option>
              <option value="openai">OpenAI 格式</option>
            </select>
             {!isUserCustomSelected && <p className="text-xs text-zinc-400 mt-1">此预定义配置的API格式不可更改。</p>}
          </div>
          <div>
            <label htmlFor="config-api-url" className={labelClass}>API URL:</label>
            <input
              id="config-api-url" type="text" value={currentEditApiUrl}
              onChange={(e) => handleFieldChangeAndUpdateParent('apiUrl', e.target.value)}
              className={inputBaseClass}
              placeholder={currentEditFormat === 'gemini' ? DEFAULT_GEMINI_API_URL : DEFAULT_OPENAI_API_URL}
              aria-label="API URL"
              disabled={!isUserCustomSelected && currentEditFormat === 'openai' && selectedConfigDetails.id === 'google_openai_compat_gemini'} // Disable URL for OpenAI compat Gemini
            />
             {(!isUserCustomSelected && currentEditFormat === 'openai' && selectedConfigDetails.id === 'google_openai_compat_gemini') && 
                <p className="text-xs text-zinc-400 mt-1">此预定义配置的API URL不可更改。</p>}
          </div>
          <div>
            <label htmlFor="config-api-key" className={labelClass}>API Key:</label>
            <input
              id="config-api-key" type="password" value={currentEditApiKey}
              onChange={(e) => handleFieldChangeAndUpdateParent('apiKey', e.target.value)}
              className={inputBaseClass}
              placeholder="输入您的 API 密钥"
              aria-label="API Key"
              // API Key is always editable for non-ENV_GEMINI groups
            />
          </div>
          <div>
            <label htmlFor="config-model" className={labelClass}>模型:</label>
            <input
              id="config-model" type="text" value={currentEditModel}
              onChange={(e) => handleFieldChangeAndUpdateParent('model', e.target.value)}
              className={inputBaseClass}
              placeholder={currentEditFormat === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL}
              aria-label="模型名称"
              disabled={!isUserCustomSelected && selectedConfigDetails.id === 'google_openai_compat_gemini'} // Disable Model for OpenAI compat Gemini
            />
             {(!isUserCustomSelected && selectedConfigDetails.id === 'google_openai_compat_gemini') &&
                <p className="text-xs text-zinc-400 mt-1">此预定义配置的模型不可更改。</p>}
          </div>
        </div>
      ) : (
           <div className={`p-3 rounded-md ${inspectorTheme.valueTextMuted} bg-zinc-700/50 border border-zinc-600 text-sm text-center`}>
              请从上方选择一个配置进行编辑，或创建一个新配置。
          </div>
      )}
      
      {(isEnvVarSelected || selectedConfigDetails) && (
        <div className="mt-4 pt-3 border-t border-zinc-700">
          <button
            onClick={handleTestConfiguration}
            disabled={isTesting || (currentSelectedEditableConfig && !currentSelectedEditableConfig.apiKey && !isEnvVarSelected)}
            className={`w-full ${buttonTheme.buttonPrimaryBg} hover:${buttonTheme.buttonPrimaryBgHover} ${buttonTheme.buttonPrimaryText} text-sm px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center`}
          >
            {isTesting ? (
              <>
                <SpinnerIcon className="w-4 h-4 mr-2" /> 测试中...
              </>
            ) : (
              "测试配置"
            )}
          </button>
           {currentSelectedEditableConfig && !currentSelectedEditableConfig.apiKey && !isEnvVarSelected && (
             <p className="text-xs text-yellow-400 mt-1 text-center">需要 API Key 才能测试此配置。</p>
           )}
          {(testResult || testError) && (
            <div className={`mt-3 p-2 text-xs rounded-md border ${
              testError 
                ? 'bg-red-900/30 text-red-300 border-red-700' 
                : 'bg-green-900/30 text-green-300 border-green-700'
            }`}>
              <strong className="block mb-0.5">{testError ? '测试失败:' : '测试成功:'}</strong>
              <pre className="whitespace-pre-wrap break-all">{testError || testResult}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
