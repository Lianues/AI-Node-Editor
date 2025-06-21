
import { useState, useCallback } from 'react';
import { DefinedArea } from '../types/areaDefinitionTypes';
import { vscodeDarkTheme } from '../../../theme/vscodeDark'; // For default colors

// Default properties for new areas
const DEFAULT_AREA_COLOR = '#2563eb'; // Blue-600 hex
const DEFAULT_AREA_OPACITY = 0.3;     
const DEFAULT_AREA_TITLE_PREFIX = "区域"; 
const DEFAULT_TEXT_SCALE_FACTOR = 1.0;
const DEFAULT_TEXT_COLOR = '#FFFFFF'; 
const DEFAULT_TEXT_OPACITY = 1.0;
const DEFAULT_BORDER_COLOR = '#888888'; // Neutral gray
const DEFAULT_BORDER_OPACITY = 1.0;
const DEFAULT_BORDER_STYLE = 'solid' as 'solid' | 'dashed' | 'dotted' | 'dash-dot';
const DEFAULT_BORDER_WIDTH = 1;
const DEFAULT_TEXT_IS_BOLD = false;
const DEFAULT_TEXT_IS_ITALIC = false;
const DEFAULT_TEXT_IS_STRIKETHROUGH = false;
const DEFAULT_TEXT_STRIKETHROUGH_WIDTH = 1; // Default 1px
const DEFAULT_TEXT_IS_HIGHLIGHTED = false;
const DEFAULT_TEXT_HIGHLIGHT_COLOR = '#ffff00'; // Yellow
const DEFAULT_TEXT_HIGHLIGHT_OPACITY = 0.5; // Default 50% opacity


export interface UseDefinedAreaManagerOutput {
  definedAreas: DefinedArea[];
  addDefinedArea: (worldRect: { x: number; y: number; width: number; height: number; }, titleInput?: string) => DefinedArea; 
  updateDefinedArea: (areaId: string, updates: Partial<Omit<DefinedArea, 'id'>>) => void; 
  deleteDefinedArea: (areaId: string) => void;
  setDefinedAreasDirectly: (areas: DefinedArea[]) => void;
  clearAllDefinedAreas: () => void;
  bringAreaToTop: (areaId: string) => void; // New
}

