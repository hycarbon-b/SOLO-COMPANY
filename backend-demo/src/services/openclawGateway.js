/**
 * OpenClaw Gateway WebSocket Service
 * 直接通过 WebSocket 连接 openclaw Gateway (ws://127.0.0.1:18789)
 * 包含：聊天请求、流式输出、授权对话框管理
 */

import { ref } from 'vue'

// Gateway 地址（从 .env 加载，支持 WebSocket 和 HTTP）
const loadGatewayConfig = () => {
  const gatewayUrl = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
  const gatewayKey = import.meta.env.VITE_OPENCLAW_GATEWAY_KEY || ''
  
  // 转换 HTTP URL 为 WebSocket URL
  const wsUrl = gatewayUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://')
  
  return {
    GATEWAY_HTTP_URL: gatewayUrl,
    GATEWAY_WS_URL: wsUrl,
    GATEWAY_KEY: gatewayKey
  }
}

let config = loadGatewayConfig()

// 从 localStorage 获取 token
const STORAGE_KEY = 'openclaw-token'

export function getToken() {
  return localStorage.getItem(STORAGE_KEY) || config.GATEWAY_KEY || ''
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
    config = loadGatewayConfig()
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * 获取 Gateway 配置
 */
export function getGatewayConfig() {
  return config
}

// ===== 授权状态（原 approval.js） =====
const pendingApprovals = ref([])
const currentApproval = ref(null)

/**
 * 获取授权状态（供 Vue 组件使用）
 */
export function useApprovalState() {
  return { pendingApprovals, currentApproval }
}

function handleApprovalRequest(payload) {
  // console.log('[Approval] handleApprovalRequest called with payload:', JSON.stringify(payload, null, 2))

  if (!payload || !payload.id) {
    console.error('[Approval] Invalid payload, missing id:', payload)
    return
  }

  const approval = {
    id: payload.id,
    request: payload.request || {},
    createdAt: payload.createdAtMs,
    expiresAt: payload.expiresAtMs,
    status: 'pending'
  }
  pendingApprovals.value.push(approval)
  if (!currentApproval.value) {
    currentApproval.value = approval
    console.log('[Approval] Set currentApproval to:', approval.id)
  } else {
    console.log('[Approval] currentApproval already set to:', currentApproval.value.id, ', added to queue')
  }
  console.log('[Approval] 新授权请求:', approval.id, 'pendingApprovals count:', pendingApprovals.value.length)
}

function handleApprovalResolved(payload) {
  const index = pendingApprovals.value.findIndex(a => a.id === payload.id)
  if (index > -1) {
    pendingApprovals.value[index].status = payload.approved ? 'approved' : 'rejected'
    if (currentApproval.value?.id === payload.id) {
      showNextApproval()
    }
  }
}

function showNextApproval() {
  const next = pendingApprovals.value.find(a => a.status === 'pending')
  currentApproval.value = next || null
}

/**
 * 批准执行请求
 */
export function approveRequest(approvalId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[Approval] WebSocket 未连接')
    return
  }
  const msg = {
    type: 'req',
    id: `approval-${Date.now()}`,
    method: 'exec.approval.resolve',
    params: {
      id: approvalId,
      decision: 'allow-once'
    }
  }
  ws.send(JSON.stringify(msg))
  console.log('[Approval] 已批准:', approvalId, msg)
  const approval = pendingApprovals.value.find(a => a.id === approvalId)
  if (approval) approval.status = 'approved'
  showNextApproval()
}

/**
 * 拒绝执行请求
 */
export function rejectApproval(approvalId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[Approval] WebSocket 未连接')
    return
  }
  const msg = {
    type: 'req',
    id: `approval-${Date.now()}`,
    method: 'exec.approval.resolve',
    params: {
      id: approvalId,
      decision: 'deny'
    }
  }
  ws.send(JSON.stringify(msg))
  console.log('[Approval] 已拒绝:', approvalId, msg)
  const approval = pendingApprovals.value.find(a => a.id === approvalId)
  if (approval) approval.status = 'rejected'
  showNextApproval()
}

// ===== WebSocket 连接管理 =====

let ws = null
let messageId = 0
const pendingRequests = new Map()

