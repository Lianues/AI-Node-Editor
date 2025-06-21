
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XMarkIcon } from '../icons/XMarkIcon';
import { CogIcon } from '../icons/CogIcon';
import { SwatchIcon } from '../icons/SwatchIcon';
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import { AiModelConfigSettings, EditableAiModelConfig, ApiFormat } from './GlobalSettingsModal/AiModelConfigSettings';
import { ThemeSettings } from './GlobalSettingsModal/ThemeSettings';
import { PlusIcon, TrashIcon, PencilSquareIcon } from '../icons';
import { ModelConfigGroup, DEFAULT_ENV_GEMINI_CONFIG_ID } from '../../globalModelConfigs'; // Added ModelConfigGroup
import { initialEditableConfigsForService as defaultInitialEditableConfigs } from './GlobalSettingsModal/AiModelConfigSettings'; // Correct import


interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editableConfigs: EditableAiModelConfig[]; // Prop from App.tsx
  setEditableConfigs: React.Dispatch<React.SetStateAction<EditableAiModelConfig[]>>; // Prop from App.tsx
  mergedModelConfigs: Array<ModelConfigGroup | EditableAiModelConfig>; // Prop from App.tsx
}

type SettingsCategory = 'aiConfig' | 'theme';

interface SettingsItem {
  id: SettingsCategory;
  label: string;
  icon: React.ElementType;
}

const SETTINGS_CATEGORIES: SettingsItem[] = [
  { id: 'aiConfig', label: 'AI模型配置', icon: CogIcon },
  { id: 'theme', label: '主题设置', icon: SwatchIcon },
];

const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-preview-04-17"; // Updated to use latest model


