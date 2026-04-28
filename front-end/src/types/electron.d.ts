import type { DiscussionThread } from './discussion'

export interface ResourceFile {
  id: string;
  name: string;
  type: 'document' | 'image' | 'spreadsheet' | 'code';
  size: string;
  date: string;
  path?: string;
}

export interface ElectronAPI {
  getDiscussions: () => Promise<{
    success: boolean
    discussions?: DiscussionThread[]
    error?: string
  }>
  getResourceFiles: () => Promise<{
    success: boolean;
    files: ResourceFile[];
  }>;
  watchResourceFiles: () => Promise<{ success: boolean }>;
  unwatchResourceFiles: () => Promise<{ success: boolean }>;
  onResourceChanged: (callback: (data: { files: ResourceFile[] }) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
