const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')

let mainWindow

const log = fs.createWriteStream('electron-debug.log', { flags: 'a' })
function debug(...args) {
  const msg = new Date().toISOString() + ' ' + args.join(' ')
  log.write(msg + '\n')
  console.log(msg)
}

process.on('uncaughtException', (e) => {
  debug('Uncaught exception:', e.message)
  console.error(e)
})

// Check if Vite dev server is running
function checkDevServer() {
  return new Promise((resolve) => {
    debug('Checking Vite at http://localhost:5174...')
    const req = http.get('http://localhost:5174', (res) => {
      debug('Vite is running!')
      resolve(true)
    })
    req.on('error', (e) => {
      debug('Vite check error:', e.message)
      resolve(false)
    })
    req.setTimeout(2000, () => { req.destroy(); debug('Vite timeout'); resolve(false) })
  })
}

async function createWindow() {
  debug('Creating window...')
  const isDev = await checkDevServer()
  debug('isDev:', isDev)

  // Create the browser window.
  debug('Creating BrowserWindow...')
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false, // 延迟显示，等加载完成
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Trading Application',
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })
  debug('BrowserWindow created, isDev=' + isDev)

  if (isDev) {
    debug('Loading from Vite dev server...')
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools()
  } else {
    debug('Loading from file...')
    mainWindow.loadFile(path.join(__dirname, '../dist', 'index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    debug('Failed to load:', code, desc)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// WS 日志 WriteStream
const wsLog = fs.createWriteStream('openclaw-gateway-ws.log', { flags: 'a', highWaterMark: 64 * 1024 })

// IPC handler: WS 日志写入
ipcMain.handle('ws-log', async (event, { prefix, data }) => {
  const entry = `[${new Date().toISOString()}] [WS ${prefix}] ${JSON.stringify(data)}\n`
  wsLog.write(entry)
  wsLog.flush()
})

// Discussion file reading - read from d:\code\temp\discussion
const discussionDir = 'd:\\code\\temp\\discussion'

// File watcher for D:\code\temp\resource
const resourceDir = 'D:\\code\\temp\\resource'
let fileWatcher = null

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase()
  const typeMap = {
    '.pdf': 'document', '.doc': 'document', '.docx': 'document', '.txt': 'document',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.bmp': 'image',
    '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet',
    '.py': 'code', '.js': 'code', '.ts': 'code', '.json': 'code'
  }
  return typeMap[ext] || 'document'
}

async function getFileList() {
  try {
    if (!fs.existsSync(resourceDir)) {
      await fs.promises.mkdir(resourceDir, { recursive: true })
      return []
    }
    const files = await fs.promises.readdir(resourceDir)
    const entries = []
    
    for (const file of files) {
      try {
        const filePath = path.join(resourceDir, file)
        const stats = await fs.promises.stat(filePath)
        if (stats.isFile()) {
          entries.push({
            id: Buffer.from(file).toString('base64').slice(0, 8),
            name: file,
            type: getFileType(file),
            size: formatFileSize(stats.size),
            date: stats.mtime.toLocaleDateString('zh-CN'),
            path: filePath
          })
        }
      } catch (e) {
        debug('Error reading file:', file, e.message)
      }
    }
    return entries
  } catch (e) {
    debug('Error listing files:', e.message)
    return []
  }
}

// IPC: list files in resource folder
ipcMain.handle('resource:list', async () => {
  const files = await getFileList()
  return { success: true, files }
})

// IPC: watch resource folder
ipcMain.handle('resource:watch', async () => {
  if (fileWatcher) {
    fileWatcher.close()
  }
  
  const watchCallback = (eventType, filename) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      getFileList().then(files => {
        mainWindow.webContents.send('resource:changed', { files })
      })
    }
  }
  
  if (fs.existsSync(resourceDir)) {
    fileWatcher = fs.watch(resourceDir, { recursive: true }, watchCallback)
    debug('Started watching:', resourceDir)
  }
  
  return { success: true }
})

// IPC: unwatch resource folder
ipcMain.handle('resource:unwatch', async () => {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = null
    debug('Stopped watching resource folder')
  }
  return { success: true }
})

// IPC: read file content
ipcMain.handle('resource:read', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('discussion:list', async () => {
  try {
    debug('Reading discussion from:', discussionDir)
    const files = await fs.promises.readdir(discussionDir)
    const entries = []
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const content = await fs.promises.readFile(
          path.join(discussionDir, file), 'utf-8'
        )
        const entry = JSON.parse(content)
        entry._file = file
        entries.push(entry)
      } catch (e) {
        debug('Error reading', file, e.message)
      }
    }
    
    // Pair start/end records into threads
    const threads = []
    const startMap = new Map() // skill_id + task_objective -> start record
    
    for (const entry of entries) {
      const key = entry.skill_id + '|' + (entry.task_objective || '')
        if (entry.event === 'start') {
        startMap.set(key, entry)
        } else if (entry.event === 'end' && startMap.has(key)) {
        const start = startMap.get(key)
          const startTime = new Date(start.timestamp)
          const endTime = new Date(entry.timestamp)
          threads.push({
            id: key,
            skill_id: entry.skill_id,
            startRecord: {
              worker_label: start.worker_label,
              worker_name: start.worker_name,
              task_objective: start.task_objective,
              timestamp: start.timestamp,
              skill_id: start.skill_id,
            },
            endRecord: {
              status: entry.status || 'success',
              summary: entry.summary || '',
              timestamp: entry.timestamp,
            },
            startTime,
            endTime,
            isActive: false,
            duration: endTime - startTime,
          })
        startMap.delete(key)
      }
    }
    
      // Add unpaired starts as incomplete (active)
    for (const [, start] of startMap) {
        threads.push({
          id: start.skill_id + '|' + (start.task_objective || ''),
          skill_id: start.skill_id,
          startRecord: {
            worker_label: start.worker_label,
            worker_name: start.worker_name,
            task_objective: start.task_objective,
            timestamp: start.timestamp,
            skill_id: start.skill_id,
          },
          endRecord: null,
          startTime: new Date(start.timestamp),
          endTime: null,
          isActive: true,
          duration: null,
        })
    }
    
    debug('Found', threads.length, 'discussion threads')
    return { success: true, discussions: threads }
  } catch (e) {
    debug('Error listing discussions:', e.message)
    return { success: false, error: e.message }
  }
})

app.whenReady().then(async () => {
  debug('App ready, calling createWindow...')
  try {
    await createWindow()
    debug('createWindow completed')
  } catch (e) {
    debug('createWindow error:', e.message, e.stack)
  }

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})