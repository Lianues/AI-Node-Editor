// utils/colorUtils.ts

// This map should be updated if new default header colors are added to NodeTypeDefinitions
const tailwindBgToHexMap: Record<string, string> = {
  'bg-sky-700': '#0369a1',       // StartNode
  'bg-purple-600': '#9333ea',    // AiTextGenerationNode
  'bg-teal-600': '#0d9488',      // UserInputNode
  'bg-indigo-600': '#4f46e5',    // DataViewerNode
  'bg-blue-600': '#2563eb',      // DocumentNode
  'bg-pink-700': '#be185d',      // SubworkflowOutputNode
  'bg-green-700': '#15803d',     // SubworkflowInstanceNode
  // Add other NodeTypeDefinition.headerColor values here
  'bg-neutral-700': '#404040',   // Default fallback from theme
  // Fallback for any other unknown classes
};

const tailwindTextToHexMap: Record<string, string> = {
  'text-slate-100': '#f1f5f9', // Default main title color
  'text-slate-400': '#94a3b8', // Default subtitle color
  // Add other common text colors if needed
};

const GENERIC_DEFAULT_HEX_BG = '#334155'; // A generic dark slate for backgrounds
const GENERIC_DEFAULT_HEX_TEXT = '#CBD5E1'; // A generic light slate for text

/**
 * Converts a known Tailwind background class to its hex color.
 * @param tailwindClass The Tailwind class string (e.g., 'bg-sky-700').
 * @returns The hex color string, or a generic default if the class is not mapped or undefined.
 */
export const getDefaultHexColorFromTailwind = (tailwindClass: string | undefined): string => {
  if (!tailwindClass) {
    return GENERIC_DEFAULT_HEX_BG;
  }
  return tailwindBgToHexMap[tailwindClass] || GENERIC_DEFAULT_HEX_BG;
};

/**
 * Converts a known Tailwind text color class to its hex color.
 * @param tailwindClass The Tailwind class string (e.g., 'text-slate-100').
 * @returns The hex color string, or a generic default if the class is not mapped or undefined.
 */
export const getDefaultHexColorFromTailwindText = (tailwindClass: string | undefined): string => {
  if (!tailwindClass) {
    return GENERIC_DEFAULT_HEX_TEXT;
  }
  return tailwindTextToHexMap[tailwindClass] || GENERIC_DEFAULT_HEX_TEXT;
};
