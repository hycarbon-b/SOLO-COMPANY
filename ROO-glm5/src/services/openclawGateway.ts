/**
 * OpenClaw Gateway WebSocket Service for React/TypeScript
 * Based on backend-demo implementation with proper connect handshake
 */

// Gateway 配置 - 从 .env 读取，使用默认值
const DEFAULT_GATEWAY_URL = 'ws://127.0.0.1:18789';
const DEFAULT_GATEWAY_KEY = 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3';
const STORAGE_KEY = 'openclaw-token';

// 获取 Gateway URL
function getGatewayWsUrl(): string {
  const envUrl = import.meta.env.VITE_OPENCLAW_GATEWAY_URL;
  if (envUrl) {
    return envUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
  }
  return DEFAULT_GATEWAY_URL;
}

// 获取 Gateway Key
function getGatewayKey(): string {
  return import.meta.env.VITE_OPENCLAW_GATEWAY_KEY || DEFAULT_GATEWAY_KEY;
}

const GATEWAY_WS_URL = getGatewayWsUrl();
const GATEWAY_KEY = getGatewayKey();

// 输出配置信息用于调试
console.log('[OpenClaw Gateway] Configuration:', {
  wsUrl: GATEWAY_WS_URL,
  hasKey: !!GATEWAY_KEY,
  keyPreview: GATEWAY_KEY ? `${GATEWAY_KEY.substring(0, 8)}...` : '(none)',
  envUrl: import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '(not set)',
  envKey: import.meta.env.VITE_OPENCLAW_GATEWAY_KEY ? '(set)' : '(not set, using default)'
});

export function getToken(): string {
  return localStorage.getItem(STORAGE_KEY) || GATEWAY_KEY || '';
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// WebSocket 连接
let ws: WebSocket | null = null;
let messageId = 0;
let _authenticated = false;

const pendingRequests = new Map<string, {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  onStream?: (text: string) => void;
  _accumulatedText: string;
  sessionKey?: string;
  _boundRunId?: string;
}>();

// 全局流式回调（用于处理不在 pendingRequests 中的事件）
let globalStreamCallback: ((text: string) => void) | null = null;
let globalResolve: ((text: string) => void) | null = null;
let globalAccumulatedText = '';

/**
 * 获取或创建 WebSocket 连接（带认证握手）
 */
function getWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN && _authenticated) {
      resolve(ws);
      return;
    }

    if (ws && ws.readyState === WebSocket.CONNECTING) {
      const checkInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN && _authenticated) {
          clearInterval(checkInterval);
          resolve(ws);
        } else if (ws && ws.readyState === WebSocket.CLOSED) {
          clearInterval(checkInterval);
          reject(new Error('WebSocket connection failed'));
        }
      }, 100);
      return;
    }

    try {
      const token = getToken();
      const wsUrl = `${GATEWAY_WS_URL}?token=${token}`;
      console.log('[OpenClaw Gateway] Connecting to:', wsUrl);
      ws = new WebSocket(wsUrl);
      _authenticated = false;

      let connectRequestId: string | null = null;

      ws.onopen = () => {
        console.log('[OpenClaw Gateway] WebSocket opened, sending connect...');
        connectRequestId = `connect-${Date.now()}`;
        const connectMsg = {
          type: 'req',
          id: connectRequestId,
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 10,
            client: {
              id: 'roo-glm5-ui',
              version: '1.0.0',
              platform: 'web',
              mode: 'webchat'
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write', 'operator.admin'],
            auth: { token }
          }
        };
        ws!.send(JSON.stringify(connectMsg));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[OpenClaw Gateway] Received:', data.type, data.method || data.event || '', data.id || '');
          
          // 处理 connect 响应
          if (data.id === connectRequestId) {
            if (data.ok) {
              console.log('[OpenClaw Gateway] Authenticated successfully');
              _authenticated = true;
              resolve(ws!);
            } else {
              console.error('[OpenClaw Gateway] Authentication failed:', data.error);
              ws!.close();
              reject(new Error(data.error?.message || 'Authentication failed'));
            }
            return;
          }

          // 处理其他消息
          handleGatewayMessage(data);
        } catch (err) {
          console.error('[OpenClaw Gateway] Parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[OpenClaw Gateway] WebSocket error:', err);
        reject(new Error('WebSocket error'));
      };

      ws.onclose = (event) => {
        console.log('[OpenClaw Gateway] WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        ws = null;
        _authenticated = false;
        // 清理所有 pending 请求
        pendingRequests.forEach((req) => {
          req.reject(new Error(`WebSocket disconnected (code: ${event.code})`));
        });
        pendingRequests.clear();
      };
    } catch (err) {
      console.error('[OpenClaw Gateway] Connection error:', err);
      reject(err);
    }
  });
}

