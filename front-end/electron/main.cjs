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
      if (entry.event === 'discussion_start') {
        startMap.set(key, entry)
      } else if (entry.event === 'discussion_end' && startMap.has(key)) {
        const start = startMap.get(key)
        threads.push({
          skill_id: entry.skill_id,
          task_objective: entry.task_objective,
          start_time: start.timestamp,
          end_time: entry.timestamp,
          start,
          end: entry,
        })
        startMap.delete(key)
      }
    }
    
    // Add unpaired starts as incomplete
    for (const [, start] of startMap) {
      threads.push({
        skill_id: start.skill_id,
        task_objective: start.task_objective,
        start_time: start.timestamp,
        end_time: null,
        start,
        end: null,
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