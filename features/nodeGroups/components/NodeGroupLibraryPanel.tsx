
import React, { useState, useCallback } from 'react';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { NodeGroupItem } from '../types/nodeGroupTypes';
import { CubeTransparentIcon } from '../../../components/icons/CubeTransparentIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '../../../components/icons/ChevronRightIcon';
import { NodeGroupProperties } from './NodeGroupProperties';

interface NodeGroupLibraryPanelProps {
  nodeGroups: NodeGroupItem[];
  onDragStartNodeGroup: (event: React.DragEvent<HTMLDivElement>, nodeGroupId: string) => void;
  isCreating: boolean;
  pendingName: string;
  onPendingNameChange: (newName: string) => void;
  onSaveNodeGroup: (name: string) => void;
  onCancelCreateNodeGroup: () => void;
  onUpdateNodeGroupDescription: (groupId: string, newDescription: string) => void;
  onUpdateNodeGroupName: (groupId: string, newName: string) => void;
  shouldCreateAreaOnGroupDrop: boolean;
  onToggleShouldCreateAreaOnGroupDrop: () => void;
  onReorderNodeGroupItem: (draggedItemId: string, targetItemId: string, position: 'before' | 'after') => void; // New
}

export const NodeGroupLibraryPanel: React.FC<NodeGroupLibraryPanelProps> = ({
  nodeGroups,
  onDragStartNodeGroup,
  isCreating,
  pendingName,
  onPendingNameChange,
  onSaveNodeGroup,
  onCancelCreateNodeGroup,
  onUpdateNodeGroupDescription,
  onUpdateNodeGroupName,
  shouldCreateAreaOnGroupDrop,
  onToggleShouldCreateAreaOnGroupDrop,
  onReorderNodeGroupItem, // New
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const inputTheme = vscodeDarkTheme.propertyInspector;
  const buttonTheme = vscodeDarkTheme.topBar;
  const checkboxLabelClass = `ml-2 text-sm ${inputTheme.labelText}`;
  const checkboxClass = `h-4 w-4 rounded border-zinc-600 text-sky-500 focus:ring-sky-500 bg-zinc-700`;

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null); // New state for reordering
  const [dropTargetInfo, setDropTargetInfo] = useState<{ id: string; position: 'before' | 'after' } | null>(null); // New state for reordering

  const handleSave = () => {
    if (pendingName.trim()) {
      onSaveNodeGroup(pendingName.trim());
    } else {
      alert("节点组名称不能为空。");
    }
  };

  const handleToggleExpand = (groupId: string) => {
    if (isCreating) return;
    setExpandedGroupId(prevId => (prevId === groupId ? null : groupId));
  };

  // --- Drag and Drop for Reordering ---
  const handleDragStartInternal = useCallback((event: React.DragEvent<HTMLDivElement>, item: NodeGroupItem) => {
    if (isCreating) {
      event.preventDefault();
      return;
    }
    // For reordering within the panel
    event.dataTransfer.setData('application/ai-workflow-ng-library-dragged-item-id', item.id);
    // For dragging to canvas (original functionality)
    onDragStartNodeGroup(event, item.id); // This sets 'application/ai-workflow-node-group-id'
    event.dataTransfer.effectAllowed = 'all';
    setDraggingItemId(item.id);
  }, [isCreating, onDragStartNodeGroup]);

  const handleDragOverInternal = useCallback((event: React.DragEvent<HTMLDivElement>, targetItem: NodeGroupItem) => {
    event.preventDefault();
    if (!draggingItemId || draggingItemId === targetItem.id || isCreating) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetInfo && dropTargetInfo.id !== targetItem.id) setDropTargetInfo(null);
      return;
    }
    if (event.dataTransfer.types.includes('application/ai-workflow-ng-library-dragged-item-id')) {
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = event.clientY < midY ? 'before' : 'after';
      if (!dropTargetInfo || dropTargetInfo.id !== targetItem.id || dropTargetInfo.position !== position) {
        setDropTargetInfo({ id: targetItem.id, position });
      }
    } else {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetInfo) setDropTargetInfo(null);
    }
  }, [draggingItemId, isCreating, dropTargetInfo]);

  const handleDragLeaveInternal = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTargetInfo(null);
    }
  }, []);

  const handleDropInternal = useCallback((event: React.DragEvent<HTMLDivElement>, targetItem: NodeGroupItem) => {
    event.preventDefault();
    const draggedIdFromData = event.dataTransfer.getData('application/ai-workflow-ng-library-dragged-item-id');

    if (draggedIdFromData && draggingItemId === draggedIdFromData && dropTargetInfo && dropTargetInfo.id === targetItem.id) {
      onReorderNodeGroupItem(draggingItemId, targetItem.id, dropTargetInfo.position);
    }
    setDraggingItemId(null);
    setDropTargetInfo(null);
  }, [draggingItemId, dropTargetInfo, onReorderNodeGroupItem]);

  const handleDragEndInternal = useCallback(() => {
    setDraggingItemId(null);
    setDropTargetInfo(null);
  }, []);
  // --- End Drag and Drop for Reordering ---

  return (
    <div className={`w-64 ${panelTheme.bg} p-3 border-r ${panelTheme.border} overflow-y-auto shrink-0 select-none space-y-2 flex flex-col`}>
      <h2 className={`text-lg font-semibold ${panelTheme.headerText} mb-1 px-1`}>节点组库</h2>
      
      <div className="flex items-center mb-2 px-1">
        <input
          id="create-area-on-drop-checkbox"
          type="checkbox"
          className={checkboxClass}
          checked={shouldCreateAreaOnGroupDrop}
          onChange={onToggleShouldCreateAreaOnGroupDrop}
          aria-label="放置时创建同名区域"
        />
        <label htmlFor="create-area-on-drop-checkbox" className={checkboxLabelClass}>
          放置时创建同名区域
        </label>
      </div>
      
      {isCreating && (
        <div className={`p-2 mb-3 border rounded-md ${panelTheme.categoryGroupBg} border-zinc-600`}>
          <label htmlFor="node-group-name-input" className={`block text-xs font-medium ${inputTheme.labelText} mb-1`}>
            节点组名称:
          </label>
          <input
            id="node-group-name-input"
            type="text"
            value={pendingName}
            onChange={(e) => onPendingNameChange(e.target.value)}
            placeholder="输入节点组名称..."
            className={`w-full px-2 py-1.5 ${inputTheme.valueText} bg-zinc-700 border border-zinc-600 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm mb-2`}
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancelCreateNodeGroup}
              className={`${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${buttonTheme.buttonDefaultText} text-xs px-3 py-1 rounded-md transition-colors`}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className={`${buttonTheme.buttonPrimaryBg} hover:${buttonTheme.buttonPrimaryBgHover} ${buttonTheme.buttonPrimaryText} text-xs px-3 py-1 rounded-md transition-colors`}
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow overflow-y-auto space-y-1">
        {nodeGroups.length === 0 && !isCreating && (
          <p className={`text-sm ${panelTheme.emptyPanelText} px-1 text-center py-4`}>节点组库为空。</p>
        )}
        {nodeGroups.map((group) => {
          const isExpanded = expandedGroupId === group.id;
          const isBeingDragged = draggingItemId === group.id;

          let itemContainerClasses = `rounded-md relative`;
          if (isExpanded && !isCreating) {
            itemContainerClasses += ` ${panelTheme.categoryGroupBg}`;
          }
          if (isBeingDragged) {
            itemContainerClasses += ` opacity-50`;
          }
          if (dropTargetInfo?.id === group.id) {
            itemContainerClasses += dropTargetInfo.position === 'before'
              ? ` border-t-2 ${panelTheme.categoryDropIndicatorBorder}`
              : ` border-b-2 ${panelTheme.categoryDropIndicatorBorder}`;
          }

          let itemClasses = "w-full flex items-center text-left p-2 rounded-md transition-all duration-150";
          if (isCreating) {
            itemClasses += ` opacity-50 cursor-default`;
          } else {
            itemClasses += ` ${isExpanded ? panelTheme.categoryBgActive : panelTheme.nodeItemBg}`;
            itemClasses += ` ${panelTheme.nodeItemText}`;
            itemClasses += ` hover:${panelTheme.nodeItemBgHover} hover:${panelTheme.nodeItemTextHover}`;
            itemClasses += ` ${draggingItemId ? 'cursor-grabbing' : 'cursor-grab'}`;
          }

          return (
            <div 
              key={group.id} 
              className={itemContainerClasses}
              draggable={!isCreating}
              onDragStart={(event) => handleDragStartInternal(event, group)}
              onDragOver={(event) => handleDragOverInternal(event, group)}
              onDragLeave={(event) => handleDragLeaveInternal(event)}
              onDrop={(event) => handleDropInternal(event, group)}
              onDragEnd={handleDragEndInternal}
            >
              <div
                onClick={() => handleToggleExpand(group.id)}
                className={itemClasses}
                title={`${group.name}${group.description ? ` - ${group.description}` : ''}`}
                role="button"
                aria-expanded={isExpanded}
                aria-disabled={isCreating}
              >
                {isExpanded ? (
                  <ChevronDownIcon className={`w-4 h-4 mr-1.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
                ) : (
                  <ChevronRightIcon className={`w-4 h-4 mr-1.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
                )}
                <CubeTransparentIcon className={`w-4 h-4 mr-2 shrink-0 ${panelTheme.nodeItemIcon}`} />
                <div className="flex flex-col overflow-hidden flex-grow min-w-0">
                  <span className="truncate text-sm select-none font-medium">{group.name}</span>
                  {group.description ? (
                    <span className="truncate text-xs select-none text-zinc-400" title={group.description}>
                      {group.description}
                    </span>
                  ) : (
                     <span className="text-xs select-none text-zinc-500 italic">无备注</span>
                  )}
                </div>
              </div>
              {isExpanded && !isCreating && (
                <NodeGroupProperties 
                  group={group} 
                  onUpdateGroupDescription={onUpdateNodeGroupDescription} 
                  onUpdateGroupName={onUpdateNodeGroupName}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
