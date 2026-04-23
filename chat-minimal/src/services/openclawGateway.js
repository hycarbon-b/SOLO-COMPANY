/**
 * Minimal OpenClaw Gateway WebSocket Service
 * Only includes core chat functionality
 */

const DEFAULT_GATEWAY_HOST = '127.0.0.1:18789'
const STORAGE_KEY = 'openclaw-token'
const GATEWAY_HOST_STORAGE_KEY = 'openclaw-gateway-host'

export function getGatewayHost() {
  return localStorage.getItem(GATEWAY_HOST_STORAGE_KEY) || DEFAULT_GATEWAY_HOST
}

export function setGatewayHost(host) {
  const cleaned = (host || '').trim()
    .replace(/^wss?:\/\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  if (cleaned) {
    localStorage.setItem(GATEWAY_HOST_STORAGE_KEY, cleaned)
  } else {
    localStorage.setItem(GATEWAY_HOST_STORAGE_KEY, DEFAULT_GATEWAY_HOST)
  }
}

export function getToken() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// ===== Approval State =====
let currentApproval = null
let approvalSubscribers = []

export function subscribeToApproval(callback) {
  approvalSubscribers.push(callback)
  callback(currentApproval)
  return () => {
    approvalSubscribers = approvalSubscribers.filter(cb => cb !== callback)
  }
}

export function getCurrentApproval() {
  return currentApproval
}

export function approveRequest(approvalId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({
    type: 'req',
    id: `approval-${Date.now()}`,
    method: 'exec.approval.resolve',
    params: { id: approvalId, decision: 'allow-once' }
  }))
  currentApproval = null
  notifyApprovalSubscribers()
}

export function rejectApproval(approvalId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({
    type: 'req',
    id: `approval-${Date.now()}`,
    method: 'exec.approval.resolve',
    params: { id: approvalId, decision: 'deny' }
  }))
  currentApproval = null
  notifyApprovalSubscribers()
}

function notifyApprovalSubscribers() {
  approvalSubscribers.forEach(cb => cb(currentApproval))
}

// ===== WebSocket Connection =====
let ws = null
let messageId = 0
const messageHandlers = new Map()

export function connectGateway(onMessage, onConnect, onError) {
  if (ws && ws.readyState === WebSocket.OPEN) return
  
  const host = getGatewayHost()
  const token = getToken()
  const wsUrl = `ws://${host}/?token=${token}`
  
  console.log('[OpenClaw] Connecting to:', wsUrl)
  
  ws = new WebSocket(wsUrl)
  
  ws.onopen = () => {
    console.log('[OpenClaw] Connected')
    if (onConnect) onConnect()
  }
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      // Handle approval requests
      if (data.type === 'gateway.event' && data.event === 'exec.approval.request') {
        currentApproval = {
          id: data.payload.id,
          request: data.payload.request
        }
        notifyApprovalSubscribers()
        return
      }
      
      // Handle streaming messages
      if (data.type === 'stream.chunk') {
        if (onMessage) onMessage(data)
        return
      }
      
      // Handle regular responses
      if (data.type === 'res' && data.id) {
        const handler = messageHandlers.get(data.id)
        if (handler) {
          handler(data)
          messageHandlers.delete(data.id)
        }
      }
    } catch (err) {
      console.error('[OpenClaw] Parse error:', err)
    }
  }
  
  ws.onerror = (error) => {
    console.error('[OpenClaw] Error:', error)
    if (onError) onError(error)
  }
  
  ws.onclose = () => {
    console.log('[OpenClaw] Disconnected')
    ws = null
  }
}

export function disconnectGateway() {
  if (ws) {
    ws.close()
    ws = null
  }
}

export function sendMessage(content, onChunk) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[OpenClaw] Not connected')
    return
  }
  
  const id = `msg-${++messageId}-${Date.now()}`
  
  if (onChunk) {
    messageHandlers.set(id, onChunk)
  }
  
  const msg = {
    type: 'req',
    id,
    method: 'chat.send',
    params: { text: content }
  }
  
  ws.send(JSON.stringify(msg))
  console.log('[OpenClaw] Sent:', content)
}

export function isConnected() {
  return ws && ws.readyState === WebSocket.OPEN
}
