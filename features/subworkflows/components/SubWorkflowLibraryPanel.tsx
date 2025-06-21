
import React, { useState, useCallback } from 'react'; 
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { SubWorkflowItem } from '../types/subWorkflowTypes';
import { PuzzlePieceIcon } from '../../../components/icons/PuzzlePieceIcon'; 
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '../../../components/icons/ChevronRightIcon';
import { SubWorkflowProperties } from './SubWorkflowProperties';
import { useSubWorkflowContextMenu } from '../hooks/useSubWorkflowContextMenu'; 
import { buildSubWorkflowContextMenuItems } from './SubWorkflowContextMenuItems'; 
import { SubWorkflowContextMenu } from './SubWorkflowContextMenu'; 

interface SubWorkflowLibraryPanelProps {
  subWorkflows: SubWorkflowItem[];
  onDragStartSubWorkflow: (event: React.DragEvent<HTMLDivElement>, subWorkflowId: string) => void;
  onAddNewSubWorkflowTab?: () => void;
  onUpdateSubWorkflowName?: (id: string, newName: string) => void; 
  onUpdateSubWorkflowDescription?: (id: string, newDescription: string) => void;
  onOpenSubWorkflowTabById?: (subWorkflowId: string) => void;
  onMarkSubWorkflowTabUnsaved?: (subWorkflowId: string) => void;
  onReorderSubWorkflowItem: (draggedItemId: string, targetItemId: string, position: 'before' | 'after') => void; // New
}

