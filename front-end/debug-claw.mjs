/**
 * OpenClaw Gateway 调试脚本
 * 逐条发送测试消息，打印所有 WS 事件的完整 payload
 * 用法: node debug-claw.mjs
 */

const GATEWAY_WS  = 'ws://127.0.0.1:18789'
const TOKEN       = 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3'

// 测试消息列表（依次发送，等上一条 chat.final 后再发下一条）
const TEST_MSGS = [
  '你好，简单介绍一下你自己',
  '今天A股市场整体走势如何',
]

// ── 颜色工具 ──────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  gray:   '\x1b[90m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  magenta:'\x1b[35m',
  bold:   '\x1b[1m',
}
const ts  = () => new Date().toISOString().slice(11, 23)
const dir = (d) => d === 'SEND' ? `${C.cyan}▶ SEND${C.reset}` : `${C.yellow}◀ RECV${C.reset}`

function dump(label, obj) {
  console.log(`${C.gray}${ts()}${C.reset} ${label}`)
  console.log(JSON.stringify(obj, null, 2))
  console.log()
}

// ── 主流程 ────────────────────────────────────────────────────
let msgIdSeq = 0
const pending = new Map()  // id → { resolve, reject, sessionKey, accText }

// connect 请求 id（在 challenge 回调里设置）
let connectReqId = null

const ws = new WebSocket(`${GATEWAY_WS}?token=${TOKEN}`)

ws.addEventListener('open', () => {
  console.log(`\n${C.bold}${C.green}=== WebSocket 已连接，等待 connect.challenge ===${C.reset}\n`)
  // 不立即发送 connect；等 gateway 发来 connect.challenge 后再发
})

ws.addEventListener('message', ({ data }) => {
  let msg
  try { msg = JSON.parse(data) } catch { return }

  // ── connect.challenge → 发送 connect ──────────────────────
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    dump(`${dir('RECV')} ${C.cyan}[connect.challenge]${C.reset}`, msg)
    const nonce = msg.payload?.nonce
    connectReqId = `connect-${Date.now()}`
    const connectMsg = {
      type: 'req',
      id:   connectReqId,
      method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 10,
        client: { id: 'gateway-client', version: '1.0.0', platform: 'node', mode: 'backend' },
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.admin'],
        auth: { token: TOKEN },
        // gateway-client + backend mode: loopback path, no device signing needed
      },
    }
    pending.set(connectReqId, { type: 'connect' })
    send(connectMsg)
    return
  }

  // ── connect 握手响应 ──────────────────────────────────────
  if (connectReqId && msg.id === connectReqId && msg.type === 'res') {
    pending.delete(connectReqId)
    if (!msg.ok) {
      console.error(`${C.red}握手失败:${C.reset}`, msg)
      ws.close(); return
    }
    dump(`${dir('RECV')} ${C.green}hello-ok${C.reset}`, msg)
    // 开始顺序发送测试消息
    runMessages()
    return
  }

  // ── chat.send 的直接 res ──────────────────────────────────
  if (msg.type === 'res' && pending.has(msg.id)) {
    const p = pending.get(msg.id)
    dump(`${dir('RECV')} ${C.magenta}res (chat.send ack)${C.reset}`, msg)
    if (!msg.ok) {
      console.error(`${C.red}请求失败${C.reset}`, msg.error)
      pending.delete(msg.id)
      p?.reject?.(msg.error)
    }
    return
  }

  // ── 所有 event ────────────────────────────────────────────
  if (msg.type === 'event') {
    const evName = msg.event
    const payload = msg.payload ?? {}

    // 找对应 pending
    const sessionKey = payload.sessionKey ?? payload.data?.sessionKey
    let p = null
    if (sessionKey) {
      for (const [, v] of pending) {
        if (v.sessionKey && (v.sessionKey === sessionKey ||
            sessionKey.endsWith(v.sessionKey) || v.sessionKey.endsWith(sessionKey))) {
          p = v; break
        }
      }
    }

    // ─ 彩色分类打印 ───────────────────────────────────────
    let label
    if (evName === 'health') {
      label = `${dir('RECV')} ${C.gray}[health]${C.reset}`
    } else if (evName === 'agent') {
      const txt = payload.data?.text ?? ''
      label = `${dir('RECV')} ${C.green}[agent]${C.reset} text.len=${txt.length}`
      // agent 事件只打印摘要，不展开（太多）
      console.log(`${C.gray}${ts()}${C.reset} ${label}  sessionKey=${sessionKey ?? '?'}\n`)
      // 累积文本
      if (p && txt) {
        const prev = p.accText ?? ''
        p.accText = txt
        if (!txt.startsWith(prev)) {
          console.log(`  ${C.magenta}↻ 新段落开始 (isNewSegment)${C.reset}`)
        }
      }
      return
    } else if (evName === 'chat') {
      label = `${dir('RECV')} ${C.bold}[chat]${C.reset} state=${payload.state}`
    } else {
      label = `${dir('RECV')} ${C.yellow}[${evName}]${C.reset}`
    }

    dump(label, msg)

    // chat.final → resolve & 清理
    if (evName === 'chat' && payload.state === 'final') {
      for (const [id, v] of pending) {
        if (v.sessionKey && (v.sessionKey === sessionKey ||
            (sessionKey && (sessionKey.endsWith(v.sessionKey) || v.sessionKey.endsWith(sessionKey))))) {
          pending.delete(id)
          v.resolve?.()
          break
        }
      }
    }
    if (evName === 'chat' && payload.state === 'error') {
      for (const [id, v] of pending) {
        if (v.sessionKey === sessionKey) { pending.delete(id); v.reject?.(payload.errorMessage); break }
      }
    }
  }
})

ws.addEventListener('close', (e) => {
  console.log(`\n${C.gray}WebSocket 关闭 code=${e.code}${C.reset}\n`)
})
ws.addEventListener('error', (e) => {
  console.error(`${C.red}WebSocket 错误${C.reset}`, e.message)
})

function send(obj) {
  dump(`${dir('SEND')}`, obj)
  ws.send(JSON.stringify(obj))
}

// ── 顺序发送测试消息 ──────────────────────────────────────────
async function runMessages() {
  for (let i = 0; i < TEST_MSGS.length; i++) {
    const text = TEST_MSGS[i]
    console.log(`\n${C.bold}${C.cyan}═══ 第 ${i + 1} 条消息: "${text}" ═══${C.reset}\n`)

    const sessionKey = `debug-${Date.now()}`
    const reqId = `req-${++msgIdSeq}`

    const reqMsg = {
      type: 'req',
      id: reqId,
      method: 'chat.send',
      params: {
        sessionKey,
        idempotencyKey: reqId,
        message: text,
      },
    }

    await new Promise((resolve, reject) => {
      pending.set(reqId, { type: 'chat', sessionKey, accText: '', resolve, reject })
      send(reqMsg)

      // 超时保护：60s
      setTimeout(() => {
        if (pending.has(reqId)) {
          pending.delete(reqId)
          console.warn(`${C.red}⚠ 超时: 第 ${i + 1} 条消息未收到 chat.final${C.reset}`)
          resolve()
        }
      }, 60000)
    })

    console.log(`${C.green}✓ 第 ${i + 1} 条消息完成${C.reset}\n`)

    // 两条消息之间等 1 秒
    if (i < TEST_MSGS.length - 1) await sleep(1000)
  }

  console.log(`\n${C.bold}${C.green}=== 所有消息完成，2秒后关闭 ===${C.reset}\n`)
  await sleep(2000)
  ws.close()
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
