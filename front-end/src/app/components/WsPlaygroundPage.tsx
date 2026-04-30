import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Terminal, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
  Trash2, Wifi, WifiOff, Send, RotateCcw
} from 'lucide-react';
const uuid = () => crypto.randomUUID();

// ─── 常量 ────────────────────────────────────────────────────────────────────
const DEFAULT_URL   = 'ws://127.0.0.1:18789';
const DEFAULT_TOKEN = 'b2dacf6e5ad964021e5c0cbc2788b82e0d7f9ad2a3357bb3';

// ─── 消息日志条目 ─────────────────────────────────────────────────────────────
interface LogEntry {
  id: number;
  dir: 'SEND' | 'RECV' | 'SYS';
  ts: number;
  data: unknown;
  parseError?: boolean; // 原始文本解析失败
}

let _seq = 0;

// ─── 模板 ─────────────────────────────────────────────────────────────────────
const makeConnectReq = (token: string) => ({
  type: 'req', id: 'py-001', method: 'connect',
  params: {
    minProtocol: 3, maxProtocol: 10,
    client: { id: 'openclaw-control-ui', version: '1.0.0', platform: 'browser', mode: 'cli' },
    role: 'operator',
    scopes: ['operator.read', 'operator.write'],
    auth: { token },
  },
});

const TEMPLATES: { label: string; json: (token: string) => object }[] = [
  { label: 'connect（握手）', json: makeConnectReq },
  {
    label: 'chat.send',
    json: () => ({
      type: 'req', id: `chat-${uuid().slice(0, 8)}`, method: 'chat.send',
      params: { sessionKey: 'agent:main:main', message: 'Hello, world!', idempotencyKey: uuid() },
    }),
  },
  {
    label: 'session.list',
    json: () => ({ type: 'req', id: `sl-${uuid().slice(0, 8)}`, method: 'session.list', params: {} }),
  },
  {
    label: 'agent.restart',
    json: () => ({
      type: 'req', id: `ar-${uuid().slice(0, 8)}`, method: 'agent.restart',
      params: { agentKey: 'main' },
    }),
  },
  {
    label: 'ping',
    json: () => ({ type: 'req', id: `ping-${uuid().slice(0, 8)}`, method: 'ping', params: {} }),
  },
];

