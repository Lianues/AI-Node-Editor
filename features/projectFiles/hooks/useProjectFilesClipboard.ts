
import { useState, useCallback } from 'react';
import { ProjectFileClipboardItem, ProjectFilesClipboardOperation, FileSystemItemMetadata } from '../types/projectFilesClipboardTypes';
import { FileSystemItem } from '../types/fileSystemTypes'; // Removed FileSystemFileHandle, FileSystemDirectoryHandle

export interface UseProjectFilesClipboardOutput {
  clipboardItem: ProjectFileClipboardItem | null;
  copyItemToClipboard: (item: FileSystemItem) => void;
  cutItemToClipboard: (item: FileSystemItem) => void;
  getClipboardItem: () => ProjectFileClipboardItem | null;
  clearClipboard: () => void;
}

export const useProjectFilesClipboard = (): UseProjectFilesClipboardOutput => {
  const [clipboardItem, setClipboardItem] = useState<ProjectFileClipboardItem | null>(null);

  const copyItemToClipboard = useCallback((item: FileSystemItem) => {
    const metadata: FileSystemItemMetadata = {
      id: item.id,
      name: item.name,
      path: item.path,
      type: item.type,
    };
    setClipboardItem({
      itemMetadata: metadata,
      itemHandle: item.handle as FileSystemFileHandle | FileSystemDirectoryHandle | undefined,
      operation: 'copy',
    });
  }, []);

  const cutItemToClipboard = useCallback((item: FileSystemItem) => {
    const metadata: FileSystemItemMetadata = {
      id: item.id,
      name: item.name,
      path: item.path,
      type: item.type,
    };
    setClipboardItem({
      itemMetadata: metadata,
      itemHandle: item.handle as FileSystemFileHandle | FileSystemDirectoryHandle | undefined,
      operation: 'cut',
    });
  }, []);

  const getClipboardItem = useCallback((): ProjectFileClipboardItem | null => {
    return clipboardItem;
  }, [clipboardItem]);

  const clearClipboard = useCallback(() => {
    setClipboardItem(null);
  }, []);

  return {
    clipboardItem,
    copyItemToClipboard,
    cutItemToClipboard,
    getClipboardItem,
    clearClipboard,
  };
};
