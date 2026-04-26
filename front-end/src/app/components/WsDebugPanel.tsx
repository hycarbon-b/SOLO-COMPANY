import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Trash2, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Pause, Play } from 'lucide-react';
import { subscribeWsLog, getWsLogBuffer, type WsLogEntry } from '../../services/openclawGateway';

type FilterDir = 'ALL' | 'SEND' | 'RECV';
type FilterEvent = 'ALL' | 'agent' | 'chat' | 'connect' | 'other';

function getEventType(entry: WsLogEntry): string {
  const d = entry.data as any;
  if (!d) return 'other';
  if (d.event) return d.event;
  if (d.method === 'connect') return 'connect';
  if (d.method === 'chat.send') return 'chat.send';
  if (d.type === 'res') return 'res';
  return 'other';
}

function getEventColor(entry: WsLogEntry): string {
  const ev = getEventType(entry);
  if (entry.dir === 'SEND') return 'text-blue-400';
  switch (ev) {
    case 'agent': return 'text-emerald-400';
    case 'chat': return 'text-yellow-400';
    case 'connect': return 'text-purple-400';
    case 'res': return 'text-gray-400';
    default: return 'text-gray-500';
  }
}

function getDirBadge(dir: 'SEND' | 'RECV') {
  return dir === 'SEND'
    ? <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300"><ArrowUp className="w-2.5 h-2.5" />SEND</span>
    : <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300"><ArrowDown className="w-2.5 h-2.5" />RECV</span>;
}

function EntryRow({ entry }: { entry: WsLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const d = entry.data as any;
  const evType = getEventType(entry);
  const timeStr = new Date(entry.ts).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ms = String(entry.ts % 1000).padStart(3, '0');

  // 摘要行
  let summary = evType;
  if (entry.dir === 'SEND') {
    summary = `${d?.method ?? '?'} id=${String(d?.id ?? '').slice(-6)}`;
  } else if (evType === 'agent') {
    const textLen = d?.payload?.data?.text?.length ?? 0;
    const sk = d?.payload?.sessionKey ? '…' + d.payload.sessionKey.slice(-6) : '';
    summary = `agent${sk ? ' sk=' + sk : ''} textLen=${textLen}`;
  } else if (evType === 'chat') {
    const state = d?.payload?.state ?? '';
    const sk = d?.payload?.sessionKey ? '…' + d.payload.sessionKey.slice(-6) : '';
    summary = `chat state=${state}${sk ? ' sk=' + sk : ''}`;
  } else if (evType === 'res') {
    summary = `res id=${String(d?.id ?? '').slice(-6)} ok=${d?.ok}`;
  }

  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/60 transition-colors text-left group"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-gray-600 flex-shrink-0 tabular-nums text-[10px]">{timeStr}.{ms}</span>
        {getDirBadge(entry.dir)}
        <span className={`flex-1 text-[11px] font-mono truncate ${getEventColor(entry)}`}>{summary}</span>
        <span className="text-gray-700 group-hover:text-gray-500 flex-shrink-0">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {expanded && (
        <pre className="px-4 pb-3 pt-1 text-[10px] font-mono text-gray-300 bg-gray-950/40 overflow-x-auto whitespace-pre-wrap break-all leading-5">
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function WsDebugPanel() {
  const [entries, setEntries] = useState<WsLogEntry[]>(() => getWsLogBuffer());
  const [filterDir, setFilterDir] = useState<FilterDir>('ALL');
  const [filterEvent, setFilterEvent] = useState<FilterEvent>('ALL');
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const handleNew = useCallback((entry: WsLogEntry) => {
    if (pausedRef.current) return;
    setEntries(prev => {
      const next = [...prev, entry];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeWsLog(handleNew);
    return unsub;
  }, [handleNew]);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const filtered = entries.filter(e => {
    if (filterDir !== 'ALL' && e.dir !== filterDir) return false;
    if (filterEvent !== 'ALL') {
      const ev = getEventType(e);
      if (filterEvent === 'other') return !['agent', 'chat', 'connect', 'chat.send', 'res'].includes(ev);
      if (!ev.startsWith(filterEvent)) return false;
    }
    return true;
  });

  const filterDirBtns: FilterDir[] = ['ALL', 'SEND', 'RECV'];
  const filterEventBtns: { key: FilterEvent; label: string }[] = [
    { key: 'ALL', label: '全部' },
    { key: 'agent', label: 'agent' },
    { key: 'chat', label: 'chat' },
    { key: 'connect', label: 'connect' },
    { key: 'other', label: 'other' },
  ];

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="w-7 h-7 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100">WS 消息流</p>
          <p className="text-[10px] text-gray-500">实时原始 WebSocket 帧 · {filtered.length} / {entries.length} 条</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Pause */}
          <button
            onClick={() => setPaused(v => !v)}
            title={paused ? '继续' : '暂停'}
            className={`p-1.5 rounded-lg transition-colors ${paused ? 'bg-yellow-800/60 text-yellow-300' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          {/* Auto-scroll */}
          <button
            onClick={() => setAutoScroll(v => !v)}
            title={autoScroll ? '关闭自动滚动' : '开启自动滚动'}
            className={`p-1.5 rounded-lg transition-colors ${autoScroll ? 'bg-blue-800/60 text-blue-300' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          {/* Clear */}
          <button
            onClick={() => setEntries([])}
            title="清空"
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        {/* Direction filter */}
        <div className="flex items-center gap-1">
          {filterDirBtns.map(d => (
            <button
              key={d}
              onClick={() => setFilterDir(d)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filterDir === d
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {d === 'ALL' ? '全向' : d}
            </button>
          ))}
        </div>
        <div className="w-px h-3 bg-gray-700" />
        {/* Event type filter */}
        <div className="flex items-center gap-1">
          {filterEventBtns.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterEvent(key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filterEvent === key
                  ? 'bg-emerald-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {paused && (
          <span className="ml-auto text-[10px] text-yellow-400 font-medium animate-pulse">● 已暂停</span>
        )}
      </div>

      {/* Entry list */}
      <div
        ref={listRef}
        className="h-80 overflow-y-auto"
        onScroll={e => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (!atBottom && autoScroll) setAutoScroll(false);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
            <Activity className="w-6 h-6" />
            <p className="text-xs">暂无消息，发送对话后将实时显示 WS 帧</p>
          </div>
        ) : (
          filtered.map(e => <EntryRow key={e.id} entry={e} />)
        )}
      </div>
    </div>
  );
}
