/**
 * OpenClaw Gateway WebSocket Service for React/TypeScript
 * Implements proper JSON-RPC over WebSocket protocol with handshake
 */

// Helper function for logging
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const prefix = level === 'ERROR' ? '✗' : level === 'WARN' ? '⚠' : 'ℹ'
  console.log(`[${prefix}] ${message}`)
}

// Gateway configuration from environment variables
const GATEWAY_WS_URL = import.meta.env.VITE_OPENCLAW_WS_URL || 'ws://127.0.0.1:18789'
const DEFAULT_GATEWAY_TOKEN = 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3'
const STORAGE_KEY = 'openclaw-token'

let ws: WebSocket | null = null
let messageId = 0
let isConnected = false
let isConnecting = false
let connectResolve: (() => void) | null = null
let connectReject: ((error: Error) => void) | null = null

const pendingRequests = new Map<string, {
  resolve: (value: any) => void
  reject: (reason?: any) => void
  onStream?: (text: string, accumulated: string) => void
  _accumulatedText?: string
}>()

/**
 * Generate unique message ID
 */
function generateId(): string {
  return `req_${Date.now()}_${++messageId}`
}

/**
 * Send JSON-RPC request frame
 */
function sendRequest(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not connected'))
      return
    }

    const id = generateId()
    const frame = {
      type: 'req',
      id,
      method,
      params
    }

    console.log('[OpenClaw] Sending request:', method, params)
    
    pendingRequests.set(id, {
      resolve,
      reject,
      _accumulatedText: ''
    })

    try {
      ws.send(JSON.stringify(frame))
    } catch (err) {
      pendingRequests.delete(id)
      reject(err)
    }
  })
}

/**
 * Perform WebSocket handshake with connect challenge
 */
async function performHandshake(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ws) {
      reject(new Error('WebSocket not initialized'))
      return
    }

    connectResolve = () => resolve()
    connectReject = (error) => reject(error)

    // Wait for connect.challenge event with short timeout
    const challengeTimeout = setTimeout(() => {
      log('[OpenClaw] No challenge received - Gateway may use simplified mode, proceeding...', 'WARN')
      isConnected = true
      isConnecting = false
      
      // Restore original message handler
      if (ws) {
        ws.onmessage = (evt) => {
          try {
            const msgData = JSON.parse(evt.data)
            handleGatewayMessage(msgData)
          } catch (err) {
            console.error('[OpenClaw] Parse error:', err)
          }
        }
      }
      
      if (connectResolve) {
        connectResolve()
      }
    }, 3000)  // Only wait 3 seconds for challenge

    const originalOnMessage = ws.onmessage
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[OpenClaw] Received during handshake:', data.type, data.event)

        // Handle connect.challenge
        if (data.type === 'event' && data.event === 'connect.challenge') {
          clearTimeout(challengeTimeout)
          console.log('[OpenClaw] Received challenge, sending connect request...')

          // Send connect request with CORRECT constant values
          const connectFrame = {
            type: 'req',
            id: generateId(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'cli',  // Use "cli" as the standard client ID
                version: '1.0.0',
                platform: 'web',
                mode: 'operator'  // MUST be "operator" or "node"
              },
              role: 'operator',
              scopes: ['operator.read', 'operator.write'],
              caps: [],
              commands: [],
              permissions: {},
              auth: { token },
              locale: 'zh-CN',
              userAgent: 'LIGNMA-Web/1.0.0'
            }
          }

          ws!.send(JSON.stringify(connectFrame))
          return
        }

        // Handle connect response
        if (data.type === 'res' && data.method === 'connect') {
          if (data.ok && data.payload?.type === 'hello-ok') {
            console.log('[OpenClaw] Handshake successful! Protocol:', data.payload.protocol)
            isConnected = true
            isConnecting = false
            
            // Restore original message handler
            ws!.onmessage = (evt) => {
              try {
                const msgData = JSON.parse(evt.data)
                handleGatewayMessage(msgData)
              } catch (err) {
                console.error('[OpenClaw] Parse error:', err)
              }
            }

            if (connectResolve) {
              connectResolve()
            }
            return
          } else {
            clearTimeout(challengeTimeout)
            const error = new Error(data.error?.message || 'Connect failed')
            isConnecting = false
            if (connectReject) {
              connectReject(error)
            }
            return
          }
        }

        // For other messages during handshake, queue them
        handleGatewayMessage(data)
      } catch (err) {
        console.error('[OpenClaw] Handshake error:', err)
        clearTimeout(challengeTimeout)
        if (connectReject) {
          connectReject(err as Error)
        }
      }
    }
  })
}

/**
 * Get or create WebSocket connection with proper handshake
 */
