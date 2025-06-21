
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { Node as AppNode, PortDataType, Tab, ProgramInterfaceDisplayItem } from '../../../types'; // Aliased Node to AppNode
import { HistoryActionType } from '../../history/historyTypes';
import { SUBWORKFLOW_INPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowInput/Definition';
import { SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY } from '../../../nodes/SubworkflowOutput/Definition';
import { ArrowDownTrayIcon } from '../../../components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from '../../../components/icons/ArrowUpTrayIcon';
import { DiamondIcon } from '../../../components/icons/DiamondIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '../../../components/icons/ChevronRightIcon';
import { ProgramInterfaceItemProperties } from './ProgramInterfaceItemProperties';
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { useProgramInterfaceContextMenu } from '../hooks/useProgramInterfaceContextMenu';
import { buildProgramInterfaceContextMenuItems } from './ProgramInterfaceContextMenuItems';
import { ProgramInterfaceContextMenu } from './ProgramInterfaceContextMenu';
import { WorkflowHistoryManagerOutput } from '../../history/useWorkflowHistoryManager';


// ProgramInterfaceDisplayItem is now imported from types.ts

interface ProgramInterfacePanelProps {
  nodes: AppNode[]; // Use AppNode
  activeTab: Tab | null;
  onUpdateInterfaceName: (item: ProgramInterfaceDisplayItem, newName: string) => void;
  onUpdateProgramInterfaceDetails: (
    item: ProgramInterfaceDisplayItem,
    updates: { dataType?: PortDataType; isPortRequired?: boolean }
  ) => void;
  onDeleteInterfaceItem: (item: ProgramInterfaceDisplayItem) => void;
  workflowHistoryManager?: WorkflowHistoryManagerOutput;
  logicalInterfaces: ProgramInterfaceDisplayItem[]; // Prop for lifted state
  onAddLogicalInterface: (item: ProgramInterfaceDisplayItem) => void; // Prop for adding
  onDeleteLogicalInterfaceFromPanel: (itemId: string) => void; // Prop for deleting
  onReorderLogicalInterface: ( // New prop for reordering
    draggedItemId: string,
    targetItemId: string,
    position: 'before' | 'after',
    itemType: 'input' | 'output'
  ) => void;
}

const getPortDisplayName = (node: AppNode, defaultPrefix: string): string => { // Use AppNode
  return node.data?.portName?.trim() || node.title || `${defaultPrefix} 未命名`;
};

const getTypeSpecificBadgeStyles = (dataType: PortDataType): { bgClass: string; textClass: string } => {
  const themePorts = vscodeDarkTheme.ports.dataTypeColors;
  const defaultLightText = 'text-slate-100';
  const defaultDarkText = 'text-zinc-900';

  let bgClass = themePorts[PortDataType.UNKNOWN]?.output.bg || 'bg-gray-500'; // Fallback
  let textClass = defaultLightText;

  const typeColors = themePorts[dataType]?.output; // Using output port color as a convention
  if (typeColors) {
    bgClass = typeColors.bg;
    switch (dataType) {
      case PortDataType.FLOW:
      case PortDataType.AI_CONFIG:
      case PortDataType.DATA_COLLECTION: // Ensure DATA_COLLECTION uses dark text if its background is light
        textClass = defaultDarkText;
        break;
      default:
        textClass = defaultLightText;
        break;
    }
  }
  return { bgClass, textClass };
};


export const ProgramInterfacePanel: React.FC<ProgramInterfacePanelProps> = ({
  nodes, // nodes prop is still used to help determine displayedInterfaces
  activeTab,
  onUpdateInterfaceName,
  onUpdateProgramInterfaceDetails,
  onDeleteInterfaceItem,
  workflowHistoryManager,
  logicalInterfaces, 
  onAddLogicalInterface, 
  onDeleteLogicalInterfaceFromPanel, 
  onReorderLogicalInterface, 
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;
  const buttonTheme = vscodeDarkTheme.topBar;
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  const [draggingItemInfo, setDraggingItemInfo] = useState<{ id: string; type: 'input' | 'output' } | null>(null);
  const [dropTargetInfo, setDropTargetInfo] = useState<{ id: string; position: 'before' | 'after'; type: 'input' | 'output' } | null>(null);


  const {
    menuConfig: piMenuConfig,
    openProgramInterfaceContextMenu,
    closeProgramInterfaceContextMenu,
  } = useProgramInterfaceContextMenu();


  const handleDeleteLogicalInterfaceItem = useCallback((itemToDelete: ProgramInterfaceDisplayItem) => {
    onDeleteLogicalInterfaceFromPanel(itemToDelete.id);
    if (workflowHistoryManager) {
      workflowHistoryManager.commitHistoryAction(HistoryActionType.DELETE_LOGICAL_PROGRAM_INTERFACE_ITEM, {
        interfaceName: itemToDelete.name,
        interfaceType: itemToDelete.nodeType,
        dataType: itemToDelete.dataType,
      });
    }
    setExpandedItemId(null);
  }, [workflowHistoryManager, onDeleteLogicalInterfaceFromPanel]);

  const handleContextMenuDeleteAction = useCallback((itemToDelete: ProgramInterfaceDisplayItem) => {
    if (!itemToDelete.isLogical) { // If it's a node-derived item
      onDeleteInterfaceItem(itemToDelete); // This triggers node deletion from canvas
    } else { // If it's a purely logical item
      handleDeleteLogicalInterfaceItem(itemToDelete);
    }
    closeProgramInterfaceContextMenu();
  }, [onDeleteInterfaceItem, handleDeleteLogicalInterfaceItem, closeProgramInterfaceContextMenu]);


  const handleContextMenu = useCallback((event: React.MouseEvent, item: ProgramInterfaceDisplayItem) => {
    const menuItems = buildProgramInterfaceContextMenuItems(item, {
      onDeleteItem: ({ targetItem }) => handleContextMenuDeleteAction(targetItem),
    });
    if (menuItems.length > 0) {
      openProgramInterfaceContextMenu(event, item, menuItems);
    }
  }, [openProgramInterfaceContextMenu, handleContextMenuDeleteAction]);


  const generateUniqueLogicalInterfaceName = useCallback((type: 'input' | 'output'): string => {
    const prefix = type === 'input' ? '新输入接口' : '新输出接口';
    let counter = 1;
    let name = `${prefix} ${counter}`;

    const allCurrentNames = new Set<string>(logicalInterfaces.map(li => li.name));

    while (allCurrentNames.has(name)) {
      counter++;
      name = `${prefix} ${counter}`;
    }
    return name;
  }, [logicalInterfaces]);

  const handleAddLogicalInterface = (type: 'input' | 'output') => {
    const newName = generateUniqueLogicalInterfaceName(type);
    const newLogicalItem: ProgramInterfaceDisplayItem = {
      id: `logical_${type}_${newName.replace(/\s/g, '_')}_${Date.now()}`,
      name: newName,
      dataType: PortDataType.ANY,
      originalDataType: PortDataType.ANY,
      isRequired: false,
      nodeType: type,
      isLogical: true,
    };
    onAddLogicalInterface(newLogicalItem); 
    if (workflowHistoryManager) {
      workflowHistoryManager.commitHistoryAction(HistoryActionType.ADD_NODE, { 
          newNodeId: newLogicalItem.id,
          newNodeType: `logical-${newLogicalItem.nodeType}-interface`, 
          newNodeTitle: newLogicalItem.name,
          committedNewNodeInstance: { id: newLogicalItem.id, title: newLogicalItem.name, type: `logical-${newLogicalItem.nodeType}-interface`, x:0, y:0, width:0, height:0, inputs:[], outputs:[], headerColor:'', bodyColor:'' } as AppNode, 
      });
    }
  };

  const handleUpdateNameInPanel = useCallback((interfaceItem: ProgramInterfaceDisplayItem, newName: string) => {
    onUpdateInterfaceName(interfaceItem, newName);
  }, [onUpdateInterfaceName]);


  const handleUpdateInterfaceDetailsInPanel = useCallback((
    interfaceItem: ProgramInterfaceDisplayItem,
    updates: { dataType?: PortDataType; isPortRequired?: boolean }
  ) => {
     onUpdateProgramInterfaceDetails(interfaceItem, updates);
  }, [onUpdateProgramInterfaceDetails]);

  const displayedInputInterfaces = logicalInterfaces.filter(item => item.nodeType === 'input');
  const displayedOutputInterfaces = logicalInterfaces.filter(item => item.nodeType === 'output');
  
  const handleItemDragStartInternal = (event: React.DragEvent<HTMLLIElement>, item: ProgramInterfaceDisplayItem) => {
    // Data for reordering within the panel
    event.dataTransfer.setData('application/ai-workflow-pi-dragged-item-id', item.id);
    event.dataTransfer.setData('application/ai-workflow-pi-dragged-item-type', item.nodeType);
    
    // Data for dropping onto the canvas
    const nodeTypeToCreate = item.nodeType === 'input' ? SUBWORKFLOW_INPUT_NODE_TYPE_KEY : SUBWORKFLOW_OUTPUT_NODE_TYPE_KEY;
    const dataToApply = { 
      portName: item.name, 
      portDataType: item.dataType, 
      isPortRequired: item.isRequired 
    };
    const titleToApply = item.name; // Use the interface item's name as the node's title
    const payloadForCanvas = { nodeTypeToCreate, dataToApply, titleToApply };
    event.dataTransfer.setData('application/ai-workflow-program-interface-item', JSON.stringify(payloadForCanvas));
    
    event.dataTransfer.effectAllowed = 'all'; // Allow both move (for reorder) and copy (for canvas drop)
    setDraggingItemInfo({ id: item.id, type: item.nodeType });
  };


  const handleItemDragOver = (event: React.DragEvent<HTMLLIElement>, targetItem: ProgramInterfaceDisplayItem) => {
    event.preventDefault();
    if (!draggingItemInfo || draggingItemInfo.type !== targetItem.nodeType || draggingItemInfo.id === targetItem.id) {
      event.dataTransfer.dropEffect = 'none';
      if (dropTargetInfo && dropTargetInfo.id !== targetItem.id) setDropTargetInfo(null);
      return;
    }
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = event.clientY < midY ? 'before' : 'after';
    if (!dropTargetInfo || dropTargetInfo.id !== targetItem.id || dropTargetInfo.position !== position) {
      setDropTargetInfo({ id: targetItem.id, position, type: targetItem.nodeType });
    }
  };
  
  const handleItemDragLeave = (event: React.DragEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) { 
      setDropTargetInfo(null);
    }
  };

  const handleItemDrop = (event: React.DragEvent<HTMLLIElement>, targetItem: ProgramInterfaceDisplayItem) => {
    event.preventDefault();
    if (draggingItemInfo && dropTargetInfo &&
        draggingItemInfo.id !== targetItem.id &&
        draggingItemInfo.type === targetItem.nodeType && // Ensure drop is within the same type section
        dropTargetInfo.id === targetItem.id) {
      onReorderLogicalInterface(draggingItemInfo.id, targetItem.id, dropTargetInfo.position, draggingItemInfo.type);
    }
    setDraggingItemInfo(null);
    setDropTargetInfo(null);
  };
  
  const handleItemDragEnd = () => {
    setDraggingItemInfo(null);
    setDropTargetInfo(null);
  };


  const renderInterfaceItem = (item: ProgramInterfaceDisplayItem) => {
    const IconComponent = item.nodeType === 'input' ? ArrowDownTrayIcon : ArrowUpTrayIcon;
    const dataTypeDisplay = item.dataType.charAt(0).toUpperCase() + item.dataType.slice(1);
    const itemTitle = `${item.name} (${dataTypeDisplay})${item.isRequired ? ' - 必需' : ''}. 点击查看属性${item.isLogical ? "。可拖拽排序或拖拽到画布" : "。可拖拽到画布"}`;
    const isExpanded = expandedItemId === item.id;
    const { bgClass, textClass } = getTypeSpecificBadgeStyles(item.dataType);
    const isBeingDragged = draggingItemInfo?.id === item.id;
    
    let dropIndicatorClass = '';
    if (dropTargetInfo?.id === item.id && dropTargetInfo.type === item.nodeType) { 
      dropIndicatorClass = dropTargetInfo.position === 'before'
        ? `border-t-2 ${panelTheme.categoryDropIndicatorBorder}`
        : `border-b-2 ${panelTheme.categoryDropIndicatorBorder}`;
    }
    
    return (
      <li key={item.id}
          className={`rounded-md relative ${isExpanded ? panelTheme.categoryGroupBg : ''} ${isBeingDragged ? 'opacity-50' : ''} ${dropIndicatorClass}`}
          onContextMenu={(e) => handleContextMenu(e, item)}
          draggable={true} 
          onDragStart={(e) => handleItemDragStartInternal(e, item)}
          onDragOver={(e) => handleItemDragOver(e, item)}
          onDragLeave={(e) => handleItemDragLeave(e)}
          onDrop={(e) => handleItemDrop(e, item)}
          onDragEnd={handleItemDragEnd}
      >
        <div
          className={`w-full flex items-center text-left p-2 rounded-md transition-colors duration-150
                      ${panelTheme.nodeItemBg} ${panelTheme.nodeItemText}
                      hover:${panelTheme.nodeItemBgHover} hover:${panelTheme.nodeItemTextHover}
                      cursor-grab 
                    `}
          title={itemTitle}
          onClick={() => toggleExpand(item.id)}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={`properties-${item.id}`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
            className="mr-1.5 p-0.5 rounded hover:bg-zinc-600"
            aria-label={isExpanded ? `收起 ${item.name} 属性` : `展开 ${item.name} 属性`}
          >
            {isExpanded ? (
              <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
            ) : (
              <ChevronRightIcon className={`w-3.5 h-3.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
            )}
          </button>
          <IconComponent className={`w-4 h-4 mr-1.5 shrink-0 ${panelTheme.nodeItemIcon}`} />
          <span className="flex-grow truncate text-sm select-none">{item.name}</span>
          
          {item.isRequired && (
             <DiamondIcon
                className={`w-3 h-3 shrink-0 ${panelTheme.nodeItemIcon} text-sky-400 mr-1`}
                data-testid={`required-indicator-${item.id}`}
             />
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${bgClass} ${textClass} opacity-90`}>
            {dataTypeDisplay}
          </span>
        </div>
        {isExpanded && (
          <div id={`properties-${item.id}`}>
            <ProgramInterfaceItemProperties
              interfaceItem={item}
              onUpdateName={handleUpdateNameInPanel}
              onUpdateInterfaceDetails={handleUpdateInterfaceDetailsInPanel}
            />
          </div>
        )}
      </li>
    );
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItemId(prevId => (prevId === itemId ? null : itemId));
  };

  if (activeTab?.type !== 'subworkflow') {
    return (
      <div className={`w-64 ${panelTheme.bg} p-3 border-r ${panelTheme.border} flex flex-col items-center justify-center text-center`}>
        <p className={`text-sm ${panelTheme.emptyPanelText}`}>
          程序接口面板仅在编辑子程序时可用。
        </p>
      </div>
    );
  }

  return (
    <div className={`w-64 ${panelTheme.bg} p-3 border-r ${panelTheme.border} overflow-y-auto shrink-0 select-none space-y-3`}>
      <h2 className={`text-lg font-semibold ${panelTheme.headerText} mb-2 px-1`}>程序接口</h2>

      <div className={`${panelTheme.categoryGroupBg} p-1 rounded-md`}>
        <div className={`flex items-center justify-between p-2 rounded ${panelTheme.categoryBgActive}`}>
          <div className="flex items-center cursor-default">
            <ChevronDownIcon className={`w-4 h-4 mr-2 ${vscodeDarkTheme.icons.chevron} shrink-0`} />
            <h3 className={`text-sm font-medium ${panelTheme.categoryHeaderText} uppercase tracking-wider select-none truncate`}>
              输入接口 ({displayedInputInterfaces.length})
            </h3>
          </div>
          <button
            onClick={() => handleAddLogicalInterface('input')}
            className={`p-1 rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${vscodeDarkTheme.icons.nodeListPlus} transition-colors`}
            title="添加逻辑输入接口"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        {displayedInputInterfaces.length > 0 ? (
          <ul className="space-y-0.5 ml-2 pl-2 pt-1 pb-1">
            {displayedInputInterfaces.map(renderInterfaceItem)}
          </ul>
        ) : (
          <p className={`text-xs ${panelTheme.emptyCategoryText} italic p-2 ml-2 pl-2`}>此子程序没有输入接口。</p>
        )}
      </div>

      <div className={`${panelTheme.categoryGroupBg} p-1 rounded-md`}>
        <div className={`flex items-center justify-between p-2 rounded ${panelTheme.categoryBgActive}`}>
          <div className="flex items-center cursor-default">
            <ChevronDownIcon className={`w-4 h-4 mr-2 ${vscodeDarkTheme.icons.chevron} shrink-0`} />
            <h3 className={`text-sm font-medium ${panelTheme.categoryHeaderText} uppercase tracking-wider select-none truncate`}>
              输出接口 ({displayedOutputInterfaces.length})
            </h3>
          </div>
          <button
            onClick={() => handleAddLogicalInterface('output')}
             className={`p-1 rounded-md ${buttonTheme.buttonDefaultBg} hover:${buttonTheme.buttonDefaultBgHover} ${vscodeDarkTheme.icons.nodeListPlus} transition-colors`}
            title="添加逻辑输出接口"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        {displayedOutputInterfaces.length > 0 ? (
          <ul className="space-y-0.5 ml-2 pl-2 pt-1 pb-1">
            {displayedOutputInterfaces.map(renderInterfaceItem)}
          </ul>
        ) : (
          <p className={`text-xs ${panelTheme.emptyCategoryText} italic p-2 ml-2 pl-2`}>此子程序没有输出接口。</p>
        )}
      </div>
      <ProgramInterfaceContextMenu menuConfig={piMenuConfig} onClose={closeProgramInterfaceContextMenu} />
    </div>
  );
};