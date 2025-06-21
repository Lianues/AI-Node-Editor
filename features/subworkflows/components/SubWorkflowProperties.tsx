
import React, { useState, useEffect, useCallback } from 'react';
import { SubWorkflowItem } from '../types/subWorkflowTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

interface SubWorkflowPropertiesProps {
  subWorkflow: SubWorkflowItem;
  onUpdateName: (id: string, newName: string) => void;
  onUpdateDescription: (id: string, newDescription: string) => void;
  onMarkUnsaved: (subWorkflowId: string) => void; // New prop
}

export const SubWorkflowProperties: React.FC<SubWorkflowPropertiesProps> = ({
  subWorkflow,
  onUpdateName,
  onUpdateDescription,
  onMarkUnsaved, // Destructure new prop
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const inputTheme = vscodeDarkTheme.propertyInspector;

  const [editableName, setEditableName] = useState(subWorkflow.name);
  const [editableDescription, setEditableDescription] = useState(subWorkflow.description || "");

  useEffect(() => {
    setEditableName(subWorkflow.name);
    setEditableDescription(subWorkflow.description || "");
  }, [subWorkflow.id, subWorkflow.name, subWorkflow.description]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditableName(event.target.value);
  };

  const handleNameBlur = () => {
    const trimmedName = editableName.trim();
    if (trimmedName && trimmedName !== subWorkflow.name) {
      onUpdateName(subWorkflow.id, trimmedName);
      onMarkUnsaved(subWorkflow.id); // Mark unsaved
    } else if (!trimmedName && (subWorkflow.name) ) { // Revert if empty and original name was not empty
      setEditableName(subWorkflow.name);
    } else if (trimmedName === subWorkflow.name) {
      // Name unchanged
    } else {
       // If original was empty and user typed then erased, it's still a change from persisted empty state
       if (editableName !== (subWorkflow.description || "")) {
          onUpdateName(subWorkflow.id, ""); // explicitly set to empty
          onMarkUnsaved(subWorkflow.id);
       }
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableDescription(event.target.value);
  };

  const handleDescriptionBlur = () => {
    if (editableDescription !== (subWorkflow.description || "")) {
      onUpdateDescription(subWorkflow.id, editableDescription);
      onMarkUnsaved(subWorkflow.id); // Mark unsaved
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { 
      event.currentTarget.blur(); 
    } else if (event.key === 'Escape') {
      if (event.currentTarget.id.startsWith('subworkflow-name-')) {
        setEditableName(subWorkflow.name);
      } else if (event.currentTarget.id.startsWith('subworkflow-desc-')) {
        setEditableDescription(subWorkflow.description || "");
      }
      event.currentTarget.blur();
    }
  };

  const stopPropagationMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className={`p-3 my-0.5 mx-1 border ${panelTheme.border} bg-zinc-700 rounded-b-md`}>
      <div className="space-y-2 text-xs">
        <div>
          <label htmlFor={`subworkflow-name-${subWorkflow.id}`} className={`${inspectorTheme.labelText} font-medium block mb-0.5`}>
            名称:
          </label>
          <input
            id={`subworkflow-name-${subWorkflow.id}`}
            type="text"
            value={editableName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleInputKeyDown}
            onMouseDown={stopPropagationMouseDown}
            className={`w-full px-2 py-1.5 text-xs ${inputTheme.valueText} bg-zinc-600 border border-zinc-500 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none`}
            aria-label={`名称 ${subWorkflow.name}`}
          />
        </div>
        <div>
          <label htmlFor={`subworkflow-desc-${subWorkflow.id}`} className={`${inspectorTheme.labelText} font-medium block mb-0.5`}>
            描述 (备注):
          </label>
          <textarea
            id={`subworkflow-desc-${subWorkflow.id}`}
            value={editableDescription}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            onKeyDown={handleInputKeyDown}
            onMouseDown={stopPropagationMouseDown}
            placeholder="添加备注..."
            rows={3}
            className={`w-full px-2 py-1.5 text-xs ${inputTheme.valueText} bg-zinc-600 border border-zinc-500 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y`}
            aria-label={`备注 ${subWorkflow.name}`}
          />
        </div>
        <div>
          <span className={`${inspectorTheme.labelText} font-medium`}>ID: </span>
          <span className={`${inspectorTheme.valueTextMuted} break-all`}>{subWorkflow.id}</span>
        </div>
      </div>
    </div>
  );
};