// ─── EntryRow ─────────────────────────────────────────────────────────────────
function EntryRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(entry.ts);
  const timeStr = `${ts.toLocaleTimeString('zh-CN', { hour12: false })}.${String(ts.getMilliseconds()).padStart(3, '0')}`;

  const borderColor =
    entry.dir === 'SEND' ? 'border-l-blue-500' :
    entry.dir === 'RECV' ? 'border-l-emerald-500' : 'border-l-yellow-500';

  const badge = entry.dir === 'SEND' ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300">
      <ArrowUp className="w-2.5 h-2.5" />SEND
    </span>
  ) : entry.dir === 'RECV' ? (
    <>
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300">
        <ArrowDown className="w-2.5 h-2.5" />RECV
      </span>
      {entry.parseError && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-400">RAW</span>
      )}
    </>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-900/40 text-yellow-400">SYS</span>
  );

  const d = entry.data as Record<string, unknown>;
  const summary = entry.dir === 'SYS'
    ? String(entry.data)
    : entry.dir === 'SEND'
      ? `${d?.method ?? '?'}  id=${String(d?.id ?? '')}`
      : entry.parseError
        ? String(entry.data).slice(0, 120)
        : `${d?.event ?? d?.method ?? d?.type ?? '?'}  ${d?.ok != null ? `ok=${d.ok}` : ''}`;

  return (
    <div className={`border-b border-gray-800/70 last:border-0 border-l-2 ${borderColor}`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/50 transition-colors text-left group"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-gray-600 flex-shrink-0 tabular-nums text-[10px]">{timeStr}</span>
        {badge}
        <span className="flex-1 text-[11px] font-mono truncate text-gray-400">{summary}</span>
        <span className="text-gray-700 group-hover:text-gray-500 flex-shrink-0">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {open && (
        <pre className="px-4 pb-3 pt-1 text-[10px] font-mono text-gray-300 bg-gray-950/50 overflow-x-auto whitespace-pre-wrap break-all leading-5 select-text">
          {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function WsPlaygroundPage() {
  const [url,   setUrl]   = useState(DEFAULT_URL);
  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [editor, setEditor]   = useState(() => JSON.stringify(makeConnectReq(DEFAULT_TOKEN), null, 2));
  const [tplIdx, setTplIdx]   = useState(0);
  const wsRef   = useRef<WebSocket | null>(null);
  const logRef  = useRef<HTMLDivElement>(null);

  // auto-scroll
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries]);

  const addEntry = useCallback((dir: 'SEND' | 'RECV' | 'SYS', data: unknown) => {
    setEntries(prev => {
      const next = [...prev, { id: ++_seq, dir, ts: Date.now(), data }];
      return next.length > 600 ? next.slice(-600) : next;
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setStatus('connecting');
    addEntry('SYS', `正在连接 ${url} …`);

    const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      addEntry('SYS', '✅ 连接成功');
    };

    ws.onmessage = (e) => {
      try { addEntry('RECV', JSON.parse(e.data as string)); }
      catch {
        setEntries(prev => {
          const entry: LogEntry = { id: ++_seq, dir: 'RECV', ts: Date.now(), data: e.data, parseError: true };
          const next = [...prev, entry];
          return next.length > 600 ? next.slice(-600) : next;
        });
      }
    };

    ws.onclose = (e) => {
      setStatus('disconnected');
      addEntry('SYS', `🔌 连接关闭 code=${e.code}${e.reason ? ' reason=' + e.reason : ''}`);
      wsRef.current = null;
    };

    ws.onerror = () => addEntry('SYS', '❌ WebSocket 错误');
  }, [url, token, addEntry]);

  const disconnect = useCallback(() => {
    wsRef.current?.close(1000, 'user closed');
  }, []);

  const sendMsg = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addEntry('SYS', '⚠️ 未连接，无法发送');
      return;
    }
    try {
      const parsed = JSON.parse(editor);
      wsRef.current.send(JSON.stringify(parsed));
      addEntry('SEND', parsed);
    } catch {
      addEntry('SYS', '⚠️ JSON 格式错误，请检查编辑器内容');
    }
  }, [editor, addEntry]);

  // template change
  const handleTplChange = (idx: number) => {
    setTplIdx(idx);
    setEditor(JSON.stringify(TEMPLATES[idx].json(token), null, 2));
  };

  // Ctrl+Enter to send
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendMsg(); }
  };

  const connBtnLabel =
    status === 'disconnected' ? '连接' :
    status === 'connecting'   ? '连接中…' : '断开';

  const statusDot =
    status === 'connected'    ? 'bg-emerald-400' :
    status === 'connecting'   ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600';

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-200 overflow-hidden">

      {/* ── 顶部工具栏 ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <Terminal className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-100 mr-1">WS Playground</span>

        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />

        <input
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1
                     text-xs font-mono text-gray-200 outline-none focus:border-blue-500 transition-colors"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="ws://..."
          disabled={status !== 'disconnected'}
        />
        <input
          className="w-52 bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1
                     text-xs font-mono text-gray-400 outline-none focus:border-blue-500 transition-colors"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Token"
          disabled={status !== 'disconnected'}
        />

        <button
          onClick={status === 'disconnected' ? connect : disconnect}
          disabled={status === 'connecting'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-shrink-0
            ${status === 'disconnected'
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : status === 'connecting'
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-red-900/60 text-gray-200 hover:text-red-300'}`}
        >
          {status === 'disconnected' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connBtnLabel}
        </button>
      </div>

      {/* ── 主体双栏 ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── 左侧发送面板 ─────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900/50">
          <div className="px-3 py-2 border-b border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            发送
          </div>

          {/* 模板选择 */}
          <div className="px-3 pt-2 pb-1 flex-shrink-0">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">模板</label>
            <div className="relative mt-1">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5
                           text-xs text-gray-200 appearance-none outline-none cursor-pointer
                           focus:border-blue-500 transition-colors"
                value={tplIdx}
                onChange={e => handleTplChange(Number(e.target.value))}
              >
                {TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>

          {/* JSON 编辑器 */}
          <div className="flex-1 px-3 pb-2 flex flex-col overflow-hidden">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 mb-1">JSON</label>
            <textarea
              className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-md p-2
                         text-[11px] font-mono text-gray-200 resize-none outline-none
                         focus:border-blue-500 transition-colors leading-[1.6]"
              value={editor}
              onChange={e => setEditor(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
            />
          </div>

          {/* 发送按钮 */}
          <div className="px-3 pb-3 flex-shrink-0 flex items-center gap-2">
            <button
              onClick={sendMsg}
              disabled={status !== 'connected'}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md
                         bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-xs font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              发送
            </button>
            <span className="text-[10px] text-gray-600 flex-shrink-0">Ctrl+Enter</span>
          </div>
        </div>

        {/* ── 右侧消息流 ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center px-3 py-2 border-b border-gray-800 gap-2 flex-shrink-0">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex-1">消息流</span>
            <span className="text-[10px] text-gray-600">{entries.length} 条</span>
            <button
              onClick={() => {
                setEntries([]);
                _seq = 0;
              }}
              title="清空日志"
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { wsRef.current?.close(); connect(); }}
              title="重新连接"
              disabled={status !== 'disconnected'}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-gray-300
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-700">
                <Terminal className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">点击「连接」开始监听</p>
              </div>
            ) : (
              entries.map(e => <EntryRow key={e.id} entry={e} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