export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ 
    isOpen, 
    onClose,
    editableConfigs, // Use prop from App.tsx
    setEditableConfigs, // Use prop from App.tsx
    mergedModelConfigs, // Use prop from App.tsx
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const theme = vscodeDarkTheme.contextMenu;
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const buttonTheme = vscodeDarkTheme.topBar;

  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>('aiConfig');
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>(DEFAULT_ENV_GEMINI_CONFIG_ID); 
  
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);
  const [renameGroupValue, setRenameGroupValue] = useState("");
  
  const currentSelectedConfigDetails = mergedModelConfigs.find(c => c.id === selectedConfigKey);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('aiConfig');
      setIsRenamingGroup(false);
      if (currentSelectedConfigDetails) {
        setRenameGroupValue(currentSelectedConfigDetails.name);
      } else {
        // If selected key somehow doesn't map to a merged config (e.g. after delete), reset or pick first
        const firstValidKey = mergedModelConfigs.length > 0 ? mergedModelConfigs[0].id : DEFAULT_ENV_GEMINI_CONFIG_ID;
        setSelectedConfigKey(firstValidKey);
        setRenameGroupValue(mergedModelConfigs.find(c => c.id === firstValidKey)?.name || "");
      }
    }
  }, [isOpen, selectedConfigKey, currentSelectedConfigDetails, mergedModelConfigs]);


  const handleSelectConfigKey = (key: string) => {
    setSelectedConfigKey(key);
    setIsRenamingGroup(false); 
    const config = mergedModelConfigs.find(c => c.id === key);
    if (config) {
        setRenameGroupValue(config.name);
    } else {
        setRenameGroupValue("");
    }
  };
  
  const handleAddNewConfig = () => {
    const existingNames = mergedModelConfigs.map(c => c.name);
    let newName = "新配置 1";
    let counter = 1;
    while (existingNames.includes(newName)) {
      counter++;
      newName = `新配置 ${counter}`;
    }

    const newId = `user_config_${Date.now()}`;
    const newConfig: EditableAiModelConfig = {
      id: newId,
      name: newName,
      format: 'gemini',
      apiUrl: DEFAULT_GEMINI_API_URL,
      apiKey: '',
      model: DEFAULT_GEMINI_MODEL,
    };
    setEditableConfigs(prev => [...prev, newConfig]); // Update state in App.tsx
    setSelectedConfigKey(newId);
    setIsRenamingGroup(false);
  };

  const handleRenameSelectedConfig = () => {
    if (selectedConfigKey === DEFAULT_ENV_GEMINI_CONFIG_ID || !renameGroupValue.trim() || !currentSelectedConfigDetails) return;
    if (!('apiKey' in currentSelectedConfigDetails)) { // Cannot rename predefined groups that are not in editableConfigs
        alert("此预定义配置的名称不可更改。");
        setIsRenamingGroup(false);
        setRenameGroupValue(currentSelectedConfigDetails.name);
        return;
    }
    
    const isDuplicate = editableConfigs.some(c => c.id !== selectedConfigKey && c.name === renameGroupValue.trim());
    if (isDuplicate) {
      alert(`名称 "${renameGroupValue.trim()}" 已存在。请输入一个唯一的名称。`);
      setRenameGroupValue(currentSelectedConfigDetails.name); 
      return;
    }

    setEditableConfigs(prev => prev.map(c =>
      c.id === selectedConfigKey ? { ...c, name: renameGroupValue.trim() } : c
    ));
    setIsRenamingGroup(false);
  };

  const handleDeleteSelectedConfig = () => {
    if (selectedConfigKey === DEFAULT_ENV_GEMINI_CONFIG_ID || !currentSelectedConfigDetails) return;
    if (!('apiKey' in currentSelectedConfigDetails) || !editableConfigs.some(ec => ec.id === selectedConfigKey) ) {
        alert("无法删除此预定义配置。");
        return;
    }
    if (!confirm(`确定要删除配置 "${currentSelectedConfigDetails.name}" 吗？此操作无法撤销。`)) return;

    setEditableConfigs(prev => prev.filter(c => c.id !== selectedConfigKey));
    setSelectedConfigKey(DEFAULT_ENV_GEMINI_CONFIG_ID);
    setIsRenamingGroup(false);
  };

  const renderContent = () => {
    switch (selectedCategory) {
      case 'aiConfig':
        return (
          <AiModelConfigSettings
            editableConfigs={editableConfigs} // Pass live state from App.tsx
            setEditableConfigs={setEditableConfigs} // Pass setter from App.tsx
            selectedConfigKey={selectedConfigKey}
            setSelectedConfigKey={handleSelectConfigKey}
            onAddNewConfig={handleAddNewConfig}
            onRenameSelectedConfig={handleRenameSelectedConfig}
            onDeleteSelectedConfig={handleDeleteSelectedConfig}
            isRenamingGroup={isRenamingGroup}
            setIsRenamingGroup={setIsRenamingGroup}
            renameGroupValue={renameGroupValue}
            setRenameGroupValue={setRenameGroupValue}
            currentSelectedEditableConfig={editableConfigs.find(c => c.id === selectedConfigKey)}
            mergedModelConfigs={mergedModelConfigs} // Pass merged configs
          />
        );
      case 'theme':
        return <ThemeSettings />;
      default:
        return null;
    }
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-settings-modal-title"
      onMouseDown={onClose}
    >
      <div
        ref={modalRef}
        className={`flex flex-col ${theme.bg} ${theme.border} rounded-lg shadow-xl w-full max-w-3xl h-[70vh] md:h-[75vh] overflow-hidden`}
        onMouseDown={stopPropagation}
      >
        <div className={`flex items-center justify-between p-4 border-b ${theme.border} shrink-0`}>
          <h2 id="global-settings-modal-title" className={`text-xl font-semibold ${inspectorTheme.headerText}`}>
            全局设置
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:${theme.itemBgHover} focus:outline-none focus:ring-2 focus:ring-sky-500`}
            aria-label="关闭全局设置"
          >
            <XMarkIcon className={`w-5 h-5 ${theme.itemText}`} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className={`w-48 md:w-56 ${panelTheme.bg} border-r ${panelTheme.border} p-3 space-y-1 overflow-y-auto shrink-0`}>
            {SETTINGS_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm transition-colors
                  ${selectedCategory === category.id
                    ? `${panelTheme.nodeItemSelectedForPlacementBg} ${panelTheme.nodeItemSelectedForPlacementText}`
                    : `${panelTheme.nodeItemText} hover:${panelTheme.nodeItemBgHover} hover:${panelTheme.nodeItemTextHover}`
                  }
                `}
                aria-current={selectedCategory === category.id ? 'page' : undefined}
              >
                <category.icon className={`w-4 h-4 mr-2.5 shrink-0 ${selectedCategory === category.id ? panelTheme.nodeItemSelectedForPlacementText : panelTheme.nodeItemIcon}`} />
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-zinc-800">
            {renderContent()}
          </div>
        </div>
        <style>{`
            .animation-fadeInQuick {
              animation: fadeInModalContent 0.2s ease-out forwards;
            }
            @keyframes fadeInModalContent {
              from { opacity: 0.3; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
      </div>
    </div>
  );
};