// 全局流式回调注册表（用于解决 HMR 导致的函数引用问题）
const streamCallbacks = new Map()

// 全局消息更新回调（用于直接更新 chat.js 中的消息）
let globalMessageUpdater = null

/**
 * 设置全局消息更新回调
 * @param {Function} updater - (messageId, content) => void
 */
export function setGlobalMessageUpdater(updater) {
  globalMessageUpdater = updater
  console.log('[Gateway] Global message updater set:', typeof updater)
}

// 当前活动的请求 ID（用于中止）
let currentActiveRequestId = null

/**
 * 设置当前活动的请求 ID
 */
export function setActiveRequestId(id) {
  currentActiveRequestId = id
}

/**
 * 获取当前活动的请求 ID
 */
export function getActiveRequestId() {
  return currentActiveRequestId
}

/**
 * 清除当前活动的请求 ID
 */
export function clearActiveRequestId() {
  currentActiveRequestId = null
}

/**
 * 中止当前活动的请求
 */
export function abortCurrentRequest() {
  // 中止当前活动的请求
  if (currentActiveRequestId && pendingRequests.has(currentActiveRequestId)) {
    const req = pendingRequests.get(currentActiveRequestId)
    pendingRequests.delete(currentActiveRequestId)
    if (req.reject) {
      req.reject(new Error('用户已中止生成'))
    }
    console.log('[OpenClaw Gateway] Request aborted:', currentActiveRequestId)
  }
  currentActiveRequestId = null
}

/**
 * 中止所有进行中的请求
 */
export function abortAllRequests() {
  console.log('[OpenClaw Gateway] Aborting all requests, count:', pendingRequests.size)
  let abortedCount = 0
  for (const [id, req] of pendingRequests.entries()) {
    if (req.reject) {
      req.reject(new Error('用户已中止生成'))
      abortedCount++
    }
  }
  pendingRequests.clear()
  currentActiveRequestId = null
  console.log('[OpenClaw Gateway] All requests aborted:', abortedCount)
}

/**
 * 获取或创建 WebSocket 连接（包含握手）
 */
