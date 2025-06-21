
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { XMarkIcon, PlusIcon, ChevronDownIcon } from '../icons'; 
import { PortDataType, RegisteredAiTool, EditableAiModelConfig, ModelConfigGroup as GlobalModelConfigGroup } from '../../types'; // Added ModelConfigGroup
import { AVAILABLE_AI_TOOLS } from '../../features/ai/tools/availableAiTools';
import { getDefaultHexColorFromTailwind, getDefaultHexColorFromTailwindText } from '../../utils/colorUtils'; 
import { DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs'; // Removed PREDEFINED_MODEL_CONFIG_GROUPS


export interface CustomPortConfig {
  uniqueId: string;
  id: string;
  label: string;
  dataType: PortDataType;
  isRequired: boolean;
  useTool?: boolean; 
  toolName?: string; 
}

export interface CustomAiNodeFormData {
  name: string;
  description: string;
  headerColor?: string; 
  customStyles?: {      
    customMainTitleColor?: string;
    customSubtitleColor?: string;
  };
  aiConfig: {
    aiModelConfigGroupId?: string; 
    systemInstruction: string;
    defaultPrompt?: string; 
    temperature?: number;
    topP?: number;
    topK?: number;
    thinkingBudget?: number;
    includeThoughts?: boolean;
  };
  customInputs: CustomPortConfig[];
  customOutputs: CustomPortConfig[];
}

interface CreateCustomAiNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: CustomAiNodeFormData) => void;
  customTools: RegisteredAiTool[];
  mergedModelConfigs: Array<GlobalModelConfigGroup | EditableAiModelConfig>; // New prop
}

const sanitizePortId = (label: string): string => {
  return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30) || `port_${Date.now()}`;
};

const isValidHexColor = (color: string): boolean => /^#([0-9A-F]{3}){1,2}$/i.test(color);

const DEFAULT_HEADER_BG_COLOR_HEX = '#0d9488'; 
const DEFAULT_MAIN_TITLE_COLOR_HEX = '#f1f5f9';  
const DEFAULT_SUBTITLE_COLOR_HEX = '#94a3b8'; 


