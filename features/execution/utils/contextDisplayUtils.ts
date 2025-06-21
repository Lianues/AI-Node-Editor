// features/execution/utils/contextDisplayUtils.ts

const CONTEXT_ID_COLORS: string[] = [
  'text-cyan-400',
  'text-pink-400',
  'text-lime-400',
  'text-fuchsia-400',
  'text-amber-400',
  'text-violet-400',
  'text-emerald-400',
  'text-rose-400',
];

/**
 * Generates a consistent Tailwind CSS text color class for a given execution context ID.
 * @param contextId The execution context ID.
 * @returns A Tailwind CSS color class string.
 */
export const getContextColor = (contextId: string): string => {
  if (!contextId) {
    return 'text-zinc-400'; // Default color if ID is somehow missing
  }

  // Simple hash function to get a somewhat consistent index from the ID string
  let hash = 0;
  for (let i = 0; i < contextId.length; i++) {
    const char = contextId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % CONTEXT_ID_COLORS.length;
  const selectedColorClass = CONTEXT_ID_COLORS[index];
  
  // console.log(`[ContextDisplayUtils] Context ID ${contextId.slice(-6)} mapped to color ${selectedColorClass}`); // For debugging

  return selectedColorClass;
};