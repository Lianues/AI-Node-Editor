
export interface Tab {
  id: string;
  title: string;
  unsaved?: boolean;
  type: 'workflow' | 'markdown' | 'nodegroup' | 'subworkflow';
  isPinned?: boolean; 
  fileHandle?: FileSystemFileHandle; // Optional: For local file system integration
}