const CreateCustomAiNodeModal: React.FC<CreateCustomAiNodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customTools,
  mergedModelConfigs, // Destructure new prop
}) => {
  const theme = vscodeDarkTheme.contextMenu;
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const buttonTheme = vscodeDarkTheme.topBar;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [headerColorHex, setHeaderColorHex] = useState(DEFAULT_HEADER_BG_COLOR_HEX);
  const [mainTitleColorHex, setMainTitleColorHex] = useState(DEFAULT_MAIN_TITLE_COLOR_HEX);
  const [subtitleColorHex, setSubtitleColorHex] = useState(DEFAULT_SUBTITLE_COLOR_HEX);

  const [aiModelConfigGroupId, setAiModelConfigGroupId] = useState(DEFAULT_ENV_GEMINI_CONFIG_ID); 
  const [systemInstruction, setSystemInstruction] = useState('你是一个乐于助人的助手。');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [temperature, setTemperature] = useState<string | number>(0.7);
  const [topP, setTopP] = useState<string | number>(0.9);
  const [topK, setTopK] = useState<string | number>(40);
  const [thinkingBudget, setThinkingBudget] = useState<string | number>('');
  const [includeThoughts, setIncludeThoughts] = useState<boolean>(false);

  const [customInputs, setCustomInputs] = useState<CustomPortConfig[]>([]);
  const [customOutputs, setCustomOutputs] = useState<CustomPortConfig[]>([]);
  const [portLabelError, setPortLabelError] = useState<Record<string, string | null>>({});

  const allToolsForDropdown = useMemo(() => {
    return [...AVAILABLE_AI_TOOLS, ...(customTools || [])];
  }, [customTools]);
  

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setHeaderColorHex(DEFAULT_HEADER_BG_COLOR_HEX);
    setMainTitleColorHex(DEFAULT_MAIN_TITLE_COLOR_HEX);
    setSubtitleColorHex(DEFAULT_SUBTITLE_COLOR_HEX);
    setAiModelConfigGroupId(DEFAULT_ENV_GEMINI_CONFIG_ID); 
    setSystemInstruction('你是一个乐于助人的助手。');
    setDefaultPrompt('');
    setTemperature(0.7);
    setTopP(0.9);
    setTopK(40);
    setThinkingBudget('');
    setIncludeThoughts(false);
    setCustomInputs([]);
    setCustomOutputs([]);
    setError(null);
    setPortLabelError({});
  }, []);
  
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setError("节点名称不能为空。");
      return;
    }
    let hasPortErrors = false;
    const validatePorts = (ports: CustomPortConfig[], type: '输入' | '输出') => {
      ports.forEach(port => {
        if (!port.label.trim()) {
          setPortLabelError(prev => ({ ...prev, [port.uniqueId]: `${type}端口标签不能为空。` }));
          hasPortErrors = true;
        }
        const sanitizedId = sanitizePortId(port.label);
        const otherPorts = (type === '输入' ? customInputs : customOutputs).filter(p => p.uniqueId !== port.uniqueId);
        if (otherPorts.some(op => sanitizePortId(op.label) === sanitizedId)) {
          setPortLabelError(prev => ({ ...prev, [port.uniqueId]: `${type}端口 ID '${sanitizedId}' (来自标签) 必须唯一。`}));
          hasPortErrors = true;
        }
      });
    };
    validatePorts(customInputs, '输入');
    validatePorts(customOutputs, '输出');

    if (hasPortErrors) {
      setError("请修正端口配置错误。");
      return;
    }
    setError(null);

    onSave({
      name,
      description,
      headerColor: headerColorHex, 
      customStyles: {
        customMainTitleColor: mainTitleColorHex,
        customSubtitleColor: subtitleColorHex,
      },
      aiConfig: {
        aiModelConfigGroupId,
        systemInstruction,
        defaultPrompt,
        temperature: parseFloat(String(temperature)) || undefined,
        topP: parseFloat(String(topP)) || undefined,
        topK: parseInt(String(topK), 10) || undefined,
        thinkingBudget: thinkingBudget === '' ? undefined : parseInt(String(thinkingBudget), 10),
        includeThoughts,
      },
      customInputs: customInputs.map(p => ({ ...p, id: sanitizePortId(p.label) })),
      customOutputs: customOutputs.map(p => ({ ...p, id: sanitizePortId(p.label) })),
    });
    resetForm();
  }, [
      name, description, headerColorHex, mainTitleColorHex, subtitleColorHex,
      aiModelConfigGroupId, systemInstruction, defaultPrompt, temperature, topP, topK, thinkingBudget, includeThoughts, 
      customInputs, customOutputs, onSave, resetForm
  ]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const addPort = (type: 'input' | 'output') => {
    const newPort: CustomPortConfig = {
      uniqueId: `port_${type}_${Date.now()}`,
      id: '',
      label: `新${type === 'input' ? '输入' : '输出'}${type === 'input' ? customInputs.length + 1 : customOutputs.length + 1}`,
      dataType: PortDataType.STRING,
      isRequired: false,
      useTool: false, 
      toolName: allToolsForDropdown.length > 0 ? allToolsForDropdown[0].declaration.name : undefined, 
    };
    if (type === 'input') {
      setCustomInputs(prev => [...prev, newPort]);
    } else {
      setCustomOutputs(prev => [...prev, newPort]);
    }
  };

  const removePort = (type: 'input' | 'output', uniqueId: string) => {
    if (type === 'input') {
      setCustomInputs(prev => prev.filter(p => p.uniqueId !== uniqueId));
    } else {
      setCustomOutputs(prev => prev.filter(p => p.uniqueId !== uniqueId));
    }
    setPortLabelError(prev => {
        const newState = {...prev};
        delete newState[uniqueId];
        return newState;
    });
  };

  const handlePortChange = (type: 'input' | 'output', uniqueId: string, field: keyof Omit<CustomPortConfig, 'uniqueId' | 'id'>, value: any) => {
    const updater = type === 'input' ? setCustomInputs : setCustomOutputs;
    updater(prevPorts =>
      prevPorts.map(p => {
        if (p.uniqueId === uniqueId) {
          const updatedPort = { ...p, [field]: value };
          if (field === 'label') {
            const newSanitizedId = sanitizePortId(String(value));
            const otherPorts = (type === 'input' ? customInputs : customOutputs).filter(op => op.uniqueId !== uniqueId);
             if (!String(value).trim()){
                setPortLabelError(prev => ({...prev, [uniqueId]: `端口标签不能为空。`}));
            } else if (otherPorts.some(op => sanitizePortId(op.label) === newSanitizedId)) {
                setPortLabelError(prev => ({...prev, [uniqueId]: `端口 ID '${newSanitizedId}' (来自标签) 已存在。`}));
            } else {
                setPortLabelError(prev => {
                    const newState = {...prev};
                    delete newState[uniqueId];
                    return newState;
                });
            }
          }
          if (field === 'useTool' && value === false && type === 'output') {
            delete updatedPort.toolName; 
          } else if (field === 'useTool' && value === true && !updatedPort.toolName && allToolsForDropdown.length > 0 && type === 'output') {
            updatedPort.toolName = allToolsForDropdown[0].declaration.name; 
          }
          return updatedPort;
        }
        return p;
      })
    );
  };


  const renderColorInput = (
    idPrefix: string,
    label: string,
    colorValue: string,
    setColorValue: (hex: string) => void,
    defaultValue: string
  ) => (
    <div>
      <label htmlFor={`${idPrefix}-picker-${name}`} className={labelClass}>{label}:</label>
      <div className="flex items-center space-x-2">
        <input
          id={`${idPrefix}-picker-${name}`}
          type="color"
          className={`h-8 w-8 p-0.5 border-none rounded-md cursor-pointer ${inspectorTheme.valueText} bg-zinc-700`}
          value={colorValue}
          onChange={(e) => setColorValue(e.target.value)}
          onMouseDown={stopPropagation}
          title={`选择${label}`}
        />
        <input
          id={`${idPrefix}-hex-${name}`}
          type="text"
          className={`${inputBaseClass} flex-grow`}
          value={colorValue}
          onChange={(e) => setColorValue(e.target.value)}
          onBlur={() => { if (!isValidHexColor(colorValue)) setColorValue(defaultValue); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { if (!isValidHexColor(colorValue)) setColorValue(defaultValue); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { setColorValue(defaultValue); e.currentTarget.blur(); }
          }}
          onMouseDown={stopPropagation}
          placeholder={defaultValue}
          maxLength={7}
        />
      </div>
      <button
        onClick={() => setColorValue(defaultValue)}
        className={`w-full text-xs mt-1 px-3 py-1 rounded-md transition-colors ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText}`}
        disabled={colorValue === defaultValue}
      >
        重置为默认颜色
      </button>
    </div>
  );


  if (!isOpen) {
    return null;
  }

  const inputBaseClass = `w-full px-2 py-1.5 ${inspectorTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm`;
  const labelClass = `block text-xs font-medium ${inspectorTheme.labelText} mb-1`;
  const checkboxClass = `h-4 w-4 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700`;
  const availablePortDataTypes = Object.values(PortDataType).filter(type => type !== PortDataType.UNKNOWN);
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4"
      role="dialog" aria-modal="true" aria-labelledby="create-custom-ai-node-modal-title"
      onMouseDown={handleClose}
    >
      <div
        className={`relative ${theme.bg} ${theme.border} rounded-lg shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh]`}
        onMouseDown={stopPropagation}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 id="create-custom-ai-node-modal-title" className={`text-lg font-semibold ${inspectorTheme.headerText}`}>
            创建自定义 AI 节点
          </h2>
          <button onClick={handleClose} className={`p-1 rounded-md hover:${theme.itemBgHover} focus:outline-none focus:ring-2 focus:ring-sky-500`} aria-label="关闭模态框">
            <XMarkIcon className={`w-5 h-5 ${theme.itemText}`} />
          </button>
        </div>

        {error && (<div className="m-4 p-2 text-sm bg-red-800 bg-opacity-50 text-red-300 border border-red-700 rounded-md">{error}</div>)}
        
        <div className="flex-grow overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-4">
            <h3 className={`text-md font-semibold ${inspectorTheme.headerText} border-b border-zinc-700 pb-1 mb-3`}>通用设置</h3>
            <div>
              <label htmlFor="custom-node-name" className={labelClass}>节点名称*:</label>
              <input id="custom-node-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputBaseClass} placeholder="例如：情感分析器" />
            </div>
            <div>
              <label htmlFor="custom-node-description" className={labelClass}>节点描述:</label>
              <textarea id="custom-node-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputBaseClass} min-h-[40px] resize-y`} placeholder="描述此节点的功能..." />
            </div>
            <div>
              <label htmlFor="custom-node-default-prompt" className={labelClass}>默认提示词:</label>
              <textarea id="custom-node-default-prompt" value={defaultPrompt} onChange={(e) => setDefaultPrompt(e.target.value)} rows={3} className={`${inputBaseClass} min-h-[60px] resize-y`} placeholder="例如：分析以下文本的情感：{{text_input}}" />
              <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>可以使用 {"`{{port_id}}`"} 语法动态插入来自输入端口的数据。</p>
            </div>

            <h3 className={`text-md font-semibold ${inspectorTheme.headerText} border-b border-zinc-700 pb-1 mb-3 pt-3`}>AI 配置</h3>
            <div>
              <label className={labelClass} htmlFor="custom-ai-modelGroupId">模型配置组:</label>
              <div className="relative">
                <select
                  id="custom-ai-modelGroupId"
                  className={`${inputBaseClass} appearance-none pr-7`}
                  value={aiModelConfigGroupId}
                  onChange={(e) => setAiModelConfigGroupId(e.target.value)}
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
              <label htmlFor="custom-node-system-instruction" className={labelClass}>系统指令:</label>
              <textarea id="custom-node-system-instruction" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)} rows={3} className={`${inputBaseClass} min-h-[60px] resize-y`} placeholder="例如：你是一个专门进行文本分类的助手。" />
              <p className={`text-xs ${inspectorTheme.labelText} mt-1`}>可以使用 {"`{{port_id}}`"} 语法动态插入数据。</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass} htmlFor={`temperature-custom-ai`}>Temperature:</label><input id={`temperature-custom-ai`} type="number" step="0.01" className={inputBaseClass} value={temperature} onChange={(e) => setTemperature(e.target.value)} /></div>
              <div><label className={labelClass} htmlFor={`topP-custom-ai`}>Top P:</label><input id={`topP-custom-ai`} type="number" step="0.01" className={inputBaseClass} value={topP} onChange={(e) => setTopP(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass} htmlFor={`topK-custom-ai`}>Top K:</label><input id={`topK-custom-ai`} type="number" step="1" className={inputBaseClass} value={topK} onChange={(e) => setTopK(e.target.value)} /></div>
              <div><label className={labelClass} htmlFor={`thinkingBudget-custom-ai`}>思考预算 (ms):</label><input id={`thinkingBudget-custom-ai`} type="number" step="100" min="0" placeholder="0或留空禁用" className={inputBaseClass} value={thinkingBudget} onChange={(e) => setThinkingBudget(e.target.value)} /></div>
            </div>
            <div className="flex items-center"><input id={`includeThoughts-custom-ai`} type="checkbox" className={checkboxClass} checked={includeThoughts} onChange={(e) => setIncludeThoughts(e.target.checked)} /><label htmlFor={`includeThoughts-custom-ai`} className={`${labelClass} ml-2 mb-0`}>包含思考过程</label></div>

            <h3 className={`text-md font-semibold ${inspectorTheme.headerText} border-b border-zinc-700 pb-1 mb-3 pt-3`}>外观设置</h3>
            {renderColorInput("header-bg", "自定义标题背景颜色", headerColorHex, setHeaderColorHex, DEFAULT_HEADER_BG_COLOR_HEX)}
            {renderColorInput("main-title-text", "自定义主标题颜色", mainTitleColorHex, setMainTitleColorHex, DEFAULT_MAIN_TITLE_COLOR_HEX)}
            {renderColorInput("subtitle-text", "自定义副标题颜色", subtitleColorHex, setSubtitleColorHex, DEFAULT_SUBTITLE_COLOR_HEX)}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-1 mb-3">
                <h3 className={`text-md font-semibold ${inspectorTheme.headerText}`}>输入端口 ({customInputs.length})</h3>
                <button onClick={() => addPort('input')} className={`${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} text-xs px-2 py-1 rounded-md flex items-center`}><PlusIcon className="w-3 h-3 mr-1"/> 添加输入</button>
              </div>
              {customInputs.length === 0 && <p className="text-xs text-zinc-400 italic">未定义输入端口。</p>}
              <ul className="space-y-2 max-h-[calc(40vh-50px)] overflow-y-auto pr-1">
                {customInputs.map((port, index) => (
                  <li key={port.uniqueId} className="p-2 border border-zinc-700 rounded-md bg-zinc-800/50 space-y-1.5">
                    <div className="flex justify-between items-center"><span className="text-xs font-medium text-sky-400">输入端口 {index + 1}</span><button onClick={() => removePort('input', port.uniqueId)} className="text-red-400 hover:text-red-300 text-xs p-0.5">&times; 移除</button></div>
                    <div><label htmlFor={`input-label-${port.uniqueId}`} className={`${labelClass} text-xs`}>标签:</label><input id={`input-label-${port.uniqueId}`} type="text" value={port.label} onChange={(e) => handlePortChange('input', port.uniqueId, 'label', e.target.value)} className={`${inputBaseClass} text-xs`} />{portLabelError[port.uniqueId] && <p className="text-red-400 text-xs mt-0.5">{portLabelError[port.uniqueId]}</p>}</div>
                    <div><label htmlFor={`input-dataType-${port.uniqueId}`} className={`${labelClass} text-xs`}>数据类型:</label><div className="relative"><select id={`input-dataType-${port.uniqueId}`} value={port.dataType} onChange={(e) => handlePortChange('input', port.uniqueId, 'dataType', e.target.value as PortDataType)} className={`${inputBaseClass} text-xs appearance-none pr-7`}>{availablePortDataTypes.map(dt => (<option key={dt} value={dt}>{dt}</option>))}</select><ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" /></div></div>
                    <div className="flex items-center">
                      <input id={`input-isRequired-${port.uniqueId}`} type="checkbox" checked={port.isRequired} onChange={(e) => handlePortChange('input', port.uniqueId, 'isRequired', e.target.checked)} className={`${checkboxClass} mr-1.5`} />
                      <label htmlFor={`input-isRequired-${port.uniqueId}`} className={`${labelClass} text-xs mb-0`}>是否必需</label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-1 mb-3 pt-3">
                 <h3 className={`text-md font-semibold ${inspectorTheme.headerText}`}>输出端口 ({customOutputs.length})</h3>
                 <button onClick={() => addPort('output')} className={`${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} text-xs px-2 py-1 rounded-md flex items-center`}><PlusIcon className="w-3 h-3 mr-1"/> 添加输出</button>
              </div>
              {customOutputs.length === 0 && <p className="text-xs text-zinc-400 italic">未定义输出端口。</p>}
              <ul className="space-y-2 max-h-[calc(40vh-50px)] overflow-y-auto pr-1">
                {customOutputs.map((port, index) => (
                  <li key={port.uniqueId} className="p-2 border border-zinc-700 rounded-md bg-zinc-800/50 space-y-1.5">
                     <div className="flex justify-between items-center"><span className="text-xs font-medium text-sky-400">输出端口 {index + 1}</span><button onClick={() => removePort('output', port.uniqueId)} className="text-red-400 hover:text-red-300 text-xs p-0.5">&times; 移除</button></div>
                    <div><label htmlFor={`output-label-${port.uniqueId}`} className={`${labelClass} text-xs`}>标签:</label><input id={`output-label-${port.uniqueId}`} type="text" value={port.label} onChange={(e) => handlePortChange('output', port.uniqueId, 'label', e.target.value)} className={`${inputBaseClass} text-xs`} />{portLabelError[port.uniqueId] && <p className="text-red-400 text-xs mt-0.5">{portLabelError[port.uniqueId]}</p>}</div>
                    <div><label htmlFor={`output-dataType-${port.uniqueId}`} className={`${labelClass} text-xs`}>数据类型:</label><div className="relative"><select id={`output-dataType-${port.uniqueId}`} value={port.dataType} onChange={(e) => handlePortChange('output', port.uniqueId, 'dataType', e.target.value as PortDataType)} className={`${inputBaseClass} text-xs appearance-none pr-7`}>{availablePortDataTypes.map(dt => (<option key={dt} value={dt}>{dt}</option>))}</select><ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" /></div></div>
                    <div className="flex items-center">
                      <input id={`output-isRequired-${port.uniqueId}`} type="checkbox" checked={port.isRequired} onChange={(e) => handlePortChange('output', port.uniqueId, 'isRequired', e.target.checked)} className={`${checkboxClass} mr-1.5`} />
                      <label htmlFor={`output-isRequired-${port.uniqueId}`} className={`${labelClass} text-xs mb-0`}>是否必需</label>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-zinc-700/50">
                        <div className="flex items-center">
                            <input id={`output-useTool-${port.uniqueId}`} type="checkbox" checked={!!port.useTool} onChange={(e) => handlePortChange('output', port.uniqueId, 'useTool', e.target.checked)} className={`${checkboxClass} mr-1.5`} />
                            <label htmlFor={`output-useTool-${port.uniqueId}`} className={`${labelClass} text-xs mb-0 font-medium`}>调用AI工具</label>
                        </div>
                        {port.useTool && (
                            <div className="mt-1 pl-2">
                                <label htmlFor={`output-toolName-${port.uniqueId}`} className={`${labelClass} text-xs`}>选择工具:</label>
                                <div className="relative"><select id={`output-toolName-${port.uniqueId}`} value={port.toolName || (allToolsForDropdown.length > 0 ? allToolsForDropdown[0].declaration.name : "")} onChange={(e) => handlePortChange('output', port.uniqueId, 'toolName', e.target.value)} className={`${inputBaseClass} text-xs appearance-none pr-7`}>
                                    {allToolsForDropdown.map(tool => (<option key={tool.declaration.name} value={tool.declaration.name}>{tool.declaration.name}{customTools.some(ct => ct.declaration.name === tool.declaration.name) ? " (自定义)" : ""}</option>))}
                                    {allToolsForDropdown.length === 0 && <option value="" disabled>无可用工具</option>}
                                </select><ChevronDownIcon className="absolute top-1/2 right-2 transform -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" /></div>
                            </div>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t border-zinc-700 mt-auto">
          <button onClick={handleClose} className={`px-4 py-2 text-sm rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500`}>取消</button>
          <button onClick={handleSave} className={`px-4 py-2 text-sm rounded-md ${buttonTheme.buttonPrimaryBg} hover:${buttonTheme.buttonPrimaryBgHover} ${buttonTheme.buttonPrimaryText} transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400`}>保存节点</button>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomAiNodeModal;
