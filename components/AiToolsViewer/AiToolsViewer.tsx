
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XMarkIcon } from '../icons/XMarkIcon';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { AVAILABLE_AI_TOOLS, RegisteredAiTool } from '../../features/ai/tools/availableAiTools';
import { GeminiFunctionDeclarationSchema, GeminiType, PortDataType, GeminiFunctionDeclaration } from '../../types';
import { OverlayScrollbar } from '../shared/OverlayScrollbar';
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from '../icons';

interface AiToolsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  customTools: RegisteredAiTool[]; // Receive customTools as prop
  onAddCustomTool: (tool: RegisteredAiTool) => void; // Receive callback to add tool
}

// For UI state of a parameter being defined
interface UIPrameter {
  id: string; // for react key
  name: string;
  description: string;
  type: GeminiType; // Store the actual GeminiType
  enumValues: string; // Comma-separated string
}


const getTypeBadgeStyles = (dataType: GeminiType | PortDataType): { bgClass: string; textClass: string } => {
  const themePorts = vscodeDarkTheme.ports.dataTypeColors;
  const defaultLightText = 'text-slate-100';
  const defaultDarkText = 'text-zinc-900';

  const lowerCaseDataType = dataType.toLowerCase();

  if (lowerCaseDataType === PortDataType.STRING.toLowerCase()) {
    return { bgClass: themePorts[PortDataType.STRING].output.bg, textClass: defaultLightText };
  } else if (lowerCaseDataType === PortDataType.FLOW.toLowerCase()) {
    return { bgClass: themePorts[PortDataType.FLOW].output.bg, textClass: defaultDarkText };
  } else if (lowerCaseDataType === PortDataType.AI_CONFIG.toLowerCase()) {
    return { bgClass: themePorts[PortDataType.AI_CONFIG].output.bg, textClass: defaultDarkText };
  } else if (lowerCaseDataType === PortDataType.ANY.toLowerCase()) {
    return { bgClass: themePorts[PortDataType.ANY].output.bg, textClass: defaultLightText };
  }
  if (lowerCaseDataType === GeminiType.OBJECT.toLowerCase() || lowerCaseDataType === GeminiType.ARRAY.toLowerCase()) {
    return { bgClass: 'bg-slate-500', textClass: defaultLightText };
  } else if (
    lowerCaseDataType === GeminiType.BOOLEAN.toLowerCase() ||
    lowerCaseDataType === GeminiType.INTEGER.toLowerCase() || // Though we map UI "Number" to GeminiType.NUMBER
    lowerCaseDataType === GeminiType.NUMBER.toLowerCase()
  ) {
    return { bgClass: 'bg-blue-500', textClass: defaultLightText };
  }
  return { 
    bgClass: themePorts[PortDataType.UNKNOWN]?.output.bg || 'bg-gray-500', 
    textClass: defaultLightText 
  };
};