function getWebSocket() {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN && ws._authenticated) {
      resolve(ws)
      return
    }

    if (ws && ws.readyState === WebSocket.CONNECTING) {
      // 等待连接完成
      const checkInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN && ws._authenticated) {
          clearInterval(checkInterval)
          resolve(ws)
        } else if (ws.readyState === WebSocket.CLOSED) {
          clearInterval(checkInterval)
          reject(new Error('WebSocket connection failed'))
        }
      }, 100)
      return
    }

    // 创建新连接
    try {
      const token = getToken()
      // 通过 query 参数传递 token
      const wsUrl = `${config.GATEWAY_WS_URL}?token=${token}`
      ws = new WebSocket(wsUrl)
      ws._authenticated = false

      let connectRequestId = null

      ws.onopen = () => {
        console.log('[OpenClaw Gateway] WebSocket opened, sending connect...')
        // 发送 connect 请求进行握手
        connectRequestId = `connect-${Date.now()}`
        const connectMsg = {
          type: 'req',
          id: connectRequestId,
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 10,
            client: {
              id: 'openclaw-control-ui',
              version: '1.0.0',
              platform: 'web',
              mode: 'webchat'
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write', 'operator.admin'],
            auth: { token },
            // device: {
            //   id: 'solo-company-web',
            //   platform: 'web'
            // }
          }
        }
        ws.send(JSON.stringify(connectMsg))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // 处理 connect 响应
          if (data.id === connectRequestId) {
            if (data.ok) {
              console.log('[OpenClaw Gateway] Authenticated successfully')
              ws._authenticated = true
              resolve(ws)
            } else {
              console.error('[OpenClaw Gateway] Authentication failed:', data.error)
              ws.close()
              reject(new Error(data.error?.message || 'Authentication failed'))
            }
            return
          }
          
          handleGatewayMessage(data)
        } catch (err) {
          console.error('[OpenClaw Gateway] Parse error:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('[OpenClaw Gateway] WebSocket Error:', err)
      }

      ws.onclose = (event) => {
        console.log('[OpenClaw Gateway] Disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        ws = null
        // 清理所有 pending 请求
        pendingRequests.forEach((_, id) => {
          rejectRequest(id, new Error(`WebSocket disconnected (code: ${event.code})`))
        })
      }
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * 处理 Gateway 返回的消息
 */
function handleGatewayMessage(data) {
  // 处理响应 (type: "res", 带 id 的直接响应)
  const id = data.id
  if (id && pendingRequests.has(id)) {
    const req = pendingRequests.get(id)

    if (!data.ok || data.error) {
      pendingRequests.delete(id)
      req.reject(new Error(data.error?.message || data.error || 'Request failed'))
    } else if (data.payload) {
      const payload = data.payload
      let text = ''
      if (typeof payload === 'string') {
        text = payload
      } else if (payload.text) {
        text = payload.text
      } else if (payload.content) {
        text = payload.content
      } else if (payload.result) {
        text = payload.result
      }
      if (text) {
        const toolCalls = req._toolCalls || []
        pendingRequests.delete(id)
        req.resolve(text, toolCalls)
      }
      // 如果不是最终结果，继续等待
    }
    return
  }

  // 处理流式事件
  if (data.type === 'event' && data.event) {
    console.log('[Gateway Event] Type:', data.event, 'Payload keys:', data.payload ? Object.keys(data.payload) : 'none')

    const payload = data.payload

    // 授权请求事件
    if (data.event === 'exec.approval.requested') {
      console.log('[Approval] Received exec.approval.requested:', payload)
      handleApprovalRequest(payload)
      return
    }
    // 授权结果事件
    if (data.event === 'exec.approval.resolved') {
      console.log('[Approval] Received exec.approval.resolved:', payload)
      handleApprovalResolved(payload)
      return
    }

    if (!payload) return
    
    // 查找对应的 pending 请求（通过 sessionKey 匹配）
    console.log('[Gateway Event] Looking for sessionKey:', payload.sessionKey, 'runId:', payload.runId, 'Pending requests:', pendingRequests.size)
    let foundMatch = false
    for (const [reqId, req] of pendingRequests) {
      const { sessionKey, resolve, reject } = req
      // 使用 sessionKey 匹配（Gateway 会加上 agent:main: 前缀）
      const matched = payload.sessionKey && (payload.sessionKey === sessionKey || payload.sessionKey.endsWith(sessionKey) || sessionKey.endsWith(payload.sessionKey))
      console.log('[Gateway Event] Checking reqId:', reqId, 'stored sessionKey:', sessionKey, 'payload.sessionKey:', payload.sessionKey, 'matched:', matched, 'has onStream:', !!req.onStream)
      if (!matched) continue
      foundMatch = true

      // ── runId 绑定逻辑 ──────────────────────────────────────────────────────
      // OpenClaw 可能在同一 sessionKey 下启动多个 run（如 exec-approval-followup）。
      // 我们只跟踪第一个 run（主 run），后续 run 的 final/error 不能触发 resolve。
      const incomingRunId = payload.runId
      if (incomingRunId) {
        if (!req._boundRunId) {
          // 第一次见到 runId，绑定它
          req._boundRunId = incomingRunId
          console.log('[Gateway Event] Bound runId:', incomingRunId, 'for reqId:', reqId)
        } else if (req._boundRunId !== incomingRunId) {
          // 是另一个 run（如 exec-approval-followup），流式文本仍可合并，但不允许它 resolve/reject
          console.log('[Gateway Event] Ignoring finalizing event from secondary run:', incomingRunId, '(bound to:', req._boundRunId, ')')
          // 对于 agent 流式文本事件仍然继续处理（追加内容），但跳过 chat final/error
          if (data.event === 'chat' && (payload.state === 'final' || payload.state === 'error')) {
            break
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────
        
      // 处理 chat 事件
      if (data.event === 'chat') {
        console.log('[Gateway Chat] state:', payload.state, 'runId:', incomingRunId, 'has message:', !!payload.message)

        // 从 chat 事件的消息 content 数组中提取 toolCall 信息
        // OpenClaw 格式：content 数组中包含 {type: "toolCall", name, arguments, id} 项
        if (payload.message && Array.isArray(payload.message.content)) {
          const contentItems = payload.message.content
          const toolCallItems = contentItems.filter(c => c.type === 'toolCall')
          if (toolCallItems.length > 0) {
            console.log('[Gateway Chat] Found toolCall items in message.content:', toolCallItems.length)
            if (!req._toolCalls) req._toolCalls = []
            toolCallItems.forEach(tc => {
              const toolCallData = {
                id: tc.id,
                name: tc.name,
                // 兼容 OpenAI 格式
                function: {
                  name: tc.name,
                  arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {})
                },
                arguments: tc.arguments,
                result: tc.result || null,
                meta: tc.meta || null,
                // 保留原始数据
                _raw: tc
              }
              const existingIndex = req._toolCalls.findIndex(c => c.id === tc.id)
              if (existingIndex >= 0) {
                req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...toolCallData }
              } else {
                req._toolCalls.push(toolCallData)
              }
            })
            console.log('[Gateway Chat] Total toolCalls now:', req._toolCalls.length)
            if (req.onToolCalls) {
              req.onToolCalls(req._toolCalls)
            }
          }
        }

        // 也检查传统的 tool_calls 字段（有些版本在此传递）
        if (payload.message && (payload.message.tool_calls || payload.message.toolCalls)) {
          const chatToolCalls = payload.message.tool_calls || payload.message.toolCalls
          console.log('[Gateway Chat] Found tool_calls in message:', chatToolCalls.length, 'items')
          if (!req._toolCalls) req._toolCalls = []
          chatToolCalls.forEach(newCall => {
            const existingIndex = req._toolCalls.findIndex(c => c.id === newCall.id)
            if (existingIndex >= 0) {
              req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...newCall }
            } else {
              req._toolCalls.push(newCall)
            }
          })
          if (req.onToolCalls) {
            req.onToolCalls(req._toolCalls)
          }
        }

        if (payload.state === 'error' && payload.errorMessage) {
          console.log('[Gateway Chat] Error state:', payload.errorMessage)
          pendingRequests.delete(reqId)
          reject(new Error(payload.errorMessage))
        } else if (payload.state === 'final') {
          // 打印 final 消息的完整结构（调试用）
          if (payload.message) {
            const msg = payload.message
            const contentTypes = Array.isArray(msg.content) ? msg.content.map(c => c.type || typeof c) : typeof msg.content
            console.log('[Gateway Chat Final] Message keys:', Object.keys(msg), 'content types:', contentTypes, 'role:', msg.role)
          }
          // 从 final 消息中提取工具调用信息
          if (payload.message) {
            const msg = payload.message

            // 方法1: 从 content 数组中提取 toolCall 项（OpenClaw 标准格式）
            if (Array.isArray(msg.content)) {
              const toolCallItems = msg.content.filter(c => c.type === 'toolCall')
              if (toolCallItems.length > 0) {
                console.log('[Gateway Chat Final] Found toolCall items in content:', toolCallItems.length)
                if (!req._toolCalls) req._toolCalls = []
                toolCallItems.forEach(tc => {
                  const toolCallData = {
                    id: tc.id,
                    name: tc.name,
                    function: {
                      name: tc.name,
                      arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {})
                    },
                    arguments: tc.arguments,
                    result: tc.result || null,
                    _raw: tc
                  }
                  const existingIndex = req._toolCalls.findIndex(c => c.id === tc.id)
                  if (existingIndex >= 0) {
                    req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...toolCallData }
                  } else {
                    req._toolCalls.push(toolCallData)
                  }
                })
                if (req.onToolCalls) {
                  req.onToolCalls(req._toolCalls)
                }
              }
            }

            // 方法2: 检查传统的 tool_calls 顶层字段
            const msgToolCalls = msg.tool_calls || msg.toolCalls || msg.toolCallsInfo
            if (msgToolCalls && Array.isArray(msgToolCalls)) {
              console.log('[Gateway Chat Final] Found tool_calls in message:', msgToolCalls.length, 'items')
              if (!req._toolCalls) req._toolCalls = []
              msgToolCalls.forEach(newCall => {
                const existingIndex = req._toolCalls.findIndex(c => c.id === (newCall.id || newCall.toolCallId))
                if (existingIndex >= 0) {
                  req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...newCall }
                } else {
                  req._toolCalls.push(newCall)
                }
              })
              if (req.onToolCalls) {
                req.onToolCalls(req._toolCalls)
              }
            }
          }

          // 优先使用 agent 事件累积的文本
          if (req._accumulatedText) {
            const text = req._accumulatedText
            const toolCalls = req._toolCalls || []
            pendingRequests.delete(reqId)
            resolve(text, toolCalls)
          } else if (payload.message) {
            const msg = payload.message
            let text = ''
            if (Array.isArray(msg.content)) {
              text = msg.content.filter(c => c.type === 'text').map(c => c.text).join('')
            } else if (typeof msg.content === 'string') {
              text = msg.content
            } else if (payload.text) {
              text = payload.text
            } else {
              console.log('[Gateway Chat] No recognizable content format. msg:', JSON.stringify(msg))
            }

            const toolCalls = req._toolCalls || []
            pendingRequests.delete(reqId)
            resolve(text || '', toolCalls)
          } else {
            const text = req._accumulatedText || ''
            const toolCalls = req._toolCalls || []
            pendingRequests.delete(reqId)
            resolve(text, toolCalls)
          }
        }
      }
      
      // 处理 agent 事件（流式输出）
      else if (data.event === 'agent') {
        console.log('[Gateway Agent] Stream:', payload.stream, 'text length:', payload.data?.text?.length, 'data keys:', payload.data ? Object.keys(payload.data) : 'none', 'reqId:', reqId)
        // 记录非文本流事件的完整数据（用于调试工具调用）
        if (payload.stream !== 'assistant' && payload.stream !== 'lifecycle' && payload.stream !== 'text' && payload.stream !== 'chunk' && payload.stream !== 'delta') {
          console.log('[Gateway Agent] Non-text stream event, full data:', JSON.stringify(payload.data, null, 2).slice(0, 1000))
        }

        // 处理工具调用事件
        // 多种格式识别：
        // 1. stream: "item" 且 kind: "tool" — 标准 OpenClaw 格式
        // 2. stream: "item" 且 data.name 存在（可能是工具但未标记 kind）
        // 3. stream: "tool" — 某些版本使用此格式
        // 4. data.toolCallId 存在 — 带有工具调用 ID 的事件
        const isToolEvent = (
          (payload.stream === 'item' && payload.data?.kind === 'tool') ||
          (payload.stream === 'item' && payload.data?.name && payload.data?.kind !== 'message') ||
          (payload.stream === 'tool') ||
          (payload.data?.toolCallId)
        )

        if (isToolEvent) {
          console.log('[Gateway Agent] Tool item event:', payload.data.name, 'kind:', payload.data?.kind, 'phase:', payload.data?.phase, 'status:', payload.data?.status)
          console.log('[Gateway Agent] Tool meta:', JSON.stringify(payload.data.meta, null, 2))

          // 初始化工具调用数组
          if (!req._toolCalls) req._toolCalls = []

          // 查找或创建工具调用记录
          const toolCallId = payload.data.toolCallId || payload.data.itemId
          let existingIndex = req._toolCalls.findIndex(c => c.id === toolCallId)

          // 从 meta 中提取参数和结果（OpenClaw 格式）
          const meta = payload.data.meta || {}
          // 尝试多种可能的参数字段名
          const args = meta.params || meta.args || meta.arguments || meta.parameters || meta.input || meta.request
          // 尝试多种可能的结果字段名
          const result = meta.result || meta.output || meta.response || meta.data || meta.return
          
          console.log('[Gateway Agent] Extracted args:', args ? JSON.stringify(args).slice(0, 200) : 'none')
          console.log('[Gateway Agent] Extracted result:', result ? JSON.stringify(result).slice(0, 200) : 'none')
          
          const toolCallData = {
            id: toolCallId,
            name: payload.data.name,
            title: payload.data.title,
            meta: payload.data.meta,
            status: payload.data.status,
            phase: payload.data.phase,
            kind: payload.data.kind,
            startedAt: payload.data.startedAt,
            endedAt: payload.data.endedAt,
            // 兼容 OpenAI 格式的字段，方便 UI 展示
            function: {
              name: payload.data.name,
              arguments: typeof args === 'string' ? args : JSON.stringify(args || {})
            },
            result: typeof result === 'string' ? result : JSON.stringify(result || null)
          }

          if (existingIndex >= 0) {
            // 更新现有记录
            req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...toolCallData }
          } else {
            // 添加新记录
            req._toolCalls.push(toolCallData)
          }

          console.log('[Gateway Agent] Total toolCalls now:', req._toolCalls.length)
          if (req.onToolCalls) {
            console.log('[Gateway Agent] Calling onToolCalls callback')
            req.onToolCalls(req._toolCalls)
          } else {
            console.log('[Gateway Agent] No onToolCalls callback registered')
          }
        }

        // 流式文本在 payload.data.text 中（完整累积文本，不是增量）
        // 处理多种流类型: 'text', 'chunk', 'delta', 或者没有指定流类型的文本数据
        const streamType = payload.stream
        const hasText = payload.data && typeof payload.data.text === 'string'
        const hasContent = payload.data && typeof payload.data.content === 'string'
        const hasDelta = payload.data && typeof payload.data.delta === 'string'
        
        if (hasText || hasContent || hasDelta) {
          const text = payload.data.text || payload.data.content || payload.data.delta || ''
          req._accumulatedText = text

          // 优先从全局回调表获取（避免 HMR 导致的引用问题）
          const globalCallback = streamCallbacks.get(reqId)
          const callbackToUse = globalCallback || req.onStream

          console.log('[Gateway Agent] Checking onStream, text length:', text.length, 'streamType:', streamType, 'globalCallback:', typeof globalCallback, 'req.onStream:', typeof req.onStream, 'reqId:', reqId)
          if (typeof callbackToUse === 'function') {
            try {
              console.log('[Gateway Agent] About to call onStream for reqId:', reqId, 'using:', globalCallback ? 'globalCallback' : 'req.onStream')
              callbackToUse(text, req._accumulatedText)
              console.log('[Gateway Agent] onStream called successfully for reqId:', reqId)
            } catch (err) {
              console.error('[Gateway Agent] onStream error:', err)
            }
          } else {
            console.log('[Gateway Agent] onStream is not a function for reqId:', reqId, 'value:', callbackToUse)
          }

          // 尝试使用全局消息更新器（备用方案）
          console.log('[Gateway Agent] Checking globalMessageUpdater, _messageId:', req._messageId, 'updater type:', typeof globalMessageUpdater)
          if (req._messageId && typeof globalMessageUpdater === 'function') {
            try {
              console.log('[Gateway Agent] Calling globalMessageUpdater for messageId:', req._messageId)
              globalMessageUpdater(req._messageId, req._accumulatedText)
            } catch (err) {
              console.error('[Gateway Agent] globalMessageUpdater error:', err)
            }
          } else {
            console.log('[Gateway Agent] globalMessageUpdater not called, reason:', !req._messageId ? 'no _messageId' : 'updater not function')
          }
        } else {
          console.log('[Gateway Agent] No text content found in payload.data, keys:', payload.data ? Object.keys(payload.data) : 'no data')
        }

        // 处理传统的 tool_calls 格式（如果存在）
        if (payload.data && payload.data.tool_calls) {
          console.log('[Gateway Agent] Received traditional tool_calls:', payload.data.tool_calls.length, 'items')
          if (!req._toolCalls) req._toolCalls = []
          payload.data.tool_calls.forEach(newCall => {
            console.log('[Gateway Agent] Processing traditional tool_call:', newCall.function?.name || newCall.name, 'id:', newCall.id)
            const existingIndex = req._toolCalls.findIndex(c => c.id === newCall.id)
            if (existingIndex >= 0) {
              req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...newCall }
            } else {
              req._toolCalls.push(newCall)
            }
          })
          console.log('[Gateway Agent] Total toolCalls now:', req._toolCalls.length)
          if (req.onToolCalls) {
            console.log('[Gateway Agent] Calling onToolCalls callback')
            req.onToolCalls(req._toolCalls)
          } else {
            console.log('[Gateway Agent] No onToolCalls callback registered')
          }
        }

        // 流结束标记
        if (payload.stream === 'done' || payload.stream === 'complete' || payload.stream === 'end') {
          const text = req._accumulatedText || ''
          const toolCalls = req._toolCalls || []
          // console.log('[Gateway Agent] Stream complete, text length:', text.length)
          pendingRequests.delete(reqId)
          resolve(text, toolCalls)
        }
      }

      // 处理 item 事件（工具调用信息可能在 item 事件中）
      else if (data.event === 'item') {
        console.log('[Gateway Item] Received item event, payload keys:', Object.keys(payload))
        // 检查是否有工具调用信息
        if (payload.toolCalls || payload.tool_calls) {
          const toolCallsData = payload.toolCalls || payload.tool_calls
          console.log('[Gateway Item] Received tool_calls:', toolCallsData.length, 'items')
          if (!req._toolCalls) req._toolCalls = []
          toolCallsData.forEach(newCall => {
            console.log('[Gateway Item] Processing tool_call:', newCall.function?.name || newCall.name, 'id:', newCall.id)
            const existingIndex = req._toolCalls.findIndex(c => c.id === newCall.id)
            if (existingIndex >= 0) {
              req._toolCalls[existingIndex] = { ...req._toolCalls[existingIndex], ...newCall }
            } else {
              req._toolCalls.push(newCall)
            }
          })
          console.log('[Gateway Item] Total toolCalls now:', req._toolCalls.length)
          if (req.onToolCalls) {
            console.log('[Gateway Item] Calling onToolCalls callback')
            req.onToolCalls(req._toolCalls)
          } else {
            console.log('[Gateway Item] No onToolCalls callback registered')
          }
        }
      }

      break
    }
    
    if (!foundMatch) {
      console.log('[Gateway Event] No matching request found for sessionKey:', payload.sessionKey)
    }
  }
}

