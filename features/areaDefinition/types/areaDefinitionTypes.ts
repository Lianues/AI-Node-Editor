
// Represents a rectangle in screen coordinates
export interface DefiningAreaScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Represents a persistent defined area on the canvas
export interface DefinedArea {
  id: string;
  x: number; // world coordinates
  y: number; // world coordinates
  width: number; // world dimensions
  height: number; // world dimensions
  title: string; // Now non-optional
  color: string; // e.g., Tailwind class or hex
  opacity: number; // e.g., 0.3 for 30%
  zIndex?: number; // Optional z-index
  textScaleFactor?: number; // New: Multiplier for default text size
  textColor?: string; // New: Hex color for title text
  textOpacity?: number; // New: Opacity for title text (0.0 to 1.0)
  borderColor?: string; // New: Hex color for border
  borderOpacity?: number; // New: Opacity for border (0.0 to 1.0)
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'dash-dot'; // New: Border style
  borderWidth?: number; // New: Border width in pixels
  textIsBold?: boolean; // New: Title text bold
  textIsItalic?: boolean; // New: Title text italic
  textIsStrikethrough?: boolean; // New: Title text strikethrough
  textStrikethroughWidth?: number; // New: Strikethrough line width in px
  textIsHighlighted?: boolean; // New: Title text highlight
  textHighlightColor?: string; // New: Hex color for title text highlight
  textHighlightOpacity?: number; // New: Opacity for text highlight (0.0 - 1.0)
}


// Props for the useAreaDefinitionDrawing hook
export interface UseAreaDefinitionDrawingProps {
  isCurrentlyActive: boolean;
  canvasRef: React.RefObject<HTMLDivElement>;
  onAreaDefined: (rect: DefiningAreaScreenRect) => void; // Callback with screen rect
  onDeactivate: () => void;
}

// Return type for the useAreaDefinitionDrawing hook
export interface AreaDefinitionDrawingHookApi {
  definingAreaRect: DefiningAreaScreenRect | null;
  handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  isDrawing: () => boolean; // To check if a drag is in progress
  cancelCurrentDrawing: () => void; // To cancel an ongoing drag
}

// Props for the DefiningAreaRectangle component (temporary feedback)
export interface DefiningAreaRectangleProps {
  rect: DefiningAreaScreenRect | null;
}

// Props for the DefinedAreaRenderer component (persistent area)
export interface DefinedAreaRendererProps {
  area: DefinedArea;
  isSelected?: boolean; // New: To indicate if the area is selected for inspection
}

// Props for the DefinedAreaInspector component
export interface SpecificDefinedAreaInspectorProps {
  area: DefinedArea;
  updateDefinedArea: (areaId: string, updates: Partial<Omit<DefinedArea, 'id'>>) => void;
}