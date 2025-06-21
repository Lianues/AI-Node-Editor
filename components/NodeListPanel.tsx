

import React from 'react';
import { NODE_CATEGORIES as initialNodeCategories } from '../nodes/nodeCategories';
// Removed static import of getNodeDefinition
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { vscodeDarkTheme } from '../theme/vscodeDark';
import { useNodeListPanelBehavior } from './NodeListPanelBehavior';
import { NodeTypeDefinition } from '../types'; 

interface NodeListPanelProps {
  onSelectNodeTypeForPlacement: (nodeTypeKey: string) => void;
  selectedNodeTypeForPlacement: string | null;
  customNodeDefinitions?: NodeTypeDefinition[]; 
  getCombinedNodeDefinition: (type: string) => NodeTypeDefinition | undefined; // New prop
}

export const NodeListPanel: React.FC<NodeListPanelProps> = ({ 
  onSelectNodeTypeForPlacement, 
  selectedNodeTypeForPlacement,
  customNodeDefinitions = [], 
  getCombinedNodeDefinition, // Destructure new prop
}) => {
  const panelTheme = vscodeDarkTheme.nodeListPanel;

  const {
    categories,
    expandedCategories,
    draggingCategoryId,
    dropTargetCategoryInfo,
    draggingNodeInfo,
    dropTargetNodeInfo,
    toggleCategory,
    handleCategoryDragStart,
    handleCategoryDragEnter,
    handleCategoryDragOver,
    handleCategoryDragLeave,
    handleCategoryDrop,
    handleCategoryDragEnd,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleNodeListItemDragOver,
    handleNodeListItemDragLeave,
    handleNodeListItemDrop,
  } = useNodeListPanelBehavior({
    initialNodeCategories,
    onSelectNodeTypeForPlacement,
    selectedNodeTypeForPlacement,
    customNodeDefinitions, 
    getCombinedNodeDefinition, // Pass the combined getter to the hook
  });

  return (
    <div className={`w-64 ${panelTheme.bg} p-3 border-r ${panelTheme.border} overflow-y-auto shrink-0 select-none space-y-2`}>
      <h2 className={`text-lg font-semibold ${panelTheme.headerText} mb-3 px-1`}>节点列表</h2>
      {categories.map(category => {
        const isExpanded = expandedCategories[category.id];
        const isCategoryBeingDragged = draggingCategoryId === category.id;

        let categoryDropIndicatorClass = '';
        if (dropTargetCategoryInfo?.id === category.id && draggingCategoryId && draggingCategoryId !== category.id) {
            if (dropTargetCategoryInfo.position === 'before') {
                categoryDropIndicatorClass = `border-t-2 ${panelTheme.categoryDropIndicatorBorder}`;
            } else {
                categoryDropIndicatorClass = `border-b-2 ${panelTheme.categoryDropIndicatorBorder}`;
            }
        }

        return (
          <div
            key={category.id}
            data-category-id={category.id}
            className={`relative rounded-md p-1 transition-opacity duration-150
              ${panelTheme.categoryGroupBg}
              ${isCategoryBeingDragged ? panelTheme.categoryDragOpacity : 'opacity-100'}
              ${categoryDropIndicatorClass}
            `}
            onDragEnter={(e) => handleCategoryDragEnter(e, category.id)}
            onDragOver={(e) => handleCategoryDragOver(e, category.id)}
            onDragLeave={(e) => handleCategoryDragLeave(e, category.id)}
            onDrop={(e) => handleCategoryDrop(e, category.id)}
          >
            <div
              draggable
              onDragStart={(e) => handleCategoryDragStart(e, category.id)}
              onDragEnd={(e) => handleCategoryDragEnd(e)}
              onClick={() => toggleCategory(category.id)}
              className={`flex items-center p-2 rounded cursor-pointer hover:${panelTheme.categoryBgHover}
                ${isExpanded ? panelTheme.categoryBgActive : ''}
              `}
              title={isExpanded ? `收起 ${category.label}` : `展开 ${category.label}`}
              role="button"
              aria-expanded={isExpanded}
              aria-controls={`category-nodes-${category.id}`}
              style={{ cursor: draggingCategoryId ? panelTheme.categoryDraggingCursor : (draggingNodeInfo && draggingNodeInfo.originalCategoryId === category.id ? 'default' : panelTheme.categoryDefaultCursor) }}
            >
              {isExpanded
                ? <ChevronDownIcon className={`w-4 h-4 mr-2 ${vscodeDarkTheme.icons.chevron} shrink-0`} />
                : <ChevronRightIcon className={`w-4 h-4 mr-2 ${vscodeDarkTheme.icons.chevron} shrink-0`} />}
              <h3 className={`text-sm font-medium ${panelTheme.categoryHeaderText} uppercase tracking-wider select-none truncate`}>
                {category.label}
              </h3>
            </div>
            {isExpanded && (
              <ul
                id={`category-nodes-${category.id}`}
                className={`space-y-0.5 ml-6 pl-4 border-l border-zinc-600 pt-2 pb-1`}
              >
                {category.nodeTypeKeys.map(nodeTypeKey => {
                  const nodeDef = getCombinedNodeDefinition(nodeTypeKey); // Use the prop here
                  if (!nodeDef) {
                    console.warn(`[NodeListPanel] Node definition not found for type: ${nodeTypeKey}`);
                    return null;
                  }
                  const isNodeBeingDragged = draggingNodeInfo?.typeKey === nodeDef.type && draggingNodeInfo?.originalCategoryId === category.id;
                  const isNodeDropTargetVisual = dropTargetNodeInfo?.categoryId === category.id && dropTargetNodeInfo?.nodeTypeKey === nodeDef.type;
                  const isNodeTypeSelectedForPlacement = selectedNodeTypeForPlacement === nodeDef.type;

                  let nodeDropIndicatorClass = '';
                  if (isNodeDropTargetVisual && draggingNodeInfo) { 
                    nodeDropIndicatorClass = dropTargetNodeInfo.position === 'before'
                      ? `border-t-2 ${panelTheme.nodeItemDropIndicatorBorder} ${panelTheme.nodeItemDropIndicatorRoundedT}`
                      : `border-b-2 ${panelTheme.nodeItemDropIndicatorBorder} ${panelTheme.nodeItemDropIndicatorRoundedB}`;
                  }
                  
                  const titleText = isNodeTypeSelectedForPlacement
                  ? `已选择 ${nodeDef.label}。点击画布空白处放置此节点。`
                  : `点击选择 ${nodeDef.label} 以通过点选方式放置，或直接拖拽至画布。`;

                  return (
                    <li
                      key={nodeDef.type + "_" + category.id} 
                      className={`relative transition-all duration-100 py-0.5 ${nodeDropIndicatorClass}`}
                      onDragOver={(e) => handleNodeListItemDragOver(e, category.id, nodeDef.type)}
                      onDragLeave={(e) => handleNodeListItemDragLeave(e)}
                      onDrop={(e) => handleNodeListItemDrop(e, category.id, nodeDef.type)}
                    >
                      <div
                        draggable={!draggingCategoryId} 
                        onDragStart={(event) => handleNodeDragStart(event, nodeDef.type, category.id)}
                        onDragEnd={handleNodeDragEnd}
                        onClick={() => onSelectNodeTypeForPlacement(nodeDef.type)}
                        className={`w-full flex items-center text-left p-2 rounded-md transition-all duration-150
                                    ${isNodeBeingDragged
                                      ? `${panelTheme.nodeItemDragOpacity} ${panelTheme.nodeItemDragScale} ${panelTheme.nodeItemDragCursor}`
                                      : (isNodeTypeSelectedForPlacement
                                          ? `${panelTheme.nodeItemSelectedForPlacementBg} ${panelTheme.nodeItemSelectedForPlacementText}`
                                          : `${panelTheme.nodeItemBg} hover:${panelTheme.nodeItemBgHover} ${panelTheme.nodeItemText} hover:${panelTheme.nodeItemTextHover} ${panelTheme.nodeItemCursor}`)
                                    }
                                  `}
                        title={titleText}
                        role="button"
                        aria-pressed={isNodeTypeSelectedForPlacement}
                      >
                        <span className="truncate text-sm select-none">{nodeDef.label}</span>
                      </div>
                    </li>
                  );
                })}
                {category.nodeTypeKeys.length === 0 && (
                  <p className={`text-xs ${panelTheme.emptyCategoryText} italic p-2`}>该分类下暂无节点。</p>
                )}
              </ul>
            )}
          </div>
        );
      })}
      {categories.length === 0 && (
        <p className={`text-sm ${panelTheme.emptyPanelText} px-1`}>没有可用的节点分类。</p>
      )}
    </div>
  );
};