/**
 * 拒绝指定 ID 的请求
 */
function rejectRequest(id, error) {
  if (pendingRequests.has(id)) {
    const { reject } = pendingRequests.get(id)
    pendingRequests.delete(id)
    reject(error)
  }
}

/**
 * 通过 Gateway 发送消息并获取回复（支持流式回调）
 * @param {string} message - 完整消息内容（包含 system prompt）
 * @param {string} agent - agent 名称，默认 'main'
 * @param {Function} onStream - 流式回调函数，每次收到新内容时调用 (chunk, accumulated) => void
 * @param {Function} onToolCalls - 工具调用回调函数，当收到工具调用信息时调用 (toolCalls) => void
 * @param {string} systemPrompt - 可选的系统提示词（私聊模式使用）
 * @returns {Promise<{text: string, toolCalls: Array}>} AI 回复内容和工具调用信息
 */
export async function callOpenClawGateway(message, agent = 'main', onStream = null, onToolCalls = null, systemPrompt = null, targetMessageId = null) {
  console.log('[callOpenClawGateway] Called with onStream type:', typeof onStream, 'onToolCalls type:', typeof onToolCalls, 'targetMessageId:', targetMessageId)
  const socket = await getWebSocket()
  const id = `${Date.now()}-${++messageId}-${Math.random().toString(36).slice(2, 8)}`
  const sessionKey = `solo-company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // 如果有自定义系统提示词，添加到消息开头
  const finalMessage = systemPrompt ? `<system>\n${systemPrompt}\n</system>\n\n${message}` : message

  return new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      rejectRequest(id, new Error('Request timeout (1800s)'))
    }, 1800000)

    // 将 onStream 注册到全局回调表（避免 HMR 导致的引用问题）
    if (onStream) {
      streamCallbacks.set(id, onStream)
      console.log('[callOpenClawGateway] onStream registered in global callbacks, id:', id)
    }

    // 存储请求（包含 sessionKey 用于匹配 Gateway 返回的 event）
    // 注意：resolve 在外部 delete(reqId) 之后才调用，所以不能再从 Map 里取 toolCalls
    // 需要在调用 resolve 前把 _toolCalls 一并传进来
    const reqEntry = {
      sessionKey,
      onStream,
      onToolCalls,
      _accumulatedText: '',
      _toolCalls: [],
      _messageId: targetMessageId,
      resolve: (text, toolCalls) => {
        // 清理全局回调
        streamCallbacks.delete(id)
        clearTimeout(timeout)
        clearActiveRequestId()
        resolve({
          text: text || '',
          toolCalls: toolCalls || []
        })
      },
      reject: (err) => {
        // 清理全局回调
        streamCallbacks.delete(id)
        clearTimeout(timeout)
        clearActiveRequestId()
        reject(err)
      }
    }
    pendingRequests.set(id, reqEntry)
    console.log('[callOpenClawGateway] Request stored, id:', id, 'sessionKey:', sessionKey, 'onStream type:', typeof onStream, 'onToolCalls type:', typeof onToolCalls, 'pendingRequests size:', pendingRequests.size)

    // 设置当前活动请求 ID
    setActiveRequestId(id)

    // 发送消息到 Gateway
    // openclaw Gateway WebSocket 协议格式
    const payload = {
      type: 'req',
      id,
      method: 'chat.send',
      params: {
        message: finalMessage,
        sessionKey,
        idempotencyKey: id
      }
    }

    socket.send(JSON.stringify(payload))
  })
}

/**
 * 检查 Gateway 是否可用（HTTP 快速探测，避免 WebSocket 超时阻塞界面）
 */
export async function checkGatewayStatus() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500) // 最多等 1.5 秒
    const response = await fetch(`${config.GATEWAY_HTTP_URL}/`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    })
    clearTimeout(timeout)
    // no-cors 模式下无法读取 response 状态，只要没抛异常就算可用
    return true
  } catch (err) {
    // 连接拒绝或超时，均视为不可用
    return false
  }
}

/**
 * 关闭 WebSocket 连接
 */
export function closeGatewayConnection() {
  if (ws) {
    ws.close()
    ws = null
  }
}

/**
 * 通过 HTTP API 调用（兼容 OpenAI 格式）
 */
export async function callOpenClawHTTP(message, agent = 'main') {
  const token = getToken()
  if (!token) {
    throw new Error('Token not set. Please configure OpenClaw Gateway token.')
  }

  const url = `${config.GATEWAY_HTTP_URL}/v1/chat/completions`
  console.log('[OpenClaw HTTP] Calling:', url)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: agent,
        messages: [
          { role: 'user', content: message }
        ],
        stream: false
      }),
      signal: AbortSignal.timeout(600000)
    })

    console.log('[OpenClaw HTTP] Response status:', res.status)

    if (!res.ok) {
      const errText = await res.text().catch(() => '{}')
      console.error('[OpenClaw HTTP] Error response:', errText)
      let errMsg = `Gateway Error ${res.status}`
      try {
        const errJson = JSON.parse(errText)
        errMsg = errJson.error?.message || errJson.error || errMsg
      } catch {
        if (errText) errMsg += `: ${errText}`
      }
      throw new Error(errMsg)
    }

    const data = await res.json()
    console.log('[OpenClaw HTTP] Response data:', data)
    
    // OpenAI 格式: choices[0].message.content
    return data.choices?.[0]?.message?.content || 
           data.payloads?.[0]?.text || 
           data.text || 
           data.content || 
           ''
  } catch (err) {
    console.error('[OpenClaw HTTP] Request failed:', err)
    throw err
  }
}

/**
 * 测试 Gateway 连接（用于调试）
 */
export async function testGatewayConnection() {
  const results = {
    ws: null,
    http: null,
    token: getToken() ? 'set' : 'not set'
  }
  
  // 测试 WebSocket
  try {
    const wsUrl = `${config.GATEWAY_WS_URL}?token=${getToken()}`
    const testWs = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
      testWs.onopen = () => {
        results.ws = 'connected'
        testWs.close()
        resolve()
      }
      testWs.onerror = (e) => {
        results.ws = 'error'
        reject(e)
      }
      testWs.onclose = (e) => {
        if (!results.ws) results.ws = `closed (code: ${e.code})`
        resolve()
      }
      setTimeout(() => {
        results.ws = 'timeout'
        testWs.close()
        resolve()
      }, 5000)
    })
  } catch (e) {
    results.ws = results.ws || 'failed'
  }
  
  // 测试 HTTP
  try {
    const res = await fetch(`${config.GATEWAY_HTTP_URL}/v1/models`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    results.http = `status ${res.status}`
    if (res.ok) {
      const data = await res.json()
      results.models = data.data?.map(m => m.id) || []
    }
  } catch (e) {
    results.http = `error: ${e.message}`
  }
  
  console.log('[OpenClaw] Connection test results:', results)
  return results
}
