/**
 * OpenClaw Gateway 全帧捕获脚本（用于协议分析）
 *
 * 目标：
 *   1) 在同一 sessionKey 下连发多条消息，验证 sessionKey 是否被复用 / Gateway 行为
 *   2) 触发会引发 subagent 派生的任务（sessions_spawn），观察其 ws 帧形态
 *   3) 触发耗时工具命令（exec），观察 item / command_output 全流程
 *   4) 将所有原始帧落盘到 JSONL，便于离线分析
 *
 * 用法:
 *   node front-end/debug-claw-capture.mjs [out=ws-capture.jsonl]
 */

import fs from 'node:fs'
import path from 'node:path'

const GATEWAY_WS = 'ws://127.0.0.1:18789'
const TOKEN      = 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3'

const OUT = process.argv[2] || path.resolve('ws-capture.jsonl')
const out = fs.createWriteStream(OUT, { flags: 'w' })

// 同一逻辑会话使用同一个 sessionKey（这是关键测试点之一）
const SHARED_SESSION_KEY = `capture-${Date.now()}`

// 测试用例：
//   1. 简单消息（基线）
//   2. 触发工具调用（exec 一个稍微耗时的命令，观察 command_output 多帧）
//   3. 显式要求 spawn subagent，验证 subagent 的 sessionKey/runId 路由
const TEST_MSGS = [
  '简单回答：1+1=?（不要使用任何工具）',
  '请用 exec 工具执行 `bash -lc "for i in 1 2 3; do echo line-$i; sleep 1; done"` 并把输出原文返给我',
  '请用 sessions_spawn 派生一个 subagent，task 为 "echo hello-from-subagent"，并把它的执行结果返回',
]

// ── 工具 ─────────────────────────────────────────────────────
const ts = () => new Date().toISOString().slice(11, 23)
function logLine(kind, dir, frame) {
  const line = JSON.stringify({ ts: Date.now(), kind, dir, frame })
  out.write(line + '\n')
  // 控制台只打摘要，避免刷屏
  const summary = summarizeFrame(dir, frame)
  console.log(`[${ts()}] ${dir} ${summary}`)
}

function summarizeFrame(dir, m) {
  if (m?.type === 'res') return `res id=${m.id} ok=${m.ok}`
  if (m?.type === 'event') {
    const ev = m.event
    const p  = m.payload || {}
    const sk = p.sessionKey
    if (ev === 'agent') {
      const stream = p.stream
      const d = p.data || {}
      let extra = ''
      if (stream === 'item') extra = `kind=${d.kind} phase=${d.phase} status=${d.status} cid=${d.toolCallId?.slice(0, 12)}`
      else if (stream === 'command_output') extra = `phase=${d.phase} bytes=${(d.output ?? '').length}`
      else if (stream === 'assistant') extra = `delta.len=${(d.delta ?? '').length}`
      else if (stream === 'lifecycle') extra = `phase=${d.phase}`
      return `event=agent stream=${stream} ${extra} runId=${p.runId?.slice(0, 8)} sk=${sk}`
    }
    if (ev === 'chat') return `event=chat state=${p.state} sk=${sk}`
    if (ev === 'health') return `event=health`
    if (ev === 'connect.challenge') return `event=connect.challenge`
    return `event=${ev} sk=${sk}`
  }
  return `req method=${m?.method} id=${m?.id}`
}

// ── 主流程 ───────────────────────────────────────────────────
let connectReqId = null
const ws = new WebSocket(`${GATEWAY_WS}?token=${TOKEN}`)

ws.addEventListener('open', () => console.log('[ws] connected, waiting for connect.challenge...'))
ws.addEventListener('close', e => { console.log(`[ws] closed code=${e.code}`); out.end() })
ws.addEventListener('error', e => console.error('[ws] error', e?.message ?? e))

ws.addEventListener('message', async ({ data }) => {
  let msg; try { msg = JSON.parse(data) } catch { return }
  logLine('frame', 'RECV', msg)

  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    connectReqId = `connect-${Date.now()}`
    sendFrame({
      type: 'req',
      id: connectReqId,
      method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 10,
        client: { id: 'gateway-client', version: '1.0.0', platform: 'node', mode: 'backend' },
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.admin'],
        auth: { token: TOKEN },
      },
    })
    return
  }

  if (msg.id === connectReqId && msg.type === 'res') {
    if (!msg.ok) { console.error('connect failed', msg); ws.close(); return }
    console.log('[ws] connected & authed, starting tests')
    await runTests()
    return
  }
})

function sendFrame(obj) {
  logLine('frame', 'SEND', obj)
  ws.send(JSON.stringify(obj))
}

// 等待某个 sessionKey 收到 chat.state=final（或 error / 超时）
function waitForFinal(sessionKey, timeoutMs = 120_000) {
  return new Promise(resolve => {
    const t = setTimeout(() => { ws.removeEventListener('message', handler); resolve('timeout') }, timeoutMs)
    function handler({ data }) {
      let m; try { m = JSON.parse(data) } catch { return }
      if (m?.type !== 'event' || m.event !== 'chat') return
      const sk = m.payload?.sessionKey
      // gateway 实际 sk 为 agent:main:<sk> 形态，做后缀匹配
      if (sk && (sk === sessionKey || sk.endsWith(sessionKey))) {
        if (m.payload?.state === 'final' || m.payload?.state === 'error') {
          clearTimeout(t)
          ws.removeEventListener('message', handler)
          resolve(m.payload.state)
        }
      }
    }
    ws.addEventListener('message', handler)
  })
}

async function runTests() {
  for (let i = 0; i < TEST_MSGS.length; i++) {
    const message = TEST_MSGS[i]
    const reqId = `req-${i + 1}-${Date.now()}`
    console.log(`\n=== [${i + 1}/${TEST_MSGS.length}] sending under sessionKey=${SHARED_SESSION_KEY} ===`)
    console.log(`    msg="${message}"`)
    sendFrame({
      type: 'req',
      id: reqId,
      method: 'chat.send',
      params: {
        sessionKey: SHARED_SESSION_KEY,    // 关键：复用同一 sessionKey
        idempotencyKey: reqId,
        message,
      },
    })
    const result = await waitForFinal(SHARED_SESSION_KEY)
    console.log(`=== [${i + 1}] result=${result} ===`)
    await sleep(800)
  }
  console.log(`\nCapture complete → ${OUT}`)
  setTimeout(() => ws.close(), 500)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
