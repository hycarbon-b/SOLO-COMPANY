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

  // WS frame capture per-conversation persistence
  wsCaptureAppend?: (record: {
    ts?: number
    dir: 'SEND' | 'RECV'
    sessionKey?: string
    taskId?: string
    data: unknown
  }) => Promise<{ ok: boolean; error?: string }>;
  wsCaptureList?: () => Promise<{
    ok: boolean
    dir?: string
    files?: { name: string; sessionKey: string; size: number; mtime: number }[]
    error?: string
  }>;
  wsCaptureRead?: (sessionKey: string) => Promise<{
    ok: boolean
    file?: string
    lines?: any[]
    error?: string
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
