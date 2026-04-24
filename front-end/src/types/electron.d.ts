import type { DiscussionThread } from './discussion'

export interface ElectronAPI {
  getDiscussions: () => Promise<{
    success: boolean
    discussions?: DiscussionThread[]
    error?: string
  }>
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