export const useDefinedAreaManager = (): UseDefinedAreaManagerOutput => {
  const [definedAreas, setDefinedAreas] = useState<DefinedArea[]>([]);

  const addDefinedArea = useCallback((
    worldRect: { x: number; y: number; width: number; height: number; },
    titleInput?: string 
  ): DefinedArea => {
    const newArea: DefinedArea = {
      id: `defined_area_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: worldRect.x,
      y: worldRect.y,
      width: worldRect.width,
      height: worldRect.height,
      title: titleInput || `${DEFAULT_AREA_TITLE_PREFIX} ${definedAreas.length + 1}`,
      color: DEFAULT_AREA_COLOR, 
      opacity: DEFAULT_AREA_OPACITY,   
      zIndex: -1, 
      textScaleFactor: DEFAULT_TEXT_SCALE_FACTOR,
      textColor: DEFAULT_TEXT_COLOR, 
      textOpacity: DEFAULT_TEXT_OPACITY, 
      borderColor: DEFAULT_BORDER_COLOR,
      borderOpacity: DEFAULT_BORDER_OPACITY,
      borderStyle: DEFAULT_BORDER_STYLE,
      borderWidth: DEFAULT_BORDER_WIDTH,
      textIsBold: DEFAULT_TEXT_IS_BOLD,
      textIsItalic: DEFAULT_TEXT_IS_ITALIC,
      textIsStrikethrough: DEFAULT_TEXT_IS_STRIKETHROUGH,
      textStrikethroughWidth: DEFAULT_TEXT_STRIKETHROUGH_WIDTH,
      textIsHighlighted: DEFAULT_TEXT_IS_HIGHLIGHTED,
      textHighlightColor: DEFAULT_TEXT_HIGHLIGHT_COLOR,
      textHighlightOpacity: DEFAULT_TEXT_HIGHLIGHT_OPACITY,
    };
    setDefinedAreas(prevAreas => [...prevAreas, newArea]);
    return newArea;
  }, [definedAreas.length]);

  const updateDefinedArea = useCallback((areaId: string, updates: Partial<Omit<DefinedArea, 'id'>>) => {
    setDefinedAreas(prevAreas =>
      prevAreas.map(area =>
        area.id === areaId ? { ...area, ...updates } : area
      )
    );
  }, []);

  const deleteDefinedArea = useCallback((areaId: string) => {
    setDefinedAreas(prevAreas => prevAreas.filter(area => area.id !== areaId));
  }, []);

  const setDefinedAreasDirectly = useCallback((areas: DefinedArea[]) => {
    setDefinedAreas(areas.map((area, index) => ({ 
      ...area,
      title: area.title || `${DEFAULT_AREA_TITLE_PREFIX} ${index + 1}`,
      color: area.color || DEFAULT_AREA_COLOR,
      opacity: area.opacity === undefined ? DEFAULT_AREA_OPACITY : area.opacity,
      zIndex: area.zIndex === undefined ? -1 : area.zIndex,
      textScaleFactor: area.textScaleFactor === undefined ? DEFAULT_TEXT_SCALE_FACTOR : area.textScaleFactor,
      textColor: area.textColor || DEFAULT_TEXT_COLOR, 
      textOpacity: area.textOpacity === undefined ? DEFAULT_TEXT_OPACITY : area.textOpacity, 
      borderColor: area.borderColor || DEFAULT_BORDER_COLOR,
      borderOpacity: area.borderOpacity === undefined ? DEFAULT_BORDER_OPACITY : area.borderOpacity,
      borderStyle: area.borderStyle || DEFAULT_BORDER_STYLE,
      borderWidth: area.borderWidth === undefined ? DEFAULT_BORDER_WIDTH : area.borderWidth,
      textIsBold: area.textIsBold === undefined ? DEFAULT_TEXT_IS_BOLD : area.textIsBold,
      textIsItalic: area.textIsItalic === undefined ? DEFAULT_TEXT_IS_ITALIC : area.textIsItalic,
      textIsStrikethrough: area.textIsStrikethrough === undefined ? DEFAULT_TEXT_IS_STRIKETHROUGH : area.textIsStrikethrough,
      textStrikethroughWidth: area.textStrikethroughWidth === undefined ? DEFAULT_TEXT_STRIKETHROUGH_WIDTH : area.textStrikethroughWidth,
      textIsHighlighted: area.textIsHighlighted === undefined ? DEFAULT_TEXT_IS_HIGHLIGHTED : area.textIsHighlighted,
      textHighlightColor: area.textHighlightColor || DEFAULT_TEXT_HIGHLIGHT_COLOR,
      textHighlightOpacity: area.textHighlightOpacity === undefined ? DEFAULT_TEXT_HIGHLIGHT_OPACITY : area.textHighlightOpacity,
    })));
  }, []); 

  const clearAllDefinedAreas = useCallback(() => {
    setDefinedAreas([]);
  }, []);

  const bringAreaToTop = useCallback((areaId: string) => {
    setDefinedAreas(prevAreas => {
      const itemIndex = prevAreas.findIndex(area => area.id === areaId);
      if (itemIndex === -1 || itemIndex === prevAreas.length - 1) {
        return prevAreas; // Not found or already last
      }
      const item = prevAreas[itemIndex];
      const newItems = [
        ...prevAreas.slice(0, itemIndex),
        ...prevAreas.slice(itemIndex + 1),
        item,
      ];
      return newItems;
    });
  }, []);

  return {
    definedAreas,
    addDefinedArea,
    updateDefinedArea, 
    deleteDefinedArea,
    setDefinedAreasDirectly,
    clearAllDefinedAreas,
    bringAreaToTop,
  };
};
