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
  onResourceChanged: (callback) => {
    ipcRenderer.on('resource:changed', (event, data) => callback(data))
  },

  // 外部 HTTP 请求打开网页 Tab
  onOpenWebTab: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('open-web-tab', handler)
    return () => ipcRenderer.removeListener('open-web-tab', handler)
  },

  // 外部 HTTP 注入 HTML 卡片到指定会话
  onInjectHtml: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('inject-html', handler)
    return () => ipcRenderer.removeListener('inject-html', handler)
  },
});