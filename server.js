/**
 * Solo Company - Node.js 后端服务
 * 用于生产环境部署，替代 Vite 开发服务器的 API 功能
 */

import http from 'http'
import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置
const PORT = process.env.PORT || 3000
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, 'dist')

// 找到 Node 22 路径（openclaw 需要 22+）
function findNode22() {
  const candidates = [
    '/usr/local/bin/node',
    '/usr/bin/node',
    '/opt/homebrew/bin/node',
    '/root/.nvm/versions/node/v22.22.0/bin/node',
    '/home/user/.nvm/versions/node/v22.22.0/bin/node',
  ]
  for (const p of candidates) {
    try {
      const v = execSync(`${p} --version`, { encoding: 'utf8' }).trim()
      if (v.startsWith('v22') || v.startsWith('v23') || v.startsWith('v24')) return p
    } catch {}
  }
  // 检查当前 node 版本
  try {
    const v = execSync(`node --version`, { encoding: 'utf8' }).trim()
    if (v.startsWith('v22') || v.startsWith('v23') || v.startsWith('v24')) {
      return 'node'
    }
  } catch {}
  return process.execPath
}

const NODE22 = findNode22()

// 找到 openclaw 路径
function findOpenClaw() {
  const candidates = [
    '/usr/local/bin/openclaw',
    '/usr/bin/openclaw',
    '/opt/homebrew/bin/openclaw',
    '/root/.nvm/versions/node/v22.22.0/bin/openclaw',
    '/home/user/.nvm/versions/node/v22.22.0/bin/openclaw',
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  // 尝试 which
  try {
    return execSync('which openclaw', { encoding: 'utf8' }).trim()
  } catch {}
  return 'openclaw'
}

const OPENCLAW_PATH = findOpenClaw()

// 串行队列，确保同一时间只有一个 openclaw 进程在运行
const openClawQueue = []
let isProcessing = false

async function processQueue() {
  if (isProcessing || openClawQueue.length === 0) return
  isProcessing = true

  const { message, resolve, reject } = openClawQueue.shift()

  try {
    const result = await callOpenClawInternal(message)
    resolve(result)
  } catch (err) {
    reject(err)
  } finally {
    isProcessing = false
    // 处理下一个
    setImmediate(processQueue)
  }
}

// 外部调用的队列接口
function callOpenClaw(message) {
  return new Promise((resolve, reject) => {
    openClawQueue.push({ message, resolve, reject })
    processQueue()
  })
}

// 实际的 openclaw 调用（内部使用）
async function callOpenClawInternal(message) {
  const env = {
    ...process.env,
    PATH: `/usr/local/bin:/usr/bin:/opt/homebrew/bin:${process.env.HOME}/.nvm/versions/node/v22.22.0/bin:${process.env.PATH || ''}`,
  }

  return new Promise((resolve, reject) => {
    const args = ['agent', '--local', '--json', '--agent', 'main', '--timeout', '300', '--message', message]

    console.log(`[openclaw] Calling: ${NODE22} ${OPENCLAW_PATH} ${args.join(' ')}`)

    const child = spawn(NODE22, [OPENCLAW_PATH, ...args], {
      env,
      cwd: process.cwd(),
      timeout: 310000,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[openclaw] Exit code ${code}, stderr:`, stderr.slice(0, 500))
        reject(new Error(`openclaw exited with code ${code}: ${stderr.slice(0, 500)}`))
        return
      }

      const rawOutput = stderr || stdout
      try {
        const jsonStart = rawOutput.indexOf('{')
        const jsonStr = jsonStart >= 0 ? rawOutput.slice(jsonStart) : rawOutput
        const result = JSON.parse(jsonStr)
        const text = result.payloads?.[0]?.text || ''
        resolve({ content: text, meta: result.meta || null })
      } catch (e) {
        resolve({ content: rawOutput.trim(), raw: true })
      }
    })

    child.on('error', (err) => {
      console.error('[openclaw] Spawn error:', err)
      reject(err)
    })
  })
}

// 解析 JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

// 发送 JSON 响应
function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// 静态文件服务
function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url)
  
  // 处理前端路由（单页应用）
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  const ext = path.extname(filePath)
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream'

  res.writeHead(200, { 'Content-Type': contentType })
  fs.createReadStream(filePath).pipe(res)
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = req.url

  // API 路由
  if (url === '/api/chat' && req.method === 'POST') {
    const body = await parseBody(req)
    const { message } = body

    if (!message) {
      sendJSON(res, 400, { error: 'Missing message' })
      return
    }

    try {
      const result = await callOpenClaw(message)
      sendJSON(res, 200, result)
    } catch (err) {
      console.error('[api/chat] Error:', err.message)
      sendJSON(res, 500, { error: err.message, detail: err.message })
    }
    return
  }

  // 健康检查
  if (url === '/api/health') {
    let openclawVersion = 'not found'
    try {
      openclawVersion = execSync(`${NODE22} ${OPENCLAW_PATH} --version`, { encoding: 'utf8' }).trim()
    } catch {}

    sendJSON(res, 200, {
      status: 'ok',
      backend: 'openclaw',
      nodeVersion: NODE22,
      openclawVersion,
      openclawPath: OPENCLAW_PATH,
    })
    return
  }

  // 列出工作区文件树（仅 GET）
  if (url.startsWith('/api/files') && req.method === 'GET') {
    try {
      const query = url.split('?')[1] || ''
      const params = new URLSearchParams(query)
      const relPath = params.get('path') || '.'
      const base = path.resolve(__dirname)
      const target = path.resolve(base, relPath)

      // 安全检查：确保 target 在 base 下
      if (!target.startsWith(base)) {
        sendJSON(res, 400, { error: 'Invalid path' })
        return
      }

      // 忽略的文件/目录
      const ignore = new Set(['node_modules', 'dist', '.git', '.DS_Store'])

      function readDirTree(dir) {
        const items = []
        const names = fs.readdirSync(dir)
        for (const name of names) {
          if (ignore.has(name)) continue
          const full = path.join(dir, name)
          let stat
          try {
            stat = fs.statSync(full)
          } catch (e) { continue }
          if (stat.isDirectory()) {
            items.push({ name, type: 'dir', path: path.relative(base, full), children: readDirTree(full) })
          } else {
            items.push({ name, type: 'file', path: path.relative(base, full), size: stat.size })
          }
        }
        // 按类型和名称排序，目录优先
        items.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        return items
      }

      const tree = readDirTree(target)
      sendJSON(res, 200, { base: path.relative(base, target) || '.', tree })
    } catch (err) {
      console.error('[api/files] Error:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // 静态文件
  serveStatic(req, res)
})

server.listen(PORT, () => {
  console.log(`
🚀 Solo Company Server running on http://localhost:${PORT}

Configuration:
  - Node: ${NODE22}
  - OpenClaw: ${OPENCLAW_PATH}
  - Dist: ${DIST_DIR}

Endpoints:
  - GET  /           → Static files
  - POST /api/chat   → Chat with AI
  - GET  /api/health → Health check
`)
})

// 优雅退出
process.on('SIGTERM', () => {
  console.log('\nShutting down...')
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('\nShutting down...')
  server.close(() => process.exit(0))
})
