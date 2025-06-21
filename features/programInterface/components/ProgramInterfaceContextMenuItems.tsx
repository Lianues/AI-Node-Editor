
// features/programInterface/components/ProgramInterfaceContextMenuItems.tsx
import { ProgramInterfaceContextMenuItem, ProgramInterfaceContextMenuActions, ProgramInterfaceContextMenuItemActionPayload } from '../types/programInterfaceContextMenuTypes';
import { ProgramInterfaceDisplayItem } from '../../../types'; 

export const buildProgramInterfaceContextMenuItems = (
  targetItem: ProgramInterfaceDisplayItem,
  actions: ProgramInterfaceContextMenuActions
): ProgramInterfaceContextMenuItem[] => {
  const items: ProgramInterfaceContextMenuItem[] = [];

  // Example: Add Rename (if implemented)
  // items.push({
  //   id: `rename-interface-${targetItem.id}`,
  //   label: '重命名...',
  //   onClick: () => { /* Logic to trigger rename UI, then call actions.onUpdateName */ },
  // });

  if (actions.onDeleteItem) {
    if (items.length > 0) {
        items.push({ id: 'sep-before-delete', isSeparator: true, label: '' });
    }
    items.push({
      id: `delete-interface-${targetItem.id}`,
      label: '删除接口',
      onClick: () => actions.onDeleteItem!({ targetItem }), // Pass the targetItem
    });
  }
  

  return items;
};
