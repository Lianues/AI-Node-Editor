
import React, { useState, useEffect, useCallback } from 'react';
import { NodeGroupItem } from '../types/nodeGroupTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

interface NodeGroupPropertiesProps {
  group: NodeGroupItem;
  onUpdateGroupDescription: (groupId: string, newDescription: string) => void;
  onUpdateGroupName: (groupId: string, newName: string) => void; // New prop
}

export const NodeGroupProperties: React.FC<NodeGroupPropertiesProps> = ({ group, onUpdateGroupDescription, onUpdateGroupName }) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const inputTheme = vscodeDarkTheme.propertyInspector;

  const [editableName, setEditableName] = useState(group.name);
  const [editableDescription, setEditableDescription] = useState(group.description || "");

  useEffect(() => {
    setEditableName(group.name);
    setEditableDescription(group.description || "");
  }, [group.id, group.name, group.description]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditableName(event.target.value);
  };

  const handleNameBlur = () => {
    const trimmedName = editableName.trim();
    if (trimmedName && trimmedName !== group.name) {
      onUpdateGroupName(group.id, trimmedName);
    } else if (!trimmedName) {
      // Revert to original name if input is empty, as name cannot be empty
      setEditableName(group.name);
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableDescription(event.target.value);
  };

  const handleDescriptionBlur = () => {
    if (editableDescription !== (group.description || "")) {
      onUpdateGroupDescription(group.id, editableDescription);
    }
  };
  
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur(); // Trigger blur to save
    } else if (event.key === 'Escape') {
       if (event.currentTarget.id.startsWith('group-name-')) {
        setEditableName(group.name);
      } else if (event.currentTarget.id.startsWith('group-desc-')) {
        setEditableDescription(group.description || "");
      }
      event.currentTarget.blur();
    }
  };

  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className={`p-3 my-0.5 mx-1 border ${panelTheme.border} bg-zinc-700 rounded-b-md`}>
      <div className="space-y-2 text-xs">
        <div>
          <label htmlFor={`group-name-${group.id}`} className={`${inspectorTheme.labelText} font-medium block mb-0.5`}>名称:</label>
          <input
            id={`group-name-${group.id}`}
            type="text"
            value={editableName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleInputKeyDown}
            onMouseDown={stopPropagationMouseDown}
            className={`w-full px-2 py-1.5 text-xs ${inputTheme.valueText} bg-zinc-600 border border-zinc-500 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none`}
            aria-label={`名称 ${group.name}`}
          />
        </div>
        <div>
          <label htmlFor={`group-desc-${group.id}`} className={`${inspectorTheme.labelText} font-medium block mb-0.5`}>描述 (备注):</label>
          <textarea
            id={`group-desc-${group.id}`}
            value={editableDescription}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            onKeyDown={handleInputKeyDown}
            onMouseDown={stopPropagationMouseDown}
            placeholder="添加备注..."
            rows={3}
            className={`w-full px-2 py-1.5 text-xs ${inputTheme.valueText} bg-zinc-600 border border-zinc-500 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y`}
            aria-label={`备注 ${group.name}`}
          />
        </div>
        <div>
          <span className={`${inspectorTheme.labelText} font-medium`}>ID: </span>
          <span className={`${inspectorTheme.valueTextMuted} break-all`}>{group.id}</span>
        </div>
        <div>
          <span className={`${inspectorTheme.labelText} font-medium`}>包含节点数: </span>
          <span className={`${inspectorTheme.valueTextMuted}`}>{group.nodeCount}</span>
        </div>
        <div>
          <span className={`${inspectorTheme.labelText} font-medium`}>包含连接数: </span>
          <span className={`${inspectorTheme.valueTextMuted}`}>{group.connectionCount}</span>
        </div>
         <div>
          <span className={`${inspectorTheme.labelText} font-medium`}>创建于: </span>
          <span className={`${inspectorTheme.valueTextMuted}`}>{new Date(group.createdAt).toLocaleString()}</span>
        </div>
        <div>
          <span className={`${inspectorTheme.labelText} font-medium`}>更新于: </span>
          <span className={`${inspectorTheme.valueTextMuted}`}>{new Date(group.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
