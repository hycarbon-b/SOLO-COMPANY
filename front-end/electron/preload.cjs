// See https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
const { contextBridge } = require('electron')

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any Electron APIs you want to expose to the renderer here
  // Example:
  // send: (channel, data) => ipcRenderer.send(channel, data),
  // receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
})