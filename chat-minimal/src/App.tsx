import { useState, useEffect, useRef } from 'react'
import { Send, Settings, X } from 'lucide-react'
import {
  connectGateway,
  disconnectGateway,
  sendMessage,
  isConnected,
  getToken,
  setToken,
  getGatewayHost,
  setGatewayHost,
  subscribeToApproval,
  getCurrentApproval,
  approveRequest,
  rejectApproval
} from './services/openclawGateway'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [gatewayHost, setGatewayHostState] = useState(getGatewayHost())
  const [token, setTokenState] = useState(getToken())
  const [currentApproval, setCurrentApproval] = useState(getCurrentApproval())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingMessageId = useRef<string | null>(null)

  useEffect(() => {
    connectGateway(
      handleIncomingMessage,
      () => setConnected(true),
      () => setConnected(false)
    )
    
    return subscribeToApproval(setCurrentApproval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleIncomingMessage(data: any) {
    if (data.type === 'stream.chunk') {
      const chunk = data.payload?.text || ''
      
      if (!streamingMessageId.current) {
        streamingMessageId.current = `assistant-${Date.now()}`
        setMessages(prev => [...prev, {
          id: streamingMessageId.current!,
          role: 'assistant',
          content: chunk,
          timestamp: Date.now()
        }])
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId.current
            ? { ...msg, content: msg.content + chunk }
            : msg
        ))
      }
    } else if (data.type === 'res') {
      // Complete response
      const content = data.result?.text || JSON.stringify(data.result)
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: Date.now()
      }])
      streamingMessageId.current = null
    }
  }

  async function handleSend() {
    if (!input.trim() || !isConnected()) return
    
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMsg])
    setInput('')
    streamingMessageId.current = null
    
    sendMessage(input.trim(), handleIncomingMessage)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSaveSettings() {
    setGatewayHost(gatewayHost)
    setToken(token)
    setShowSettings(false)
    // Reconnect with new settings
    disconnectGateway()
    setTimeout(() => {
      connectGateway(
        handleIncomingMessage,
        () => setConnected(true),
        () => setConnected(false)
      )
    }, 500)
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">OC</span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">OpenClaw Chat</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                connected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {connected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">开始与 OpenClaw 对话</p>
              <p className="text-xs mt-1">输入消息并按 Enter 发送</p>
            </div>
          )}
          
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !connected}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">发送</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gateway 地址
                </label>
                <input
                  type="text"
                  value={gatewayHost}
                  onChange={e => setGatewayHostState(e.target.value)}
                  placeholder="127.0.0.1:18789"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setTokenState(e.target.value)}
                  placeholder="输入访问令牌"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                保存并重新连接
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      {currentApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">授权请求</h3>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-48">
                {JSON.stringify(currentApproval.request, null, 2)}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approveRequest(currentApproval.id)}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                批准
              </button>
              <button
                onClick={() => rejectApproval(currentApproval.id)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
