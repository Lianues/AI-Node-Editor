
export interface FileItem {
  id: string;
  name: string;
  type: 'file';
  path: string; // Relative path from the project root
  handle?: FileSystemFileHandle; // Handle for the actual file
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  path: string; // Relative path from the project root
  children: FileSystemItem[];
  isOpen?: boolean;
  childrenLoaded?: boolean;
  isLoading?: boolean;
  handle?: FileSystemDirectoryHandle; // Handle for the actual directory
}

export type FileSystemItem = FileItem | FolderItem;
