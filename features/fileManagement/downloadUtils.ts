import { CanvasSnapshot } from '../../types';

/**
 * Initiates a browser download of the workflow snapshot as a JSON file.
 * @param snapshot The canvas snapshot to download.
 * @param filename The desired filename for the downloaded file (e.g., "workflow.json").
 */
export const downloadWorkflowAsJson = (snapshot: CanvasSnapshot, filename: string): void => {
  try {
    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error preparing or triggering workflow download:", error);
    // Optionally, display an error message to the user
    alert("Error preparing download. See console for details.");
  }
};
