// features/subworkflows/components/SubWorkflowContextMenuItems.tsx
import { SubWorkflowContextMenuItem, SubWorkflowContextMenuItemActionPayload } from '../types/subWorkflowContextMenuTypes';
import { SubWorkflowItem } from '../types/subWorkflowTypes'; // For context, not directly used for types here

export interface SubWorkflowContextMenuActions {
  onOpenSubWorkflowTabById: (payload: { subWorkflowId: string }) => void;
  // Add other actions like onDelete, onRename later
}

export const buildSubWorkflowContextMenuItems = (
  targetSubWorkflowId: string,
  allSubWorkflows: SubWorkflowItem[], // May not be needed for current items, but good for future
  actions: SubWorkflowContextMenuActions
): SubWorkflowContextMenuItem[] => {
  const targetSubWorkflow = allSubWorkflows.find(sw => sw.id === targetSubWorkflowId);
  if (!targetSubWorkflow) return []; 

  const items: SubWorkflowContextMenuItem[] = [];

  items.push({
    id: 'open-subworkflow-interface',
    label: '打开子程序界面',
    onClick: () => actions.onOpenSubWorkflowTabById({ subWorkflowId: targetSubWorkflowId }),
  });
  
  // Placeholder for future actions
  // items.push({ id: 'sep1', isSeparator: true, label: '' });
  // items.push({ id: 'rename-subworkflow', label: '重命名', onClick: () => console.log('Rename clicked'), disabled: true });
  // items.push({ id: 'delete-subworkflow', label: '删除', onClick: () => console.log('Delete clicked'), disabled: true });

  return items;
};