export const SubWorkflowLibraryPanel: React.FC<SubWorkflowLibraryPanelProps> = ({
  subWorkflows,
  onDragStartSubWorkflow,
  onAddNewSubWorkflowTab,
  onUpdateSubWorkflowName, 
  onUpdateSubWorkflowDescription,
  onOpenSubWorkflowTabById,
  onMarkSubWorkflowTabUnsaved,
  onReorderSubWorkflowItem, // New
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const buttonTheme = vscodeDarkTheme.topBar;
  const [expandedSubWorkflowId, setExpandedSubWorkflowId] = useState<string | null>(null);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTargetInfo, setDropTargetInfo] = useState<{ id: string; position: 'before' | 'after' } | null>(null);


  const {
    menuConfig: subWorkflowMenuConfig,
    openSubWorkflowContextMenu,
    closeSubWorkflowContextMenu,
  } = useSubWorkflowContextMenu();

  const handleToggleExpand = (subWorkflowId: string) => {
    setExpandedSubWorkflowId(prevId => (prevId === subWorkflowId ? null : subWorkflowId));
  };

  const handleContextMenu = useCallback((event: React.MouseEvent, subWorkflowId: string) => {
    if (!onOpenSubWorkflowTabById) return; 

    const actions = {
      onOpenSubWorkflowTabById: ({ subWorkflowId: swId }: { subWorkflowId: string }) => {
        if (onOpenSubWorkflowTabById) {
          onOpenSubWorkflowTabById(swId);
        }
      },
    };
    const menuItems = buildSubWorkflowContextMenuItems(subWorkflowId, subWorkflows, actions);
    openSubWorkflowContextMenu(event, subWorkflowId, menuItems);
  }, [subWorkflows, openSubWorkflowContextMenu, onOpenSubWorkflowTabById]);

  const handleDragStartInternal = (event: React.DragEvent<HTMLDivElement>, item: SubWorkflowItem) => {
    // For reordering within the panel
    event.dataTransfer.setData('application/ai-workflow-sw-library-dragged-item-id', item.id);
    // For dragging to canvas (original functionality)
    event.dataTransfer.setData('application/ai-workflow-subworkflow-id', item.id);
    event.dataTransfer.effectAllowed = 'all'; 
    setDraggingItemId(item.id);
    if (onDragStartSubWorkflow) { // Call original prop if it has other side effects
      onDragStartSubWorkflow(event, item.id);
    }
  };

  const handleDragOverInternal = (event: React.DragEvent<HTMLDivElement>, targetItem: SubWorkflowItem) => {
    event.preventDefault();
    if (!draggingItemId || draggingItemId === targetItem.id) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetInfo && dropTargetInfo.id !== targetItem.id) setDropTargetInfo(null);
      return;
    }
    if (event.dataTransfer.types.includes('application/ai-workflow-sw-library-dragged-item-id')) {
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = event.clientY < midY ? 'before' : 'after';
      if (!dropTargetInfo || dropTargetInfo.id !== targetItem.id || dropTargetInfo.position !== position) {
        setDropTargetInfo({ id: targetItem.id, position });
      }
    } else {
      event.dataTransfer.dropEffect = 'none'; // Not a reorder drag
      if (dropTargetInfo) setDropTargetInfo(null);
    }
  };

  const handleDragLeaveInternal = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTargetInfo(null);
    }
  };

  const handleDropInternal = (event: React.DragEvent<HTMLDivElement>, targetItem: SubWorkflowItem) => {
    event.preventDefault();
    const draggedIdFromData = event.dataTransfer.getData('application/ai-workflow-sw-library-dragged-item-id');

    if (draggedIdFromData && draggingItemId === draggedIdFromData && dropTargetInfo && dropTargetInfo.id === targetItem.id) {
      onReorderSubWorkflowItem(draggingItemId, targetItem.id, dropTargetInfo.position);
    }
    setDraggingItemId(null);
    setDropTargetInfo(null);
  };

  const handleDragEndInternal = () => {
    setDraggingItemId(null);
    setDropTargetInfo(null);
  };


  return (
    <div className={`w-64 ${panelTheme.bg} p-3 border-r ${panelTheme.border} overflow-y-auto shrink-0 select-none space-y-2 flex flex-col`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className={`text-lg font-semibold ${panelTheme.headerText}`}>子程序库</h2>
        {onAddNewSubWorkflowTab && (
          <button
            onClick={onAddNewSubWorkflowTab}
            className={`p-1.5 rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} transition-colors`}
            title="新建子程序"
            aria-label="新建子程序"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto space-y-1">
        {subWorkflows.length === 0 && (
          <p className={`text-sm ${panelTheme.emptyPanelText} px-1 text-center py-4`}>子程序库为空。</p>
        )}
        {subWorkflows.map((subWorkflow) => {
          const isExpanded = expandedSubWorkflowId === subWorkflow.id;
          const isBeingDragged = draggingItemId === subWorkflow.id;

          let itemBaseClasses = `w-full flex items-center text-left p-2 rounded-md transition-all duration-150 relative`;
          let itemContainerClasses = `rounded-md relative`;
          
          if (isExpanded) {
            itemContainerClasses += ` ${panelTheme.categoryGroupBg}`;
          }
          if (isBeingDragged) {
            itemContainerClasses += ` opacity-50`;
          }

          if (dropTargetInfo?.id === subWorkflow.id) {
            itemContainerClasses += dropTargetInfo.position === 'before'
              ? ` border-t-2 ${panelTheme.categoryDropIndicatorBorder}`
              : ` border-b-2 ${panelTheme.categoryDropIndicatorBorder}`;
          }
          
          itemBaseClasses += ` ${isExpanded ? panelTheme.categoryBgActive : panelTheme.nodeItemBg}`;
          itemBaseClasses += ` ${panelTheme.nodeItemText}`;
          itemBaseClasses += ` hover:${panelTheme.nodeItemBgHover} hover:${panelTheme.nodeItemTextHover}`;
          itemBaseClasses += ` ${draggingItemId ? 'cursor-grabbing' : 'cursor-grab'}`;


          return (
            <div 
              key={subWorkflow.id} 
              className={itemContainerClasses}
              onContextMenu={(e) => handleContextMenu(e, subWorkflow.id)}
              draggable={true}
              onDragStart={(event) => handleDragStartInternal(event, subWorkflow)}
              onDragOver={(event) => handleDragOverInternal(event, subWorkflow)}
              onDragLeave={(event) => handleDragLeaveInternal(event)}
              onDrop={(event) => handleDropInternal(event, subWorkflow)}
              onDragEnd={handleDragEndInternal}
            >
              <div
                onClick={() => handleToggleExpand(subWorkflow.id)}
                className={itemBaseClasses}
                title={`${subWorkflow.name}${subWorkflow.description ? ` - ${subWorkflow.description}` : ''}`}
                role="button"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDownIcon className={`w-4 h-4 mr-1.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
                ) : (
                  <ChevronRightIcon className={`w-4 h-4 mr-1.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
                )}
                <PuzzlePieceIcon className={`w-4 h-4 mr-2 shrink-0 ${panelTheme.nodeItemIcon}`} />
                <div className="flex flex-col overflow-hidden flex-grow min-w-0">
                  <span className="truncate text-sm select-none font-medium">{subWorkflow.name}</span>
                  {subWorkflow.description ? (
                    <span className="truncate text-xs select-none text-zinc-400" title={subWorkflow.description}>
                      {subWorkflow.description}
                    </span>
                  ) : (
                     <span className="text-xs select-none text-zinc-500 italic">无备注</span>
                  )}
                </div>
              </div>
              {isExpanded && onUpdateSubWorkflowName && onUpdateSubWorkflowDescription && onMarkSubWorkflowTabUnsaved && (
                <SubWorkflowProperties 
                  subWorkflow={subWorkflow} 
                  onUpdateName={onUpdateSubWorkflowName} 
                  onUpdateDescription={onUpdateSubWorkflowDescription}
                  onMarkUnsaved={onMarkSubWorkflowTabUnsaved}
                />
              )}
            </div>
          );
        })}
      </div>
      <SubWorkflowContextMenu menuConfig={subWorkflowMenuConfig} onClose={closeSubWorkflowContextMenu} />
    </div>
  );
};