const RenderSchemaDetails: React.FC<{ schema?: GeminiFunctionDeclarationSchema; level?: number }> = ({ schema, level = 0 }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const theme = vscodeDarkTheme.contextMenu; 
  const indentStyle = { paddingLeft: `${level * 16}px` }; 

  if (!schema || (schema.type === GeminiType.OBJECT && (!schema.properties || Object.keys(schema.properties).length === 0))) {
    return <p className={`${inspectorTheme.valueTextMuted} text-xs italic py-1`} style={indentStyle}>此工具无参数。</p>;
  }
  
  const getTypeDisplay = (type: GeminiType) => {
    const s = String(type); // GeminiType values are already strings like "STRING", "OBJECT"
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  const { bgClass: typeBgClass, textClass: typeTextClass } = getTypeBadgeStyles(schema.type);

  return (
    <div style={indentStyle} className="mt-1">
      <p className="text-xs">
        <span className={`${inspectorTheme.labelText}`}>类型: </span>
        <span className={`${typeTextClass} ${typeBgClass} px-1.5 py-0.5 rounded-sm text-xs`}>
          {getTypeDisplay(schema.type)}
        </span>
      </p>
      {schema.description && (
        <p className="text-xs mt-0.5">
          <span className={`${inspectorTheme.labelText}`}>描述: </span>
          <span className={`${inspectorTheme.valueTextMuted}`}>{schema.description}</span>
        </p>
      )}
      {schema.required && schema.required.length > 0 && (
        <p className="text-xs mt-0.5">
          <span className={`${inspectorTheme.labelText}`}>必需属性: </span>
          <span className={`${inspectorTheme.valueTextMuted}`}>{schema.required.join(', ')}</span>
        </p>
      )}
      {schema.enum && schema.enum.length > 0 && (
        <div className="text-xs mt-0.5">
          <span className={`${inspectorTheme.labelText}`}>可选值 (Enum): </span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {schema.enum.map((enumVal, idx) => (
              <span key={idx} className={`${inspectorTheme.valueTextMuted} bg-zinc-600 px-1.5 py-0.5 rounded-sm text-xs`}>
                {enumVal}
              </span>
            ))}
          </div>
        </div>
      )}
      {schema.properties && Object.keys(schema.properties).length > 0 && (
        <div className="mt-1.5">
          <strong className={`${inspectorTheme.labelText} text-xs`}>属性:</strong>
          {Object.entries(schema.properties).map(([key, propSchema]) => (
            <div key={key} className={`mt-1 pl-2 border-l ${theme.border} border-opacity-50`}>
              <strong className={`${inspectorTheme.labelText} text-xs`}>{key}:</strong>
              <RenderSchemaDetails schema={propSchema as GeminiFunctionDeclarationSchema} level={level + 1} />
            </div>
          ))}
        </div>
      )}
      {schema.items && (
        <div className="mt-1.5">
          <strong className={`${inspectorTheme.labelText} text-xs`}>数组项定义:</strong>
           <div className={`mt-1 pl-2 border-l ${theme.border} border-opacity-50`}>
            <RenderSchemaDetails schema={schema.items} level={level + 1} />
          </div>
        </div>
      )}
    </div>
  );
};

const initialNewToolState: {
  name: string;
  description: string;
  parameters: UIPrameter[];
  expectedArgName: string;
  systemInstructionSuffix: string;
} = {
  name: '',
  description: '',
  parameters: [],
  expectedArgName: '',
  systemInstructionSuffix: '',
};

const initialParameterEntryState: Omit<UIPrameter, 'id'> = {
  name: '',
  description: '',
  type: GeminiType.STRING, 
  enumValues: '',
};

const generatePreviewSchema = (uiParams: UIPrameter[]): GeminiFunctionDeclarationSchema | undefined => {
  if (uiParams.length === 0) {
    return undefined; 
  }
  const schema: GeminiFunctionDeclarationSchema = {
    type: GeminiType.OBJECT,
    properties: {},
    required: [],
  };
  uiParams.forEach(param => {
    const propertyDefinition: GeminiFunctionDeclarationSchema = {
      type: param.type, 
      description: param.description,
    };
    if (param.enumValues && param.enumValues.trim() !== '') {
      propertyDefinition.enum = param.enumValues.split(',').map(s => s.trim()).filter(s => s);
    }
    schema.properties![param.name] = propertyDefinition;
    schema.required!.push(param.name);
  });
  return schema;
};


export const AiToolsViewer: React.FC<AiToolsViewerProps> = ({ 
  isOpen, 
  onClose,
  customTools, // Destructure prop
  onAddCustomTool, // Destructure prop
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const formScrollableRef = useRef<HTMLDivElement>(null);
  const previewScrollableRef = useRef<HTMLDivElement>(null); 
  
  const theme = vscodeDarkTheme.contextMenu;
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const buttonTheme = vscodeDarkTheme.topBar;

  const [showAddToolForm, setShowAddToolForm] = useState(false);
  const [newToolForm, setNewToolForm] = useState(initialNewToolState);
  const [formError, setFormError] = useState<string | null>(null);
  // Removed local customTools state

  const [parameterEntry, setParameterEntry] = useState(initialParameterEntryState);
  const [showParameterEntryForm, setShowParameterEntryForm] = useState(false);
  const [parameterFormError, setParameterFormError] = useState<string | null>(null);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewToolForm(prev => ({ ...prev, [name]: value }));
    if (name === 'name') {
      setFormError(null);
    }
  }, []);

  const handleParameterEntryChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParameterEntry(prev => ({ ...prev, [name]: name === 'type' ? (value as GeminiType) : value }));
    if (name === 'name') {
        setParameterFormError(null);
    }
  }, []);
  
  const handleAddCurrentParameter = useCallback(() => {
    setParameterFormError(null);
    const trimmedName = parameterEntry.name.trim();
    if (!trimmedName) {
      setParameterFormError("参数名称不能为空。");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      setParameterFormError("参数名称只能包含字母、数字和下划线。");
      return;
    }
    if (newToolForm.parameters.some(p => p.name === trimmedName)) {
      setParameterFormError("此参数名称已存在于此工具中。");
      return;
    }
    if (!parameterEntry.description.trim()) {
      setParameterFormError("参数描述不能为空。");
      return;
    }

    setNewToolForm(prev => ({
      ...prev,
      parameters: [...prev.parameters, { ...parameterEntry, name: trimmedName, id: Date.now().toString() }]
    }));
    setParameterEntry(initialParameterEntryState);
    setShowParameterEntryForm(false);
  }, [parameterEntry, newToolForm.parameters]);

  const handleRemoveParameter = useCallback((parameterIdToRemove: string) => {
    setNewToolForm(prev => ({
      ...prev,
      parameters: prev.parameters.filter(p => p.id !== parameterIdToRemove)
    }));
  }, []);


  const validateToolName = (name: string): boolean => {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setFormError("工具名称只能包含字母、数字和下划线。");
      return false;
    }
    if (AVAILABLE_AI_TOOLS.some(t => t.declaration.name === name) || customTools.some(t => t.declaration.name === name)) {
      setFormError("工具名称已存在。");
      return false;
    }
    return true;
  };

  const handleSaveTool = useCallback(() => {
    setFormError(null);
    const trimmedToolName = newToolForm.name.trim();
    if (!trimmedToolName) {
      setFormError("工具名称不能为空。");
      return;
    }
    if (!validateToolName(trimmedToolName)) return;

    if (!newToolForm.description.trim()) {
      setFormError("工具描述不能为空。");
      return;
    }
    if (!newToolForm.expectedArgName.trim()) {
      setFormError("期望参数名不能为空。");
      return;
    }

    const parametersSchema = generatePreviewSchema(newToolForm.parameters);

    const newToolDeclaration: GeminiFunctionDeclaration = {
      name: trimmedToolName,
      description: newToolForm.description.trim(),
      ...(parametersSchema && { parameters: parametersSchema }),
    };

    const newRegisteredTool: RegisteredAiTool = {
      declaration: newToolDeclaration,
      expectedArgName: newToolForm.expectedArgName.trim(),
      systemInstructionSuffix: newToolForm.systemInstructionSuffix.trim() || undefined,
    };

    onAddCustomTool(newRegisteredTool); // Call prop to add tool
    setNewToolForm(initialNewToolState);
    setShowAddToolForm(false);
    setShowParameterEntryForm(false);
  }, [newToolForm, customTools, onAddCustomTool, validateToolName]); // Added onAddCustomTool and validateToolName

  const handleCancelAddTool = useCallback(() => {
    setNewToolForm(initialNewToolState);
    setShowAddToolForm(false);
    setFormError(null);
    setParameterEntry(initialParameterEntryState);
    setShowParameterEntryForm(false);
    setParameterFormError(null);
  }, []);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showParameterEntryForm) {
          setShowParameterEntryForm(false);
          setParameterFormError(null);
          setParameterEntry(initialParameterEntryState);
        } else if (showAddToolForm) {
          handleCancelAddTool();
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen, onClose, showAddToolForm, showParameterEntryForm, handleCancelAddTool]);

  const allDisplayableTools = [...AVAILABLE_AI_TOOLS, ...customTools]; // Use prop customTools
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const geminiTypeOptions = [
    { label: 'String', value: GeminiType.STRING },
    { label: 'Number', value: GeminiType.NUMBER },
    { label: 'Boolean', value: GeminiType.BOOLEAN },
  ];

  const previewToolSchema = generatePreviewSchema(newToolForm.parameters);

  if (!isOpen) {
    return null;
  }
  
  const baseInputClasses = `${inspectorTheme.valueText} bg-zinc-700 ${panelTheme.border} text-xs w-full p-1.5 rounded-sm focus:ring-1 focus:ring-sky-500`;
  const labelTextClasses = `${inspectorTheme.labelText} text-xs`;


  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-tools-viewer-title"
    >
      <div
        ref={modalRef}
        className={`flex flex-col ${theme.bg} ${theme.border} rounded-lg shadow-xl w-full max-w-4xl h-[85vh] md:h-[80vh]`}
      >
        <div className={`flex items-center justify-between p-3 border-b ${theme.border}`}>
          <h2 id="ai-tools-viewer-title" className={`text-lg font-semibold ${inspectorTheme.headerText}`}>
            AI 工具浏览器
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowAddToolForm(prev => !prev);
                if (showAddToolForm) { 
                  handleCancelAddTool();
                }
              }}
              className={`p-1.5 rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} transition-colors flex items-center text-sm`}
              aria-expanded={showAddToolForm}
              aria-controls="add-tool-form-section"
            >
              {showAddToolForm ? <ChevronDownIcon className="w-4 h-4 mr-1"/> : <ChevronRightIcon className="w-4 h-4 mr-1"/>}
              {showAddToolForm ? '隐藏表单' : '添加新工具'}
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded-md hover:${theme.itemBgHover} focus:outline-none focus:ring-2 focus:ring-sky-500`}
              aria-label="关闭 AI 工具浏览器"
            >
              <XMarkIcon className={`w-5 h-5 ${theme.itemText}`} />
            </button>
          </div>
        </div>
        
        {showAddToolForm ? (
          <div 
            id="add-tool-form-section" 
            className={`flex flex-col flex-grow border-b ${theme.border} bg-zinc-800 overflow-hidden`} 
          >
            <div className="p-3 border-b border-zinc-700">
                <h3 className={`text-md font-semibold ${panelTheme.headerText}`}>定义新AI工具</h3>
                {formError && <p className="text-red-400 text-xs mt-1.5 p-1.5 bg-red-900/50 border border-red-700 rounded">{formError}</p>}
            </div>

            <div className="flex flex-1 min-h-0"> {/* Container for the two columns */}
              {/* Left Column (Preview) */}
              <div ref={previewScrollableRef} className="w-1/2 p-3 border-r border-zinc-700 overflow-y-auto hide-native-scrollbar relative">
                <h4 className={`text-sm font-semibold ${panelTheme.categoryHeaderText} mb-2 sticky top-0 bg-zinc-800 py-1 z-10`}>工具预览</h4>
                <div className={`${panelTheme.categoryGroupBg} p-3 rounded-md border ${theme.border}`}>
                  <h3 className={`text-md font-semibold ${panelTheme.categoryHeaderText} mb-1.5 break-all`}>
                    {newToolForm.name.trim() || "[待输入工具名称]"}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className={`${inspectorTheme.labelText}`}>描述: </span>
                      <span className={`${inspectorTheme.valueTextMuted} break-words`}>{newToolForm.description.trim() || "[待输入描述]"}</span>
                    </p>
                    <p>
                      <span className={`${inspectorTheme.labelText}`}>期望参数名: </span>
                      <span className={`${inspectorTheme.valueText} font-mono bg-zinc-700 px-1 rounded break-all`}>{newToolForm.expectedArgName.trim() || "[待输入]"}</span>
                    </p>
                    {newToolForm.systemInstructionSuffix.trim() && (
                      <p>
                        <span className={`${inspectorTheme.labelText}`}>系统指令后缀: </span>
                        <span className={`${inspectorTheme.valueTextMuted} italic break-words`}>{newToolForm.systemInstructionSuffix.trim()}</span>
                      </p>
                    )}
                    <div className="pt-1.5 mt-1.5 border-t border-zinc-700">
                      <strong className={`${inspectorTheme.labelText} text-sm`}>参数定义:</strong>
                      <RenderSchemaDetails schema={previewToolSchema} />
                    </div>
                  </div>
                </div>
                <OverlayScrollbar scrollableRef={previewScrollableRef} orientation="vertical" />
              </div>

              {/* Right Column (Form Inputs) */}
              <div ref={formScrollableRef} className="w-1/2 p-3 space-y-3 overflow-y-auto hide-native-scrollbar relative">
                 <div onMouseDown={stopPropagation} onClick={stopPropagation}> {/* Stop propagation for inputs */}
                    <div>
                        <label htmlFor="newToolName" className={labelTextClasses}>工具名称 (唯一, 字母/数字/下划线):</label>
                        <input type="text" name="name" id="newToolName" value={newToolForm.name} onChange={handleInputChange} className={baseInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="newToolDescription" className={labelTextClasses}>工具描述:</label>
                        <textarea name="description" id="newToolDescription" value={newToolForm.description} onChange={handleInputChange} rows={2} className={`${baseInputClasses} resize-y`} />
                    </div>

                    {/* Parameters Section */}
                    <div className="pt-2 border-t border-zinc-700">
                        <h4 className={`${panelTheme.headerText} text-sm font-semibold mb-1.5`}>参数列表 ({newToolForm.parameters.length})</h4>
                        {newToolForm.parameters.length > 0 && (
                        <ul className="space-y-1.5 mb-2 max-h-32 overflow-y-auto pr-1 border border-zinc-700 p-1 rounded-sm">
                            {newToolForm.parameters.map(param => (
                            <li key={param.id} className="text-xs bg-zinc-700 p-1.5 rounded-sm border border-zinc-600">
                                <div className="flex justify-between items-center">
                                <strong className={inspectorTheme.labelText}>{param.name}</strong>
                                <button onClick={() => handleRemoveParameter(param.id)} className={`p-0.5 rounded hover:bg-red-800/50`} title="移除此参数"><XMarkIcon className="w-3 h-3 text-red-400"/></button>
                                </div>
                                <p className={inspectorTheme.valueTextMuted}><span className={inspectorTheme.labelText}>类型:</span> {String(param.type)}</p>
                                <p className={inspectorTheme.valueTextMuted}><span className={inspectorTheme.labelText}>描述:</span> {param.description}</p>
                                {param.enumValues && <p className={inspectorTheme.valueTextMuted}><span className={inspectorTheme.labelText}>Enum:</span> {param.enumValues}</p>}
                            </li>
                            ))}
                        </ul>
                        )}

                        {!showParameterEntryForm && (
                        <button onClick={() => setShowParameterEntryForm(true)} className={`w-full text-xs ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} px-2 py-1.5 rounded-md flex items-center justify-center`}>
                            <PlusIcon className="w-3.5 h-3.5 mr-1"/> 添加参数
                        </button>
                        )}

                        {showParameterEntryForm && (
                        <div className="p-2.5 border border-sky-700/50 rounded-md bg-zinc-700/30 space-y-2 mt-1">
                            {parameterFormError && <p className="text-red-400 text-xs p-1 bg-red-900/50 border border-red-700 rounded">{parameterFormError}</p>}
                            <div>
                                <label htmlFor="paramName" className={labelTextClasses}>参数名:</label>
                                <input type="text" name="name" id="paramName" value={parameterEntry.name} onChange={handleParameterEntryChange} className={baseInputClasses}/>
                            </div>
                            <div>
                                <label htmlFor="paramDescription" className={labelTextClasses}>参数描述:</label>
                                <textarea name="description" id="paramDescription" value={parameterEntry.description} onChange={handleParameterEntryChange} rows={2} className={`${baseInputClasses} resize-y`}/>
                            </div>
                            <div>
                                <label htmlFor="paramType" className={labelTextClasses}>参数类型:</label>
                                <select name="type" id="paramType" value={parameterEntry.type} onChange={handleParameterEntryChange} className={`${baseInputClasses} appearance-none pr-7`}>
                                {geminiTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="paramEnumValues" className={labelTextClasses}>Enum 值 (可选, 逗号分隔):</label>
                                <input type="text" name="enumValues" id="paramEnumValues" value={parameterEntry.enumValues} onChange={handleParameterEntryChange} className={baseInputClasses}/>
                            </div>
                            <div className="flex justify-end space-x-2 pt-1">
                                <button onClick={() => {setShowParameterEntryForm(false); setParameterFormError(null); setParameterEntry(initialParameterEntryState);}} className={`${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} text-xs px-2 py-1 rounded`}>取消</button>
                                <button onClick={handleAddCurrentParameter} className={`${buttonTheme.buttonPrimaryBg} hover:${buttonTheme.buttonPrimaryBgHover} ${buttonTheme.buttonPrimaryText} text-xs px-2 py-1 rounded`}>保存此参数</button>
                            </div>
                        </div>
                        )}
                    </div>
                    {/* End Parameters Section */}

                    <div className="pt-2 border-t border-zinc-700">
                        <label htmlFor="newToolExpectedArgName" className={labelTextClasses}>期望参数名 (用于数据提取):</label>
                        <input type="text" name="expectedArgName" id="newToolExpectedArgName" value={newToolForm.expectedArgName} onChange={handleInputChange} className={baseInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="newToolSystemInstructionSuffix" className={labelTextClasses}>系统指令后缀 (可选):</label>
                        <textarea name="systemInstructionSuffix" id="newToolSystemInstructionSuffix" value={newToolForm.systemInstructionSuffix} onChange={handleInputChange} rows={2} className={`${baseInputClasses} resize-y`} />
                    </div>
                 </div>
                <OverlayScrollbar scrollableRef={formScrollableRef} orientation="vertical" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-3 mt-auto border-t border-zinc-700">
              <button onClick={handleCancelAddTool} className={`${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} text-xs px-3 py-1.5 rounded-md`}>取消全部</button>
              <button onClick={handleSaveTool} className={`${buttonTheme.buttonPrimaryBg} hover:${buttonTheme.buttonPrimaryBgHover} ${buttonTheme.buttonPrimaryText} text-xs px-3 py-1.5 rounded-md`}>保存工具</button>
            </div>
          </div>
        ) : (
          <div ref={scrollableContentRef} className="flex-grow p-4 overflow-y-auto hide-native-scrollbar relative">
            {allDisplayableTools.length === 0 && (
              <p className={`${inspectorTheme.infoText} text-center`}>没有可用的 AI 工具。</p>
            )}
            {allDisplayableTools.length > 0 && (
              <div className="space-y-4">
                {allDisplayableTools.map((toolRegEntry: RegisteredAiTool, index: number) => (
                  <div key={`${toolRegEntry.declaration.name}-${index}`} className={`${panelTheme.categoryGroupBg} p-3 rounded-md border ${theme.border}`}>
                    <h3 className={`text-md font-semibold ${panelTheme.categoryHeaderText} mb-1.5 break-all`}>
                      {toolRegEntry.declaration.name}
                      {customTools.includes(toolRegEntry) && <span className="text-xs text-sky-400 ml-2">(自定义)</span>}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className={`${inspectorTheme.labelText}`}>描述: </span>
                        <span className={`${inspectorTheme.valueTextMuted} break-words`}>{toolRegEntry.declaration.description}</span>
                      </p>
                      <p>
                        <span className={`${inspectorTheme.labelText}`}>期望参数名: </span>
                        <span className={`${inspectorTheme.valueText} font-mono bg-zinc-700 px-1 rounded break-all`}>{toolRegEntry.expectedArgName}</span>
                      </p>
                      {toolRegEntry.systemInstructionSuffix && (
                        <p>
                          <span className={`${inspectorTheme.labelText}`}>系统指令后缀: </span>
                          <span className={`${inspectorTheme.valueTextMuted} italic break-words`}>{toolRegEntry.systemInstructionSuffix}</span>
                        </p>
                      )}
                      <div className="pt-1.5 mt-1.5 border-t border-zinc-700">
                        <strong className={`${inspectorTheme.labelText} text-sm`}>参数定义:</strong>
                        <RenderSchemaDetails schema={toolRegEntry.declaration.parameters} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <OverlayScrollbar scrollableRef={scrollableContentRef} orientation="vertical" />
          </div>
        )}
      </div>
    </div>
  );
};
