
import { FileSystemItem } from './fileSystemTypes'; // Removed FileSystemFileHandle, FileSystemDirectoryHandle

export type ProjectFilesClipboardOperation = 'copy' | 'cut';

// Define a type for the serializable metadata of FileSystemItem
export type FileSystemItemMetadata = Pick<FileSystemItem, 'id' | 'name' | 'path' | 'type'>;

export interface ProjectFileClipboardItem {
  itemMetadata: FileSystemItemMetadata; // Store only serializable parts here
  itemHandle?: FileSystemFileHandle | FileSystemDirectoryHandle; // Store the actual handle for local FS operations
  operation: ProjectFilesClipboardOperation;
}
