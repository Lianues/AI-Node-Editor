// globals.d.ts

interface AiStudioBridge {
  sendOutput: (nodeId: string, portId: string, data: any) => void;
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>; // Added showSaveFilePicker
  aiStudioBridge?: AiStudioBridge; // Make it optional for safety
}

// The following types are typically provided by TypeScript's DOM library (lib.dom.d.ts or similar).
// If you encounter errors that these types are not found, ensure your tsconfig.json "lib" option
// includes "DOM" and potentially "ESNext" or a specific ES version that includes these APIs.

// Keeping DirectoryPickerOptions and WellKnownDirectory as they are directly used by the Window augmentation
// and might have specific definitions or be less consistently available in all lib configurations.
// If these also cause conflicts or are definitely in your project's default libs, they could be removed too.

interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: FileSystemHandle | WellKnownDirectory; // FileSystemHandle will be resolved from TS libs
}

type WellKnownDirectory = "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";

// Added SaveFilePickerOptions based on common usage, can be expanded if needed
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept?: Record<string, string | string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
}


// FileSystemHandle, FileSystemFileHandle, FileSystemDirectoryHandle,
// FileSystemHandlePermissionDescriptor, FileSystemCreateWritableOptions,
// FileSystemGetDirectoryOptions, FileSystemGetFileOptions, FileSystemRemoveOptions,
// and FileSystemWritableFileStream are expected to be provided by the TypeScript standard libraries.
// Declaring them here can lead to conflicts like "duplicate identifier" or "all declarations of 'X' must have identical modifiers".