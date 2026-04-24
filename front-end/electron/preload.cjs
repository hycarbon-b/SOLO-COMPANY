// See https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Discussion file operations
  getDiscussions: () => ipcRenderer.invoke('discussion:list'),
  
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
    // WS日志写入
    wsLog: (prefix, data) => ipcRenderer.invoke('ws-log', { prefix, data }),
})