import { CanvasSnapshot } from '../../types';

/**
 * Validates if the parsed data has the basic structure of a CanvasSnapshot.
 * @param data The parsed JSON data.
 * @returns True if the data appears to be a CanvasSnapshot, false otherwise.
 */
export const isValidCanvasSnapshot = (data: any): data is CanvasSnapshot => { // Export this function
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.connections) &&
    typeof data.pan === 'object' && data.pan !== null && 'x' in data.pan && 'y' in data.pan &&
    typeof data.scale === 'number' &&
    Array.isArray(data.nodeExecutionStates) &&
    true 
  );
};


/**
 * Opens a file dialog, reads the selected JSON file, parses it,
 * and validates if it's a CanvasSnapshot.
 * @returns A Promise that resolves with an object containing the CanvasSnapshot, the filename, and the raw file content,
 *          or rejects with an error message.
 */
export const handleFileUpload = (): Promise<{ snapshot: CanvasSnapshot; filename: string; rawContent: string }> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        return reject('No file selected.');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rawContent = e.target?.result as string;
          if (!rawContent) {
            return reject('File content is empty or could not be read.');
          }
          const parsedData = JSON.parse(rawContent);

          if (!isValidCanvasSnapshot(parsedData)) {
            return reject('Invalid file format. The file does not appear to be a valid workflow snapshot.');
          }
          resolve({ snapshot: parsedData, filename: file.name, rawContent });
        } catch (error) {
          console.error('Error parsing JSON file:', error);
          if (error instanceof SyntaxError) {
            return reject(`Error parsing JSON file: ${error.message}. Please ensure the file is a valid JSON.`);
          }
          return reject('Could not parse the file. Ensure it is a valid JSON workflow file.');
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        return reject('Error reading file.');
      };

      reader.readAsText(file);
    };

    input.click();
  });
};