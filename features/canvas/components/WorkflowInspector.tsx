import React from 'react';
import { Tab } from '../../tabs/types/tabTypes'; // Updated import path
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

interface WorkflowInspectorProps {
  activeTab: Tab;
  // Potentially add more props like node count, connection count for this tab in the future
}

const WorkflowInspector: React.FC<WorkflowInspectorProps> = ({ activeTab }) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>工作流 ID (标签页 ID)</label>
        <p className={`text-sm ${inspectorTheme.valueText} break-all`}>{activeTab.id}</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>工作流标题</label>
        <p className={`text-sm ${inspectorTheme.valueText}`}>{activeTab.title}</p>
      </div>
      <div>
        <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>类型</label>
        <p className={`text-sm ${inspectorTheme.valueTextMuted}`}>{activeTab.type}</p>
      </div>
      {activeTab.unsaved && (
        <div>
          <label className={`block text-xs font-medium ${inspectorTheme.labelText}`}>状态</label>
          <p className={`text-sm ${inspectorTheme.warningText}`}>未保存更改</p>
        </div>
      )}
      {/* Add more workflow-specific properties here as needed */}
    </div>
  );
};

export default WorkflowInspector;