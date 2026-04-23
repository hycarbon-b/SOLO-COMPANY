import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Send, Terminal, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  getGatewayConfig,
  getToken,
  checkGatewayStatus,
  callOpenClawGateway,
  getWsReadyState,
  getWsAuthenticated,
  getPendingRequestCount,
  closeGatewayConnection,
} from '../../services/openclawGateway';

type StatusLevel = 'unknown' | 'checking' | 'ok' | 'error';

interface LogEntry {
  time: string;
  level: 'info' | 'success' | 'error' | 'stream';
  text: string;
}

export function GatewayStatusPanel() {
  const [httpStatus, setHttpStatus] = useState<StatusLevel>('unknown');
  const [wsStatus, setWsStatus] = useState<StatusLevel>('unknown');
  const [checking, setChecking] = useState(false);
  const [testMsg, setTestMsg] = useState('你好，简短回复一下');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  const cfg = getGatewayConfig();
  const token = getToken();
  const tokenDisplay = token ? token.slice(0, 8) + '...' + token.slice(-4) : '（未设置）';

  const addLog = (level: LogEntry['level'], text: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [...prev.slice(-200), { time, level, text }]);
  };

  // 注入原始消息监听（调试用）
  useEffect(() => {
    (window as any).__ocRawListener = (data: any) => {
      const evt = data.event || data.type || '?'
      const state = data.payload?.state || data.payload?.stream || ''
      const textLen = data.payload?.data?.text?.length ?? ''
      const sk = data.payload?.sessionKey ? data.payload.sessionKey.slice(-8) : ''
      addLog('info', `[WS] event=${evt}${state ? ' state=' + state : ''}${textLen !== '' ? ' textLen=' + textLen : ''}${sk ? ' sk=...' + sk : ''}`)
    }
    return () => { delete (window as any).__ocRawListener }
  }, [])

  // 轮询 WS 状态
  useEffect(() => {
    const timer = setInterval(() => {
      const state = getWsReadyState();
      const auth = getWsAuthenticated();
      setPendingCount(getPendingRequestCount());
      if (state === null) {
        setWsStatus('unknown');
      } else if (state === WebSocket.OPEN && auth) {
        setWsStatus('ok');
      } else if (state === WebSocket.CONNECTING) {
        setWsStatus('checking');
      } else {
        setWsStatus('error');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 自动滚动日志
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  const handleCheckHttp = async () => {
    setChecking(true);
    setHttpStatus('checking');
    addLog('info', `HTTP 探测 ${cfg.GATEWAY_HTTP_URL} ...`);
    const ok = await checkGatewayStatus();
    setHttpStatus(ok ? 'ok' : 'error');
    addLog(ok ? 'success' : 'error', ok ? 'HTTP 连接正常' : 'HTTP 连接失败');
    setChecking(false);
  };

  const handleDisconnect = () => {
    closeGatewayConnection();
    setWsStatus('unknown');
    addLog('info', 'WebSocket 已断开');
  };

  const handleSendTest = async () => {
    if (!testMsg.trim() || sending) return;
    setSending(true);
    addLog('info', `发送消息："${testMsg.trim()}"`);
    try {
      const { text } = await callOpenClawGateway(
        testMsg.trim(),
        (chunk, _accumulated) => {
          addLog('stream', chunk);
        }
      );
      addLog('success', `回复完成，共 ${text.length} 字`);
    } catch (e: any) {
      addLog('error', `错误：${e?.message || String(e)}`);
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (s: StatusLevel) => {
    if (s === 'ok') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    if (s === 'checking') return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  const statusLabel: Record<StatusLevel, string> = {
    unknown: '未检测',
    checking: '检测中...',
    ok: '连接正常',
    error: '连接失败',
  };

  const logColor: Record<LogEntry['level'], string> = {
    info: 'text-gray-400',
    success: 'text-green-400',
    error: 'text-red-400',
    stream: 'text-blue-300',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Wifi className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">OpenClaw Gateway 连接调试</p>
          <p className="text-xs text-gray-500">实时查看连接状态并发送测试消息</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Config info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Gateway URL</p>
            <p className="text-sm font-mono text-gray-800 break-all">{cfg.GATEWAY_HTTP_URL}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">WebSocket URL</p>
            <p className="text-sm font-mono text-gray-800 break-all">{cfg.GATEWAY_WS_URL}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Token</p>
            <p className="text-sm font-mono text-gray-800">{tokenDisplay}</p>
          </div>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* HTTP */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              {statusIcon(httpStatus)}
              <div>
                <p className="text-xs text-gray-500">HTTP 探测</p>
                <p className="text-sm font-medium text-gray-800">{statusLabel[httpStatus]}</p>
              </div>
            </div>
            <button
              onClick={handleCheckHttp}
              disabled={checking}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              检测
            </button>
          </div>

          {/* WS */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              {statusIcon(wsStatus)}
              <div>
                <p className="text-xs text-gray-500">WebSocket</p>
                <p className="text-sm font-medium text-gray-800">{statusLabel[wsStatus]}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={wsStatus === 'unknown'}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              断开
            </button>
          </div>

          {/* Pending */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-4">
            <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Terminal className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">等待中请求</p>
              <p className="text-sm font-medium text-gray-800">{pendingCount} 条</p>
            </div>
          </div>
        </div>

        {/* Test message */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">发送测试消息</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMsg}
              onChange={e => setTestMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendTest()}
              placeholder="输入测试消息..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
            <button
              onClick={handleSendTest}
              disabled={sending || !testMsg.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
              {sending ? '发送中' : '发送'}
            </button>
          </div>
        </div>

        {/* Log output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">日志输出</p>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              清空
            </button>
          </div>
          <div
            ref={logRef}
            className="bg-gray-900 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs space-y-1"
          >
            {logs.length === 0 ? (
              <p className="text-gray-600">暂无日志，点击"检测"或"发送"查看输出...</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 flex-shrink-0">{l.time}</span>
                  <span className={logColor[l.level]}>{l.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
