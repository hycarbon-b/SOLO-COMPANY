/**
 * OpenClaw Gateway WebSocket Service
 * 连接本地 OpenClaw ws://127.0.0.1:18789
 *
 * 协议说明（来自 backend-demo 逆向）：
 * 1. 建连后发 connect 握手（带 token）
 * 2. chat.send：params.message 是字符串，params.sessionKey 用于匹配后续 event
 * 3. 流式响应：event=agent，payload.data.text 是累积全文，payload.stream==='done' 表示结束
 * 4. 最终响应：event=chat，payload.state==='final'，payload.message.content 提取文本
 */

// ===== 配置 =====

const GATEWAY_WS_URL =
  ((import.meta as any).env?.VITE_OPENCLAW_GATEWAY_URL as string | undefined)
    ?.replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://') ?? 'ws://127.0.0.1:18789'

const GATEWAY_KEY =
  ((import.meta as any).env?.VITE_OPENCLAW_GATEWAY_KEY as string | undefined) ?? ''

const STORAGE_KEY = 'openclaw-token'

export function getToken(): string {
  return localStorage.getItem(STORAGE_KEY) || GATEWAY_KEY || ''
}

export function setToken(token: string | null): void {
  token ? localStorage.setItem(STORAGE_KEY, token) : localStorage.removeItem(STORAGE_KEY)
}

// ===== 内部状态 =====

interface PendingReq {
  sessionKey: string
  onStream?: ((text: string) => void) | null
  _accText: string
  _boundRunId?: string
  resolve: (text: string) => void
  reject: (err: Error) => void
}

let ws: (WebSocket & { _authenticated?: boolean }) | null = null
let msgCounter = 0
const pending = new Map<string, PendingReq>()

// ===== 消息处理 =====

function extractText(message: any): string {
  if (!message) return ''
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text as string)
      .join('')
  }
  return ''
}

function onMessage(data: any): void {
  // 直接响应（type: 'res'，带原 id）
  if (data.type === 'res' && data.id && pending.has(data.id)) {
    const req = pending.get(data.id)!
    if (!data.ok || data.error) {
      pending.delete(data.id)
      req.reject(new Error(data.error?.message ?? data.error ?? 'Request failed'))
      return
    }
    // 部分 Gateway 版本直接在 res 里带文本
    const text =
      typeof data.payload === 'string'
        ? data.payload
        : (data.payload?.text ?? data.payload?.content ?? '')
    if (text) {
      pending.delete(data.id)
      req.resolve(text)
    }
    return
  }

  // 事件（type: 'event'）—— 用 sessionKey 匹配 pending 请求
  if (data.type === 'event' && data.event && data.payload) {
    const payload = data.payload

    for (const [reqId, req] of pending) {
      // sessionKey 匹配：Gateway 会在前面加 'agent:main:' 前缀
      const ps: string = payload.sessionKey ?? ''
      const rs = req.sessionKey
      if (!ps) continue
      const matched = ps === rs || ps.endsWith(rs) || rs.endsWith(ps)
      if (!matched) continue

      // runId 绑定：只跟第一个 run，防止 exec-approval-followup 误触发 resolve
      const runId: string | undefined = payload.runId
      if (runId) {
        if (!req._boundRunId) {
          req._boundRunId = runId
        } else if (req._boundRunId !== runId) {
          // 次级 run 的 final/error 不能结束请求
          if (data.event === 'chat' && (payload.state === 'final' || payload.state === 'error')) break
        }
      }

      // agent 事件：流式累积文本
      if (data.event === 'agent') {
        const d = payload.data
        if (d && typeof d.text === 'string') {
          req._accText = d.text // OpenClaw 给的是完整累积文本，不是增量
          req.onStream?.(req._accText)
        }
        if (payload.stream === 'done' || payload.stream === 'complete' || payload.stream === 'end') {
          pending.delete(reqId)
          req.resolve(req._accText)
        }
      }

      // chat 事件：最终结果
      else if (data.event === 'chat') {
        if (payload.state === 'error') {
          pending.delete(reqId)
          req.reject(new Error(payload.errorMessage ?? 'Agent error'))
        } else if (payload.state === 'final') {
          const text = extractText(payload.message) || req._accText
          pending.delete(reqId)
          req.resolve(text)
        }
      }

      break
    }
  }
}

