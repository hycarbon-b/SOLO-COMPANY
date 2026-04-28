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
    const req = http.get('http://localhost:5174', () => {
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
      webviewTag: true,
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
  
  const watchCallback = () => {
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
    
    // Two-pass pairing: collect starts first, then match ends regardless of file order
    const threads = []
    const startMap = new Map() // key -> start entry
    const endMap = new Map()   // key -> end entry

    for (const entry of entries) {
      const key = entry.skill_id + '|' + (entry.task_objective || '')
      if (entry.event === 'start') {
        // Keep the latest start record if duplicates exist
        const existing = startMap.get(key)
        if (!existing || entry.timestamp > existing.timestamp) {
          startMap.set(key, entry)
        }
      } else if (entry.event === 'end') {
        // Keep the latest end record if duplicates exist
        const existing = endMap.get(key)
        if (!existing || entry.timestamp > existing.timestamp) {
          endMap.set(key, entry)
        }
      }
    }

    for (const [key, start] of startMap) {
      const end = endMap.get(key)
      if (end) {
        const startTime = new Date(start.timestamp)
        const endTime = new Date(end.timestamp)
        threads.push({
          id: key,
          skill_id: start.skill_id,
          startRecord: {
            worker_label: start.worker_label,
            worker_name: start.worker_name,
            task_objective: start.task_objective,
            timestamp: start.timestamp,
            skill_id: start.skill_id,
          },
          endRecord: {
            status: end.status || 'success',
            summary: end.summary || '',
            timestamp: end.timestamp,
          },
          startTime,
          endTime,
          isActive: false,
          duration: endTime - startTime,
        })
      } else {
        threads.push({
          id: key,
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
    }
    
    debug('Found', threads.length, 'discussion threads')
    return { success: true, discussions: threads }
  } catch (e) {
    debug('Error listing discussions:', e.message)
    return { success: false, error: e.message }
  }
})

// === 外部控制 HTTP 监听：POST 一个 url:port 字符串，打开一个网页 Tab ===
const OPEN_URL_HTTP_PORT = Number(process.env.OPEN_URL_HTTP_PORT) || 17899

// === 注入 HTML 卡片 HTTP 监听：POST { html, conversation_id } ===
const INJECT_HTML_HTTP_PORT = Number(process.env.INJECT_HTML_HTTP_PORT) || 17900

function sanitizeHtmlForInjection(html) {
  // Strip script tags to prevent code execution
  return String(html).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '')
}

function extractInjectPayload(body, contentType) {
  const ct = (contentType || '').toLowerCase()
  const trimmed = (body || '').trim()
  if (!trimmed) return null
  // JSON (default if starts with {)
  if (ct.includes('application/json') || trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed)
      if (obj && obj.html && obj.conversation_id) {
        return { html: obj.html, conversationId: obj.conversation_id }
      }
    } catch {}
  }
  // form-urlencoded
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(trimmed)
    const html = params.get('html')
    const conversationId = params.get('conversation_id')
    if (html && conversationId) return { html, conversationId }
  }
  return null
}

function startInjectHtmlHttpServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' })
      res.end('Method Not Allowed')
      return
    }
    const chunks = []
    let bodyLen = 0
    req.on('data', (c) => { bodyLen += c.length; if (bodyLen > 100 * 1024) { req.destroy(); return; } chunks.push(c) })
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const payload = extractInjectPayload(body, req.headers['content-type'])
      if (!payload) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'missing html or conversation_id' }))
        return
      }
      const safeHtml = sanitizeHtmlForInjection(payload.html)
      debug('[inject-html] conversation_id =', payload.conversationId, 'html len =', safeHtml.length)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('inject-html', { html: safeHtml, conversationId: payload.conversationId })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, conversation_id: payload.conversationId }))
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'main window not ready' }))
      }
    })
    req.on('error', (e) => {
      debug('[inject-html] request error:', e.message)
      try { res.writeHead(500); res.end() } catch {}
    })
  })
  server.on('error', (e) => { debug('[inject-html] server error:', e.message) })
  server.listen(INJECT_HTML_HTTP_PORT, '127.0.0.1', () => {
    debug(`[inject-html] HTTP listening on http://127.0.0.1:${INJECT_HTML_HTTP_PORT}  (POST JSON: { html, conversation_id })`)
  })
}

function normalizeTargetUrl(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/^["']|["']$/g, '')
  if (!s) return null
  // 已经包含协议（http / https / file）
  if (/^https?:\/\//i.test(s)) return s
  if (/^file:\/\//i.test(s)) return s
  // host:port 或 host:port/path
  if (/^[^/]+:\d+/.test(s)) return `http://${s}`
  // 仅 host
  return `http://${s}`
}

function extractUrlFromBody(body, contentType) {
  const ct = (contentType || '').toLowerCase()
  const trimmed = (body || '').trim()
  if (!trimmed) return null
  // JSON
  if (ct.includes('application/json')) {
    try {
      const obj = JSON.parse(trimmed)
      return obj && (obj.url || obj.target || obj.address) || null
    } catch {
      return null
    }
  }
  // form-urlencoded: url=xxx
  if (ct.includes('application/x-www-form-urlencoded')) {
    const m = /(?:^|&)url=([^&]+)/.exec(trimmed)
    if (m) return decodeURIComponent(m[1])
  }
  // 纯文本：整体作为 url
  return trimmed
}

function startOpenUrlHttpServer() {
  const server = http.createServer((req, res) => {
    // 允许简单的跨域调用
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.writeHead(204); res.end(); return
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' })
      res.end('Method Not Allowed')
      return
    }
    const chunks = []
    let bodyLen = 0
    req.on('data', (c) => { bodyLen += c.length; if (bodyLen > 1e6) { req.destroy(); return; } chunks.push(c) })
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const raw = extractUrlFromBody(body, req.headers['content-type'])
      const url = normalizeTargetUrl(raw)
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'missing url' }))
        return
      }
      debug('[open-url] request url =', url)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('open-web-tab', { url })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, url }))
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'main window not ready' }))
      }
    })
    req.on('error', (e) => {
      debug('[open-url] request error:', e.message)
      try { res.writeHead(500); res.end() } catch {}
    })
  })
  server.on('error', (e) => {
    debug('[open-url] server error:', e.message)
  })
  server.listen(OPEN_URL_HTTP_PORT, '127.0.0.1', () => {
    debug(`[open-url] HTTP listening on http://127.0.0.1:${OPEN_URL_HTTP_PORT}  (POST body: url:port)`)
  })
}

app.whenReady().then(async () => {
  debug('App ready, calling createWindow...')
  try {
    await createWindow()
    debug('createWindow completed')
  } catch (e) {
    debug('createWindow error:', e.message, e.stack)
  }

  try {
    startOpenUrlHttpServer()
  } catch (e) {
    debug('startOpenUrlHttpServer error:', e.message)
  }

  try {
    startInjectHtmlHttpServer()
  } catch (e) {
    debug('startInjectHtmlHttpServer error:', e.message)
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