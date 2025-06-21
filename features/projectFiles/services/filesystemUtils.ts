// features/projectFiles/services/filesystemUtils.ts

// Simulates a delay for network requests
export const SIMULATED_DELAY = 300;

// Prefix for temporary items pending rename
export const TEMP_ITEM_PLACEHOLDER_PREFIX = "__TEMP_ITEM_PENDING_RENAME__";

/**
 * Generates a unique file name within a list of existing names.
 * If the baseName (with extension) already exists, it appends (1), (2), etc.
 * @param baseName The desired base name (e.g., "Untitled" or "Image").
 * @param extension The file extension (e.g., ".json", ".txt"). For folders, this can be an empty string.
 * @param itemType The type of item ('file' or 'folder').
 * @param existingNamesAndTypes An array of objects, each with a 'name' and 'type' property, representing existing items in the directory.
 * @returns A unique file name string.
 */
export const generateUniqueFileName = (
  baseName: string,
  extension: string,
  itemType: 'file' | 'folder',
  existingNamesAndTypes: { name: string; type: 'file' | 'folder' }[]
): string => {
  let count = 0;
  let currentCleanBase = baseName;
  const normalizedExtension = itemType === 'file' ? extension.toLowerCase() : '';

  // Helper to get a clean base name for comparison, removing existing numeric suffixes and extension
  const getCleanBaseForComparison = (name: string): string => {
    let clean = name;
    if (itemType === 'file' && normalizedExtension && clean.toLowerCase().endsWith(normalizedExtension)) {
      clean = clean.substring(0, clean.length - normalizedExtension.length);
    }
    return clean.replace(/ \(\d+\)$/, '');
  };

  // If the initial baseName already ends with " (number)", extract the true base and start count from there.
  const initialBaseMatch = baseName.match(/^(.*?) \((\d+)\)$/);
  if (initialBaseMatch) {
    currentCleanBase = initialBaseMatch[1];
    // It's tricky to reliably get the next number without checking all existing (n) versions.
    // For simplicity, this will find the *next available* (n) rather than strictly the highest (n)+1.
  }

  let newName = itemType === 'file' ? `${currentCleanBase}${extension}` : currentCleanBase;

  const lowerCaseExistingNamesOfSameType = existingNamesAndTypes
    .filter(entry => entry.type === itemType)
    .map(entry => entry.name.toLowerCase());

  const lowerCaseNewName = () => newName.toLowerCase();

  while (lowerCaseExistingNamesOfSameType.includes(lowerCaseNewName())) {
    count++;
    newName = itemType === 'file'
      ? `${currentCleanBase} (${count})${extension}`
      : `${currentCleanBase} (${count})`;
  }
  return newName;
};