// ===== WebSocket 连接管理 =====

function getWs(): Promise<WebSocket & { _authenticated?: boolean }> {
  return new Promise((resolve, reject) => {
    if (ws?.readyState === WebSocket.OPEN && ws._authenticated) {
      return resolve(ws)
    }
    if (ws?.readyState === WebSocket.CONNECTING) {
      const t = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN && ws._authenticated) { clearInterval(t); resolve(ws!) }
        else if (!ws || ws.readyState === WebSocket.CLOSED) { clearInterval(t); reject(new Error('WS failed')) }
      }, 100)
      return
    }

    const token = getToken()
    const sock = new WebSocket(`${GATEWAY_WS_URL}?token=${token}`) as WebSocket & { _authenticated?: boolean }
    sock._authenticated = false
    ws = sock

    let connectId: string | null = null

    sock.onopen = () => {
      connectId = `connect-${Date.now()}`
      sock.send(JSON.stringify({
        type: 'req',
        id: connectId,
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 10,
          client: { id: 'solo-company2-web', version: '1.0.0', platform: 'web', mode: 'webchat' },
          role: 'operator',
          scopes: ['operator.read', 'operator.write', 'operator.admin'],
          auth: { token },
        },
      }))
    }

    sock.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string)
        if (data.id === connectId) {
          if (data.ok) { sock._authenticated = true; resolve(sock) }
          else { sock.close(); reject(new Error(data.error?.message ?? 'Auth failed')) }
          return
        }
        onMessage(data)
      } catch (e) {
        console.error('[OpenClaw] parse error', e)
      }
    }

    sock.onerror = () => { /* onclose follows */ }

    sock.onclose = (evt) => {
      ws = null
      pending.forEach((_, id) => {
        const r = pending.get(id)!
        pending.delete(id)
        r.reject(new Error(`WS closed (${evt.code})`))
      })
    }
  })
}

// ===== 公开 API =====

/**
 * 发送消息到本地 OpenClaw，支持流式回调。
 * @param message     用户消息（纯字符串）
 * @param sessionKey  会话 key（可选，留空则自动生成）
 * @param onStream    每次有新内容时回调 (accumulatedText)
 * @returns           最终完整文本
 */
export async function sendChatMessage(
  message: string,
  sessionKey?: string | null,
  onStream?: ((text: string) => void) | null,
): Promise<string> {
  const socket = await getWs()
  const id = `chat-${Date.now()}-${++msgCounter}`
  const finalSessionKey = sessionKey || `solo2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('超时：OpenClaw Gateway 无响应（120s）'))
    }, 120_000)

    pending.set(id, {
      sessionKey: finalSessionKey,
      onStream,
      _accText: '',
      resolve: (text) => { clearTimeout(timer); resolve(text) },
      reject:  (err)  => { clearTimeout(timer); reject(err) },
    })

    // message 必须是字符串，不是 {role, content} 对象
    socket.send(JSON.stringify({
      type: 'req',
      id,
      method: 'chat.send',
      params: { message, sessionKey: finalSessionKey, idempotencyKey: id },
    }))
  })
}

/**
 * HTTP 探测 Gateway 是否在线（< 1.5s）
 */
export async function checkGatewayStatus(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const httpUrl = GATEWAY_WS_URL.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://')
    await fetch(`${httpUrl}/`, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
    clearTimeout(t)
    return true
  } catch {
    return false
  }
}

export function closeGatewayConnection(): void {
  ws?.close()
  ws = null
}
