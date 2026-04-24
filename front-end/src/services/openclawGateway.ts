/**
 * OpenClaw Gateway WebSocket Service (React/TypeScript)
 * 直接通过 WebSocket 连接 openclaw Gateway
 * 从 .env 加载：VITE_OPENCLAW_GATEWAY_URL, VITE_OPENCLAW_GATEWAY_KEY
 */

// ===== WS日志记录 =====
function logWs(prefix: string, data: unknown) {
  // 输出到控制台，被main进程捕获并写入openclaw-gateway-ws.log
  console.log(`[WS ${prefix}]`, JSON.stringify(data))
}

// ===== 配置 =====

interface GatewayConfig {
  GATEWAY_HTTP_URL: string
  GATEWAY_WS_URL: string
  GATEWAY_KEY: string
}

function loadGatewayConfig(): GatewayConfig {
  const gatewayUrl = (import.meta.env.VITE_OPENCLAW_GATEWAY_URL as string) || 'http://127.0.0.1:18789'
  const gatewayKey = (import.meta.env.VITE_OPENCLAW_GATEWAY_KEY as string) || ''
  const wsUrl = gatewayUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://')
  return { GATEWAY_HTTP_URL: gatewayUrl, GATEWAY_WS_URL: wsUrl, GATEWAY_KEY: gatewayKey }
}

let config = loadGatewayConfig()

const STORAGE_KEY = 'openclaw-token'

export function getToken(): string {
  return localStorage.getItem(STORAGE_KEY) || config.GATEWAY_KEY || ''
}

export function setToken(token: string) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
  config = loadGatewayConfig()
}

export function getGatewayConfig(): GatewayConfig {
  return config
}

// ===== WebSocket 连接 =====

interface ExtWebSocket extends WebSocket {
  _authenticated: boolean
}

interface PendingRequest {
  sessionKey: string
  onStream?: ((chunk: string, accumulated: string) => void) | null
  _accumulatedText: string
  resolve: (result: { text: string }) => void
  reject: (err: Error) => void
}

let ws: ExtWebSocket | null = null
let messageId = 0
const pendingRequests = new Map<string, PendingRequest>()

function rejectRequest(id: string, error: Error) {
  if (pendingRequests.has(id)) {
    const req = pendingRequests.get(id)!
    pendingRequests.delete(id)
    req.reject(error)
  }
}

function handleGatewayMessage(data: any) {
  // 直接响应（type: 'res'，带 id）
  if (data.id && pendingRequests.has(data.id)) {
    const req = pendingRequests.get(data.id)!
    if (!data.ok || data.error) {
      pendingRequests.delete(data.id)
      req.reject(new Error(data.error?.message || data.error || 'Request failed'))
    }
    // res 不直接 resolve，等待 chat final 事件
    return
  }

  // 流式事件（type: 'event'）
  if (data.type !== 'event' || !data.event || !data.payload) return
  const payload = data.payload

  // 找到匹配的 pending 请求（通过 sessionKey）
  let matchedReq: PendingRequest | null = null
  let matchedId = ''
  for (const [reqId, req] of pendingRequests) {
    const matched =
      payload.sessionKey &&
      (payload.sessionKey === req.sessionKey ||
        payload.sessionKey.endsWith(req.sessionKey) ||
        req.sessionKey.endsWith(payload.sessionKey))
    if (matched) {
      matchedReq = req
      matchedId = reqId
      break
    }
  }
  if (!matchedReq) return

  const req = matchedReq
  const reqId = matchedId

  // === agent 事件：流式文本（payload.data.text 是全量累积文本）===
  if (data.event === 'agent') {
    const d = payload.data
    if (d && typeof d.text === 'string' && d.text.length > 0) {
      const newText: string = d.text
      // Gateway 返回的是全量文本，计算增量发给 onStream
      const prevLen = req._accumulatedText.length
      const chunk = newText.slice(prevLen)
      req._accumulatedText = newText
      if (chunk && req.onStream) {
        req.onStream(chunk, newText)
      }
    }
    return
  }

  // === chat 事件：最终完成 / 错误 ===
  if (data.event === 'chat') {
    if (payload.state === 'error') {
      pendingRequests.delete(reqId)
      req.reject(new Error(payload.errorMessage || 'Gateway error'))
      return
    }
    if (payload.state === 'final') {
      // 优先用流式累积文本
      let text = req._accumulatedText
      if (!text && payload.message) {
        const msg = payload.message
        if (Array.isArray(msg.content)) {
          text = msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
        } else if (typeof msg.content === 'string') {
          text = msg.content
        }
      }
      pendingRequests.delete(reqId)
      req.resolve({ text: text || '' })
    }
  }
}