export async function getConnection(): Promise<WebSocket> {
  if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
    return ws
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (isConnected && ws?.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval)
          resolve(ws!)
        } else if (!isConnecting) {
          clearInterval(checkInterval)
          reject(new Error('Connection attempt failed'))
        }
      }, 100)
    })
  }

  isConnecting = true
  isConnected = false

  return new Promise(async (resolve, reject) => {
    try {
      // Get token from localStorage, or use default from env
      const storedToken = localStorage.getItem(STORAGE_KEY)
      const token = storedToken || import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN || DEFAULT_GATEWAY_TOKEN
      
      // Add token as query parameter to WebSocket URL (required by OpenClaw Gateway)
      const wsUrlWithToken = `${GATEWAY_WS_URL}?token=${token}`
      console.log('[OpenClaw] Connecting to:', wsUrlWithToken.replace(token, '***'))
      ws = new WebSocket(wsUrlWithToken)

      ws.onopen = async () => {
        console.log('[OpenClaw] WebSocket opened, sending connect request immediately...')
        
        // Get token from localStorage, or use default from env
        const storedToken = localStorage.getItem(STORAGE_KEY)
        const token = storedToken || import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN || DEFAULT_GATEWAY_TOKEN
        
        try {
          // Send connect request IMMEDIATELY (don't wait for challenge)
          const connectId = generateId()
          const connectRequest = {
            type: 'req',
            id: connectId,
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'cli',  // Use "cli" as the standard client ID
                version: '1.0.0',
                platform: 'web',
                mode: 'operator'  // MUST be "operator" or "node"
              },
              role: 'operator',
              scopes: ['operator.read', 'operator.write'],
              caps: [],
              commands: [],
              permissions: {},
              auth: { token },
              locale: 'zh-CN',
              userAgent: 'LIGNMA-Web/1.0.0'
            }
          }
          
          console.log('[OpenClaw] Sending connect request...')
          ws!.send(JSON.stringify(connectRequest))
          
          // Wait for hello-ok response
          const connectTimeout = setTimeout(() => {
            console.error('[OpenClaw] Connect timeout - no response received')
            isConnecting = false
            isConnected = false
            ws?.close()
            ws = null
            if (connectReject) {
              connectReject(new Error('Connect timeout'))
            }
          }, 10000)
          
          const originalOnMessage = ws!.onmessage
          ws!.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              console.log('[OpenClaw] Received during connect:', data.type, data.id ? `(id: ${data.id})` : '')
              
              // Handle connect response
              if (data.type === 'res' && data.id === connectId) {
                clearTimeout(connectTimeout)
                
                if (data.ok && data.payload?.type === 'hello-ok') {
                  console.log('[OpenClaw] ✓ Connect successful! Protocol:', data.payload.protocol)
                  isConnected = true
                  isConnecting = false
                  
                  // Restore message handler for normal operation
                  ws!.onmessage = (evt) => {
                    try {
                      const msgData = JSON.parse(evt.data)
                      handleGatewayMessage(msgData)
                    } catch (err) {
                      console.error('[OpenClaw] Parse error:', err)
                    }
                  }
                  
                  if (connectResolve) {
                    connectResolve()
                  }
                  return
                } else {
                  console.error('[OpenClaw] ✗ Connect failed:', data.error)
                  isConnecting = false
                  isConnected = false
                  ws?.close()
                  ws = null
                  if (connectReject) {
                    connectReject(new Error(data.error?.message || 'Connect failed'))
                  }
                  return
                }
              }
              
              // Handle other messages
              handleGatewayMessage(data)
            } catch (err) {
              console.error('[OpenClaw] Message parse error:', err)
            }
          }
        } catch (err) {
          console.error('[OpenClaw] Connect error:', err)
          isConnecting = false
          isConnected = false
          ws?.close()
          ws = null
          if (connectReject) {
            connectReject(err as Error)
          }
        }
      }

      ws.onerror = (err) => {
        console.error('[OpenClaw] WebSocket Error:', err)
        isConnecting = false
        isConnected = false
        ws = null
        reject(new Error('WebSocket connection failed'))
      }

      ws.onclose = () => {
        console.log('[OpenClaw] WebSocket closed')
        isConnected = false
        isConnecting = false
        ws = null
        
        // Reject all pending requests
        pendingRequests.forEach((req) => {
          req.reject(new Error('WebSocket disconnected'))
        })
        pendingRequests.clear()
      }
    } catch (err) {
      console.error('[OpenClaw] Connection error:', err)
      isConnecting = false
      isConnected = false
      ws = null
      reject(err)
    }
  })
}

/**
 * Handle messages from Gateway
 */