/**
 * 处理接收到的消息
 */
function handleGatewayMessage(data: any): void {
  // 处理响应 (type: "res", 带 id 的直接响应)
  const id = data.id;
  const req = id ? pendingRequests.get(id) : null;

  if (req && data.type === 'res') {
    if (!data.ok || data.error) {
      pendingRequests.delete(id);
      req.reject(new Error(data.error?.message || data.error || 'Request failed'));
      return;
    }
    
    // chat.send 的直接响应，等待事件流
    if (data.method === 'chat.send') {
      console.log('[OpenClaw Gateway] chat.send accepted, waiting for events...');
      return;
    }
    
    // 其他响应，直接处理
    const payload = data.payload;
    let text = '';
    if (typeof payload === 'string') {
      text = payload;
    } else if (payload?.text) {
      text = payload.text;
    } else if (payload?.content) {
      text = payload.content;
    } else if (payload?.result) {
      text = payload.result;
    }
    if (text) {
      pendingRequests.delete(id);
      req.resolve(text);
    }
    return;
  }

  // 处理流式事件
  if (data.type === 'event' && data.event) {
    const payload = data.payload;
    if (!payload) return;

    console.log('[OpenClaw Gateway] Event:', data.event, 'sessionKey:', payload.sessionKey, 'runId:', payload.runId);

    // 查找对应的 pending 请求（通过 sessionKey 匹配）
    let matchedReq: typeof req = null;
    let matchedReqId: string | null = null;

    for (const [reqId, r] of pendingRequests) {
      const sessionKey = r.sessionKey;
      // 使用 sessionKey 匹配（Gateway 会加上 agent:main: 前缀）
      const matched = payload.sessionKey && (
        payload.sessionKey === sessionKey ||
        payload.sessionKey.endsWith(sessionKey!) ||
        sessionKey?.endsWith(payload.sessionKey)
      );
      if (matched) {
        matchedReq = r;
        matchedReqId = reqId;
        break;
      }
    }

    // 如果没有找到匹配的请求，使用全局回调
    if (!matchedReq && globalStreamCallback) {
      console.log('[OpenClaw Gateway] Using global callback for event');
      
      // 处理 agent 事件（流式输出）
      if (data.event === 'agent') {
        const hasText = payload.data && typeof payload.data.text === 'string';
        const hasContent = payload.data && typeof payload.data.content === 'string';
        const hasDelta = payload.data && typeof payload.data.delta === 'string';
        
        if (hasText || hasContent || hasDelta) {
          const text = payload.data.text || payload.data.content || payload.data.delta || '';
          globalAccumulatedText = text;
          globalStreamCallback(text);
        }
      }
      
      // 处理 chat 事件
      if (data.event === 'chat' && payload.state === 'final') {
        let text = '';
        if (payload.message) {
          const msg = payload.message;
          if (Array.isArray(msg.content)) {
            text = msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
          } else if (typeof msg.content === 'string') {
            text = msg.content;
          } else if (payload.text) {
            text = payload.text;
          }
        }
        
        const finalText = globalAccumulatedText || text || '';
        if (globalResolve) {
          globalResolve(finalText);
          globalResolve = null;
          globalStreamCallback = null;
          globalAccumulatedText = '';
        }
      }
      
      return;
    }

    if (!matchedReq) {
      console.log('[OpenClaw Gateway] No matching request for event:', data.event);
      return;
    }

    // 处理 chat 事件
    if (data.event === 'chat') {
      console.log('[OpenClaw Gateway] Chat state:', payload.state, 'runId:', payload.runId);
      
      // runId 绑定逻辑
      const incomingRunId = payload.runId;
      if (incomingRunId) {
        if (!matchedReq._boundRunId) {
          matchedReq._boundRunId = incomingRunId;
        } else if (matchedReq._boundRunId !== incomingRunId) {
          // 是另一个 run，跳过 final/error
          if (payload.state === 'final' || payload.state === 'error') {
            return;
          }
        }
      }

      if (payload.state === 'error' && payload.errorMessage) {
        pendingRequests.delete(matchedReqId!);
        matchedReq.reject(new Error(payload.errorMessage));
      } else if (payload.state === 'final') {
        // 优先使用 agent 事件累积的文本
        if (matchedReq._accumulatedText) {
          pendingRequests.delete(matchedReqId!);
          matchedReq.resolve(matchedReq._accumulatedText);
        } else if (payload.message) {
          const msg = payload.message;
          let text = '';
          if (Array.isArray(msg.content)) {
            text = msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
          } else if (typeof msg.content === 'string') {
            text = msg.content;
          } else if (payload.text) {
            text = payload.text;
          }
          pendingRequests.delete(matchedReqId!);
          matchedReq.resolve(text || '');
        } else {
          pendingRequests.delete(matchedReqId!);
          matchedReq.resolve(matchedReq._accumulatedText || '');
        }
      }
    }
    
    // 处理 agent 事件（流式输出）
    else if (data.event === 'agent') {
      const hasText = payload.data && typeof payload.data.text === 'string';
      const hasContent = payload.data && typeof payload.data.content === 'string';
      const hasDelta = payload.data && typeof payload.data.delta === 'string';
      
      if (hasText || hasContent || hasDelta) {
        const text = payload.data.text || payload.data.content || payload.data.delta || '';
        matchedReq._accumulatedText = text;

        if (matchedReq.onStream) {
          try {
            matchedReq.onStream(text);
          } catch (err) {
            console.error('[OpenClaw Gateway] onStream error:', err);
          }
        }
      }
    }
  }
}