function getWebSocket(): Promise<ExtWebSocket> {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN && ws._authenticated) {
      resolve(ws)
      return
    }

    if (ws && ws.readyState === WebSocket.CONNECTING) {
      const check = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN && ws._authenticated) {
          clearInterval(check)
          resolve(ws)
        } else if (!ws || ws.readyState === WebSocket.CLOSED) {
          clearInterval(check)
          reject(new Error('WebSocket connection failed'))
        }
      }, 100)
      return
    }

    const token = getToken()
    const rawWs = new WebSocket(`${config.GATEWAY_WS_URL}?token=${token}`) as ExtWebSocket
    rawWs._authenticated = false
    ws = rawWs

    let connectRequestId: string | null = null

    rawWs.onopen = () => {
      connectRequestId = `connect-${Date.now()}`
      rawWs.send(
        JSON.stringify({
          type: 'req',
          id: connectRequestId,
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 10,
            client: { id: 'openclaw-control-ui', version: '1.0.0', platform: 'web', mode: 'webchat' },
            role: 'operator',
            scopes: ['operator.read', 'operator.write', 'operator.admin'],
            auth: { token },
          },
        })
      )
      const connectMsg = { type: 'req', id: connectRequestId, method: 'connect', params: { minProtocol: 3, maxProtocol: 10, client: { id: 'openclaw-control-ui', version: '1.0.0', platform: 'web', mode: 'webchat' }, role: 'operator', scopes: ['operator.read', 'operator.write', 'operator.admin'], auth: { token } } }
      logWs('SEND', connectMsg)
    }

    rawWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.id === connectRequestId) {
          if (data.ok) {
            rawWs._authenticated = true
            resolve(rawWs)
          } else {
            rawWs.close()
            reject(new Error(data.error?.message || 'Authentication failed'))
          }
          return
        }
        // 分发给原始消息监听器（调试用）
        if (typeof (window as any).__ocRawListener === 'function') {
          try { (window as any).__ocRawListener(data) } catch {}
        }
        handleGatewayMessage(data)
        logWs('RECV', data)
      } catch (err) {
        console.error('[Gateway] Parse error:', err)
      }
    }

    rawWs.onerror = () => {
      // onclose will follow and clean up
    }

    rawWs.onclose = (event) => {
      ws = null
      pendingRequests.forEach((_, id) => {
        rejectRequest(id, new Error(`WebSocket disconnected (code: ${event.code})`))
      })
    }
  })
}

// ===== 公开 API =====

/**
 * 通过 OpenClaw Gateway 发送消息，支持流式回调。
 * @param message 用户消息内容
 * @param onStream 流式回调，每次有新内容时调用 (chunk, accumulated)
 */
export async function callOpenClawGateway(
  message: string,
  onStream?: ((chunk: string, accumulated: string) => void) | null
): Promise<{ text: string }> {
  const socket = await getWebSocket()
  const id = `${Date.now()}-${++messageId}-${Math.random().toString(36).slice(2, 8)}`
  const sessionKey = `tradingbase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      rejectRequest(id, new Error('请求超时，请检查 OpenClaw Gateway 是否正常运行'))
    }, 120000)

    pendingRequests.set(id, {
      sessionKey,
      onStream,
      _accumulatedText: '',
      resolve: (result) => {
        clearTimeout(timeout)
        resolve(result)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      },
    })

    socket.send(
      JSON.stringify({
        type: 'req',
        id,
        method: 'chat.send',
        params: { message, sessionKey, idempotencyKey: id },
      })
    )
    logWs('SEND', { type: 'req', id, method: 'chat.send', params: { message, sessionKey, idempotencyKey: id } })
  })
}

/**
 * 检查 Gateway 是否可用（HTTP 探测）
 */
export async function checkGatewayStatus(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    await fetch(`${config.GATEWAY_HTTP_URL}/`, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
    clearTimeout(timeout)
    return true
  } catch {
    return false
  }
}

export function closeGatewayConnection() {
  if (ws) {
    ws.close()
    ws = null
  }
}

/**
 * 获取当前 WebSocket 连接状态
 */
export function getWsReadyState(): number | null {
  return ws ? ws.readyState : null
}

export function getWsAuthenticated(): boolean {
  return !!(ws && ws._authenticated)
}

export function getPendingRequestCount(): number {
  return pendingRequests.size
}