function handleGatewayMessage(data: any) {
  console.log('[OpenClaw] Received message:', data.type, data.id ? `(id: ${data.id})` : '')

  // Handle response with id
  if (data.type === 'res' && data.id && pendingRequests.has(data.id)) {
    const req = pendingRequests.get(data.id)!
    
    if (!data.ok || data.error) {
      pendingRequests.delete(data.id)
      console.error('[OpenClaw] Request failed:', data.error)
      req.reject(new Error(data.error?.message || 'Request failed'))
      return
    }

    console.log('[OpenClaw] Response received for:', data.id)
    
    // For agent.run, the response is just an ack
    // Actual content comes via events
    if (data.payload?.status === 'accepted') {
      console.log('[OpenClaw] Agent run accepted, waiting for events...')
      // Don't resolve yet, wait for streaming events
      return
    }

    // For other methods, resolve immediately
    pendingRequests.delete(data.id)
    req.resolve(data.payload)
    return
  }

  // Handle streaming events
  if (data.type === 'event') {
    handleEvent(data)
    return
  }
}

/**
 * Handle gateway events (streaming responses)
 */
function handleEvent(data: any) {
  const eventType = data.event || data.type
  
  console.log('[Gateway Event] Type:', eventType, 'Payload keys:', Object.keys(data.payload || {}))

  // Handle agent streaming events
  if (eventType === 'agent' || data.payload?.type === 'agent') {
    const payload = data.payload || data
    
    // Extract runId to match with pending request
    const runId = payload.runId || payload.id
    
    // Look for text content in various formats
    let textChunk = ''
    
    if (payload.text) {
      textChunk = payload.text
    } else if (payload.content) {
      textChunk = payload.content
    } else if (payload.delta) {
      textChunk = payload.delta
    } else if (payload.data?.text) {
      textChunk = payload.data.text
    } else if (payload.data?.content) {
      textChunk = payload.data.content
    }

    console.log('[Gateway Agent] Stream:', payload.status || 'unknown', 'text length:', textChunk.length)

    if (textChunk && runId) {
      // Find matching pending request by runId or iterate all
      for (const [id, req] of pendingRequests.entries()) {
        if (req.onStream) {
          req._accumulatedText = (req._accumulatedText || '') + textChunk
          req.onStream(textChunk, req._accumulatedText)
          
          // If this is the final chunk, resolve the promise
          if (payload.status === 'completed' || payload.status === 'done' || payload.final) {
            console.log('[MainContent] Streaming complete')
            pendingRequests.delete(id)
            req.resolve(req._accumulatedText)
          }
          break
        }
      }
    }
    
    // Handle completion without streaming
    if ((payload.status === 'completed' || payload.status === 'done') && !textChunk) {
      for (const [id, req] of pendingRequests.entries()) {
        if (req._accumulatedText) {
          pendingRequests.delete(id)
          req.resolve(req._accumulatedText)
        }
      }
    }
  }
}

/**
 * Send message to OpenClaw using chat.send method (correct API)
 */
export async function sendToOpenClaw(
  message: string,
  onStream?: (text: string, accumulated: string) => void
): Promise<string> {
  try {
    console.log('[MainContent] Sending message to OpenClaw:', message)
    
    // Ensure connection
    await getConnection()
    
    // Generate a session key for this conversation
    // Format: main:<channel>:<identifier>
    const sessionId = `webchat_${Date.now()}`
    const sessionKey = `main:webchat:${sessionId}`
    
    console.log('[MainContent] Using session:', { sessionId, sessionKey })
    
    // Use chat.send method with CORRECT params format
    const result = await sendRequest('chat.send', {
      sessionKey: sessionKey,
      message: message,
      timeoutMs: 60000
    })

    // If we got here without streaming, return the result
    if (result && typeof result === 'string') {
      console.log('[MainContent] Received response from OpenClaw:', result)
      return result
    }

    // If streaming, the promise will be resolved by event handlers
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout after 60 seconds'))
      }, 60000)

      // Store a reference that events can resolve
      const lastReqId = Array.from(pendingRequests.keys()).pop()
      if (lastReqId) {
        const req = pendingRequests.get(lastReqId)
        if (req) {
          req.onStream = onStream
          const originalResolve = req.resolve
          req.resolve = (value) => {
            clearTimeout(timeout)
            console.log('[MainContent] Received response from OpenClaw:', value)
            originalResolve(value)
          }
          req.reject = (reason) => {
            clearTimeout(timeout)
            reject(reason)
          }
        }
      }
    })
  } catch (error) {
    console.error('[MainContent] Error calling OpenClaw:', error)
    throw error
  }
}

/**
 * Check if OpenClaw is connected
 */
export function isOpenClawConnected(): boolean {
  return isConnected && ws?.readyState === WebSocket.OPEN
}

/**
 * Disconnect from OpenClaw
 */
export function disconnect(): void {
  if (ws) {
    ws.close()
    ws = null
    isConnected = false
    isConnecting = false
    pendingRequests.clear()
  }
}