/**
 * 发送聊天消息到 OpenClaw Gateway
 */
export async function sendChatMessage(
  message: string,
  sessionKey?: string,
  onStream?: (text: string) => void
): Promise<string> {
  console.log('[OpenClaw Gateway] sendChatMessage called:', message.substring(0, 50));
  
  const socket = await getWebSocket();
  
  const id = `${Date.now()}-${++messageId}-${Math.random().toString(36).slice(2, 8)}`;
  const finalSessionKey = sessionKey || `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // 设置全局回调（用于处理不在 pendingRequests 中的事件）
  globalStreamCallback = onStream || null;
  globalAccumulatedText = '';
  
  return new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      globalResolve = null;
      globalStreamCallback = null;
      reject(new Error('Request timeout (180s)'));
    }, 180000);

    // 设置全局 resolve
    globalResolve = (text: string) => {
      clearTimeout(timeout);
      pendingRequests.delete(id);
      resolve(text);
    };

    pendingRequests.set(id, {
      resolve: (text) => {
        clearTimeout(timeout);
        globalResolve = null;
        globalStreamCallback = null;
        resolve(text);
      },
      reject: (err) => {
        clearTimeout(timeout);
        globalResolve = null;
        globalStreamCallback = null;
        reject(err);
      },
      onStream,
      _accumulatedText: '',
      sessionKey: finalSessionKey
    });

    // 发送消息 - message 是纯文本字符串
    const payload = {
      type: 'req',
      id,
      method: 'chat.send',
      params: {
        message: message,
        sessionKey: finalSessionKey,
        idempotencyKey: id
      }
    };

    socket.send(JSON.stringify(payload));
    console.log('[OpenClaw Gateway] Sent chat message:', id, 'sessionKey:', finalSessionKey);
  });
}

/**
 * 连接到 Gateway（简化版，用于外部调用）
 */
export function connectGateway(
  onMessage?: (data: any) => void,
  onConnect?: () => void,
  onError?: (error: any) => void
): void {
  getWebSocket()
    .then(() => {
      if (onConnect) onConnect();
    })
    .catch((err) => {
      if (onError) onError(err);
    });
}

/**
 * 断开连接
 */
export function disconnectGateway(): void {
  if (ws) {
    ws.close();
    ws = null;
    _authenticated = false;
  }
}

/**
 * 检查是否已连接
 */
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN && _authenticated;
}

/**
 * 检查 Gateway 是否可用
 */
export async function checkGatewayStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const httpUrl = GATEWAY_WS_URL.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
    await fetch(`${httpUrl}/`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * 关闭 WebSocket 连接
 */
export function closeGatewayConnection(): void {
  disconnectGateway();
}
