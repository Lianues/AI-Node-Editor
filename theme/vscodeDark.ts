import { PortDataType } from '../types'; // Ensure PortDataType is imported if not already

export const vscodeDarkTheme = {
  app: {
    bodyBg: 'bg-zinc-900',
    textPrimary: 'text-slate-200',
    scrollbarTrack: '#27272a', // zinc-800
    scrollbarThumb: '#52525b', // zinc-600
    scrollbarThumbHover: '#71717a', // zinc-500
  },
  sidebar: {
    bg: 'bg-zinc-800',
    itemText: 'text-zinc-400',
    itemTextHover: 'text-zinc-100',
    itemBgActive: 'bg-zinc-700',
    itemTextActive: 'text-sky-400',
    itemBgHover: 'bg-zinc-700',
  },
  topBar: {
    bg: 'bg-zinc-800',
    border: 'border-zinc-700',
    logoText: 'text-sky-500',
    menuItemText: 'text-zinc-300',
    menuItemTextHover: 'text-sky-400',
    buttonDefaultBg: 'bg-zinc-700',
    buttonDefaultBgHover: 'bg-zinc-600',
    buttonDefaultText: 'text-zinc-200',
    buttonPrimaryBg: 'bg-sky-600',
    buttonPrimaryBgHover: 'bg-sky-500',
    buttonPrimaryText: 'text-white',
    dropdownMenu: { // Styles for the Edit dropdown menu
      bg: 'bg-zinc-800', // Similar to context menu
      border: 'border-zinc-700',
      shadow: 'shadow-xl',
      itemText: 'text-zinc-200',
      itemBgHover: 'bg-zinc-700',
      itemTextHover: 'text-zinc-100',
      itemDisabledText: 'text-zinc-500',
      separator: 'border-t border-zinc-700',
    }
  },
  tabBar: {
    bg: 'bg-zinc-800',
    border: 'border-zinc-700', // Border below the tab bar
    tabBgActive: 'bg-zinc-900', // Background for the active tab (same as canvas)
    tabTextActive: 'text-sky-400',
    tabBorderActiveHighlight: 'border-t-sky-500', // Highlight border on top of active tab
    tabBorderGeneric: 'border-zinc-700', // Side borders for tabs
    tabBgInactive: 'bg-zinc-800', // Background for inactive tabs
    tabTextInactive: 'text-zinc-400',
    tabBgInactiveHover: 'bg-zinc-700',
    tabTextInactiveHover: 'text-zinc-200',
    tabUnsavedChangesIndicator: 'text-sky-500', // Color for the '*'
    tabCloseIcon: 'text-zinc-500',
    tabCloseIconHover: 'text-zinc-300',
    tabCloseIconActive: 'text-sky-400', // Close icon color on active tab
    tabCloseIconActiveHover: 'hover:bg-zinc-600', // Background hover for close icon on active tab
    tabCloseIconInactiveHover: 'hover:bg-zinc-600', // Background hover for close icon on inactive tab
    addTabIcon: 'text-zinc-400',
    addTabIconHover: 'text-zinc-200',
    addTabBgHover: 'bg-zinc-700',
  },
  canvas: {
    bg: 'bg-zinc-900',
    gridDotColorHex: '#3f3f46', 
    placeholderBg: 'bg-zinc-800',
    placeholderBgOpacity: 'bg-opacity-80',
    placeholderText: 'text-zinc-500',
    placeholderShadow: 'shadow',
    placeholderRounded: 'rounded-lg',
  },
  nodeListPanel: { // Also used by ProjectFilesPanel for some base styles
    bg: 'bg-zinc-800', 
    border: 'border-zinc-700',
    headerText: 'text-zinc-200',
    
    categoryGroupBg: 'bg-zinc-700', 
    categoryHeaderText: 'text-zinc-300',
    categoryIcon: 'text-zinc-400',
    categoryBgHover: 'bg-zinc-600',    
    categoryBgActive: 'bg-zinc-600',   
    categoryDropIndicatorBorder: 'border-sky-500',
    
    nodeItemBg: 'bg-zinc-600',          
    nodeItemBgHover: 'bg-zinc-500',     
    nodeItemText: 'text-zinc-300',
    nodeItemTextHover: 'text-zinc-100',
    nodeItemIcon: 'text-zinc-400',

    nodeItemSelectedForPlacementBg: 'bg-sky-600', 
    nodeItemSelectedForPlacementText: 'text-sky-50', 
    
    nodeItemDragOpacity: 'opacity-30',
    nodeItemDragScale: 'scale-95',
    nodeItemDragCursor: 'cursor-grabbing', // Tailwind class, used in className
    nodeItemCursor: 'cursor-grab',         // Tailwind class, used in className
    nodeItemDropIndicatorBorder: 'border-teal-400',
    nodeItemDropIndicatorRoundedT: 'rounded-t-sm',
    nodeItemDropIndicatorRoundedB: 'rounded-b-sm',
    
    emptyCategoryText: 'text-zinc-500', // Used by FileSystemEntry for empty folder
    emptyPanelText: 'text-zinc-400',
    
    categoryDragOpacity: 'opacity-50',
    categoryDefaultCursor: 'grab',      // CSS value, used in inline style
    categoryDraggingCursor: 'grabbing', // CSS value, used in inline style

    // Specific to ProjectFilesPanel item highlights
    itemBgCopyHighlight: 'bg-sky-700 bg-opacity-20', 
    itemTextCopyHighlight: 'text-sky-300',
    itemBgCutHighlight: 'bg-orange-600 bg-opacity-15',
    itemTextCutHighlight: 'text-orange-400 opacity-70',

    // Styles for inline input in FileSystemEntry (rename)
    inlineInputBg: 'bg-zinc-900', // Darker than item, similar to canvas
    inlineInputText: 'text-slate-100',
    inlineInputBorder: 'border-sky-500', // Highlight border when editing
    inlineInputFocusRing: 'focus:ring-1 focus:ring-sky-500',
    inlineInputErrorBorder: 'border-red-500 ring-1 ring-red-500', // For duplicate/invalid name
    inlineInputErrorMessageText: 'text-red-400 text-xs', // For duplicate/invalid name message
  },
  propertyInspector: {
    bg: 'bg-zinc-800',
    border: 'border-zinc-700',
    headerText: 'text-zinc-200',
    labelText: 'text-zinc-400',
    valueText: 'text-zinc-200',
    valueTextMuted: 'text-zinc-300',
    infoText: 'text-zinc-400',
    warningText: 'text-orange-400',
  },
  nodes: { 
    common: {
      borderUnselected: 'border-zinc-700',
      borderSelected: 'border-sky-400', 
      borderWarning: 'border-amber-400', // New warning border color
      baseNodeShadow: 'shadow-lg',      
      shadowSelected: 'shadow-none', 
      shadowSelectedColor: '', 
      hoverShadow: 'hover:shadow-xl',      
      
      textHeader: 'text-slate-100',
      fallbackHeaderBg: 'bg-neutral-700',
      fallbackBodyBg: 'bg-neutral-800',
      
      draggingScale: '', 
      draggingShadow: '', 
      draggingCursor: 'grabbing', // CSS value, used in inline style in Canvas.tsx
      defaultCursor: 'grab',     // CSS value, used in inline style in Canvas.tsx
    }
  },
  ports: {
    label: 'text-zinc-400',
    portBaseBorder: 'border-gray-700', 
    validTargetHighlightBorder: 'border-green-500', 
    invalidTargetForbiddenBorder: 'border-red-500',   
    selectedConnectionEndpointBorder: 'border-sky-300', 
    generalDragTargetHighlightBorder: 'border-blue-400', 
    primaryQueuedRing: 'ring-cyan-400', 
    secondaryQueuedRing: 'ring-cyan-700', 
    downstreamErrorReflectedRing: 'ring-red-600', 
    downstreamWaitingReflectedRing: 'ring-orange-500', 
    downstreamSatisfiedWaitingReflectedRingPrimary: 'ring-green-400', // New: For rank 1 green reflection
    downstreamSatisfiedWaitingReflectedRingSecondary: 'ring-green-600', // New: For rank > 1 green reflection
    dataTypeColors: {
      [PortDataType.STRING]: { 
        input:  { bg: 'bg-emerald-500', border: 'border-emerald-700', hoverBg: 'hover:bg-emerald-400', strokeHex: '#10b981' },
        output: { bg: 'bg-emerald-500', border: 'border-emerald-700', hoverBg: 'hover:bg-emerald-400', strokeHex: '#10b981' },
      },
      [PortDataType.FLOW]: { 
        input:  { bg: 'bg-slate-300', border: 'border-slate-500', hoverBg: 'hover:bg-slate-200', strokeHex: '#e2e8f0' },
        output: { bg: 'bg-slate-300', border: 'border-slate-500', hoverBg: 'hover:bg-slate-200', strokeHex: '#e2e8f0' },
      },
      [PortDataType.AI_CONFIG]: { 
        input:  { bg: 'bg-slate-400', border: 'border-slate-600', hoverBg: 'hover:bg-slate-300', strokeHex: '#94a3b8' },
        output: { bg: 'bg-slate-400', border: 'border-slate-600', hoverBg: 'hover:bg-slate-300', strokeHex: '#94a3b8' },
      },
      [PortDataType.ANY]: { 
        input:  { bg: 'bg-purple-500', border: 'border-purple-700', hoverBg: 'hover:bg-purple-400', strokeHex: '#a855f7' },
        output: { bg: 'bg-purple-500', border: 'border-purple-700', hoverBg: 'hover:bg-purple-400', strokeHex: '#a855f7' },
      },
      [PortDataType.DATA_COLLECTION]: { 
        input:  { bg: 'bg-amber-500', border: 'border-amber-700', hoverBg: 'hover:bg-amber-400', strokeHex: '#f59e0b' }, // Example: amber color
        output: { bg: 'bg-amber-500', border: 'border-amber-700', hoverBg: 'hover:bg-amber-400', strokeHex: '#f59e0b' },
      },
      [PortDataType.UNKNOWN]: { 
        input:  { bg: 'bg-pink-500', border: 'border-pink-700', hoverBg: 'hover:bg-pink-400', strokeHex: '#ec4899' },
        output: { bg: 'bg-pink-500', border: 'border-pink-700', hoverBg: 'hover:bg-pink-400', strokeHex: '#ec4899' },
      },
    },
  },
  connections: {
    selectedColor: 'rgb(56 189 248)', // sky-400
    selectedStrokeWidthIncrease: 1.5,
  },
  icons: { 
    sidebarDefault: 'text-zinc-400',
    sidebarActive: 'text-sky-400',
    topBarDefaultButtonIcon: '', 
    topBarPrimaryButtonIcon: '', 
    chevron: 'text-zinc-400', 
    nodeListPlus: 'text-zinc-400', 
  },
  contextMenu: { // Also used by ConfirmationModal for some base styles
    bg: 'bg-zinc-800',
    border: 'border-zinc-700',
    shadow: 'shadow-xl',
    itemText: 'text-zinc-200',
    itemBgHover: 'bg-zinc-700',
    itemTextHover: 'text-zinc-100',
    itemDisabledText: 'text-zinc-500',
    separator: 'border-t border-zinc-700', 
  }
};