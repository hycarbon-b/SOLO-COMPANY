// See https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Discussion file operations
  getDiscussions: () => ipcRenderer.invoke('discussion:list'),
  
  // Resource file operations
  getResourceFiles: () => ipcRenderer.invoke('resource:list'),
  watchResourceFiles: () => ipcRenderer.invoke('resource:watch'),
  unwatchResourceFiles: () => ipcRenderer.invoke('resource:unwatch'),
  readResourceFile: (filePath) => ipcRenderer.invoke('resource:read', filePath),
  onResourceChanged: (callback) => {
    ipcRenderer.on('resource:changed', (event, data) => callback(data))
  },
    removeResourceListener: () => {
      ipcRenderer.removeAllListeners('resource:changed');
    },
  
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // WS日志写入
  wsLog: (prefix, data) => ipcRenderer.invoke('ws-log', { prefix, data }),

  // 外部 HTTP 请求打开网页 Tab
  onOpenWebTab: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('open-web-tab', handler)
    return () => ipcRenderer.removeListener('open-web-tab', handler)
  },
});