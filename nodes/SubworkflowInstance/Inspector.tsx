
import React from 'react'; 
import { SpecificNodeInspectorProps, NotificationType, NodeTypeDefinition } from '../../types'; 
import { vscodeDarkTheme } from '../../theme/vscodeDark';
import BaseNodeInspector from '../../features/nodes/components/inspectors/BaseNodeInspector';
import { getStaticNodeDefinition as getNodeDefinition } from '../../nodes';

interface SubworkflowInstanceInspectorProps extends SpecificNodeInspectorProps {
  onOpenSubWorkflowTabById?: (subWorkflowId: string) => void;
  addNotification?: (message: string, type: NotificationType, duration?: number) => void;
  updateNodeData?: (nodeId: string, data: Record<string, any>) => void; 
}

const SubworkflowInstanceInspector: React.FC<SubworkflowInstanceInspectorProps> = ({ 
  node, 
  onOpenSubWorkflowTabById, 
  addNotification, 
  updateNodeData,
  executionDetails 
}) => {
  const inspectorTheme = vscodeDarkTheme.propertyInspector;
  const buttonTheme = vscodeDarkTheme.topBar;
  const nodeDefinition = getNodeDefinition(node.type) as NodeTypeDefinition | undefined;

  const subWorkflowId = node.data?.subWorkflowId;
  const subWorkflowName = node.data?.subWorkflowName || '未指定';

  const handleOpenSubWorkflow = () => {
    if (!subWorkflowId) {
      addNotification?.("错误：子程序 ID 丢失，无法打开编辑器。", NotificationType.Error);
      return;
    }
    if (!onOpenSubWorkflowTabById) {
      addNotification?.("错误：无法打开子程序编辑器 (处理函数丢失)。", NotificationType.Error);
      return;
    }
    onOpenSubWorkflowTabById(subWorkflowId);
  };
  
  if (!nodeDefinition) {
    return <p className={`text-sm ${inspectorTheme.warningText}`}>无法加载子程序实例节点的检查器：节点定义未找到。</p>;
  }

  return (
    <BaseNodeInspector
      node={node}
      updateNodeData={updateNodeData}
      nodeDefinition={nodeDefinition}
      executionDetails={executionDetails}
    >
      <div className="space-y-2">
        <div>
          <label className={inspectorTheme.labelText}>链接的子程序:</label>
          <p className={`${inspectorTheme.valueText} font-semibold`}>{subWorkflowName}</p>
          {subWorkflowId && (
            <p className={`${inspectorTheme.valueTextMuted} text-xs break-all`}>ID: {subWorkflowId}</p>
          )}
        </div>
        {subWorkflowId && onOpenSubWorkflowTabById && (
          <button
            onClick={handleOpenSubWorkflow}
            className={`w-full text-sm px-3 py-1.5 rounded-md transition-colors ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText}`}
          >
            打开子程序编辑器
          </button>
        )}
      </div>
    </BaseNodeInspector>
  );
};

export default SubworkflowInstanceInspector;
