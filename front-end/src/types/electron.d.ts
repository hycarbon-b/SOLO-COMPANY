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
  removeResourceListener: () => void;
  platform: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
