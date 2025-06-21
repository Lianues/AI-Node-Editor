
import React from 'react';
import { Node, NodeTypeDefinition, NodeExecutionState, DefinedArea, NotificationType, RegisteredAiTool, ModelConfigGroup, EditableAiModelConfig } from '../types'; // Added ModelConfigGroup, EditableAiModelConfig
import { Connection } from '../features/connections/types/connectionTypes';
import { Tab } from '../features/tabs/types/tabTypes'; 
import { vscodeDarkTheme } from '../theme/vscodeDark';
import ConnectionInspector from '../features/connections/components/ConnectionInspector';
import WorkflowInspector from '../features/canvas/components/WorkflowInspector';
import { DefinedAreaInspector } from '../features/areaDefinition/components/DefinedAreaInspector'; 
import { AI_TEXT_GENERATION_NODE_TYPE_KEY } from '../nodes/AiTextGeneration/Definition';
import { SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY } from '../nodes/SubworkflowInstance/Definition'; 
import { AI_MODEL_SELECTION_NODE_TYPE_KEY } from '../nodes/AiModelSelectionNode/Definition'; // Import new node type key

interface PropertyInspectorPanelProps {
  node: Node | null;
  selectedNodeIds: string[]; 
  nodeDefinition: NodeTypeDefinition | null;
  selectedConnection: Connection | null;
  selectedDefinedArea: DefinedArea | null; 
  activeTab: Tab | null;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  updateDefinedArea?: (areaId: string, updates: Partial<Omit<DefinedArea, 'id'>>) => void; 
  selectedNodeExecutionState: NodeExecutionState | null;
  onOpenSubWorkflowTabById?: (subWorkflowId: string) => void; 
  addNotification: (message: string, type: NotificationType, duration?: number) => void; 
  customTools?: RegisteredAiTool[]; 
  mergedModelConfigs: Array<ModelConfigGroup | EditableAiModelConfig>; 
}

export const PropertyInspectorPanel: React.FC<PropertyInspectorPanelProps> = ({
  node,
  selectedNodeIds, 
  nodeDefinition, 
  selectedConnection,
  selectedDefinedArea, 
  activeTab,
  updateNodeData,
  updateDefinedArea, 
  selectedNodeExecutionState,
  onOpenSubWorkflowTabById, 
  addNotification, 
  customTools, 
  mergedModelConfigs, 
}) => {
  const theme = vscodeDarkTheme.propertyInspector;

  let InspectorComponent: React.FC<any> | null = null;
  let inspectorProps: any = {};
  let title = "属性检查";
  let content: React.ReactNode = null;

  if (selectedNodeIds.length > 1) {
    title = "多选属性";
    content = (
      <p className={`text-sm ${theme.infoText}`}>
        已选中 {selectedNodeIds.length} 个节点。
      </p>
    );
  } else if (node && nodeDefinition) {
    InspectorComponent = nodeDefinition.inspector;
    title = `节点属性: ${node.title}`;
    inspectorProps = { 
      node, 
      updateNodeData, 
      nodeDefinition: nodeDefinition, 
      executionDetails: selectedNodeExecutionState?.executionDetails,
      customTools: customTools,
      mergedModelConfigs: mergedModelConfigs, 
    };
    if (node.type === SUBWORKFLOW_INSTANCE_NODE_TYPE_KEY) {
      if (onOpenSubWorkflowTabById) {
        inspectorProps.onOpenSubWorkflowTabById = onOpenSubWorkflowTabById;
      }
      inspectorProps.addNotification = addNotification; 
    }
    // AiModelSelectionNode also needs mergedModelConfigs for its BaseNodeInspector wrapper
    if (node.type === AI_MODEL_SELECTION_NODE_TYPE_KEY) {
      // No specific extra props needed for AiModelSelectionInspector beyond what BaseNodeInspector takes
    }
  } else if (selectedConnection) {
    InspectorComponent = ConnectionInspector;
    inspectorProps = { connection: selectedConnection };
    title = "连接属性";
  } else if (selectedDefinedArea && updateDefinedArea) { 
    InspectorComponent = DefinedAreaInspector;
    inspectorProps = { area: selectedDefinedArea, updateDefinedArea };
    title = `区域属性: ${selectedDefinedArea.title}`;
  } else if (activeTab) {
    InspectorComponent = WorkflowInspector;
    inspectorProps = { activeTab };
    title = `工作流属性: ${activeTab.title}`;
  } else {
    content = <p className={`text-sm ${theme.infoText}`}>选择画布上的项目或画布本身以查看其属性。</p>;
  }
  
  if (InspectorComponent && Object.keys(inspectorProps).length > 0 && !content) {
    content = <InspectorComponent {...inspectorProps} />;
  }
  
  const lastExecCtxId = node && selectedNodeExecutionState?.executionDetails?.lastExecutionContextId;

  return (
    <div className={`w-72 ${theme.bg} p-4 border-l ${theme.border} overflow-y-auto shrink-0`}>
      <h2 className={`text-lg font-semibold ${theme.headerText} mb-4 truncate`} title={title}>{title}</h2>

      {selectedNodeIds.length === 1 && node && lastExecCtxId && (
        <div className="mb-3 p-2 bg-zinc-700 rounded-md">
          <label className={`block text-xs font-medium ${theme.labelText}`}>最后执行上下文ID</label>
          <p className={`text-sm ${theme.valueTextMuted} break-all`} title={lastExecCtxId}>
            ...{lastExecCtxId.slice(-12)}
          </p>
        </div>
      )}

      {content}
      
      {selectedNodeIds.length === 1 && node && !nodeDefinition && !InspectorComponent && (
         <div className="space-y-3">
          <div>
            <label className={`block text-xs font-medium ${theme.labelText}`}>ID</label>
            <p className={`text-sm ${theme.valueText} break-all`}>{node.id}</p>
          </div>
          <div>
            <label className={`block text-xs font-medium ${theme.labelText}`}>Title</label>
            <p className={`text-sm ${theme.valueText}`}>{node.title}</p>
          </div>
           <p className={`text-sm ${theme.warningText}`}>此节点类型未定义检查器界面。</p>
        </div>
      )}
    </div>
  );
};
