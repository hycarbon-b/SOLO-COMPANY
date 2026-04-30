import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity, Trash2, ArrowDown, ArrowUp, ArrowUpDown,
  ChevronDown, ChevronRight, Pause, Play, FolderOpen, X, RefreshCw,
} from 'lucide-react';
import { subscribeWsLog, getWsLogBuffer, type WsLogEntry } from '../../services/openclawGateway';

// ─── 类型与常量 ──────────────────────────────────────────────────────────────
type FilterDir = 'ALL' | 'SEND' | 'RECV';
type FilterEvent = 'ALL' | 'agent' | 'chat' | 'connect' | 'other';

const MAX_LIVE_ENTRIES = 500;
const KNOWN_EVENTS = ['agent', 'chat', 'connect', 'chat.send', 'res'] as const;

interface CaptureFileMeta {
  name: string;
  sessionKey: string;
  size: number;
  mtime: number;
}

const FILTER_DIRS: FilterDir[] = ['ALL', 'SEND', 'RECV'];
const FILTER_EVENTS: { key: FilterEvent; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'agent', label: 'agent' },
  { key: 'chat', label: 'chat' },
  { key: 'connect', label: 'connect' },
  { key: 'other', label: 'other' },
];

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

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
  if (entry.dir === 'SEND') return 'text-blue-600';
  switch (getEventType(entry)) {
    case 'agent':   return 'text-emerald-600';
    case 'chat':    return 'text-amber-600';
    case 'connect': return 'text-purple-600';
    case 'res':     return 'text-gray-500';
    default:        return 'text-gray-500';
  }
}

function buildSummary(entry: WsLogEntry): string {
  const d = entry.data as any;
  if (entry.dir === 'SEND') {
    return `${d?.method ?? '?'} id=${String(d?.id ?? '').slice(-6)}`;
  }
  const ev = getEventType(entry);
  if (ev === 'agent') {
    const textLen = d?.payload?.data?.text?.length ?? 0;
    const sk = d?.payload?.sessionKey ? '…' + d.payload.sessionKey.slice(-6) : '';
    return `agent${sk ? ' sk=' + sk : ''} textLen=${textLen}`;
  }
  if (ev === 'chat') {
    const state = d?.payload?.state ?? '';
    const sk = d?.payload?.sessionKey ? '…' + d.payload.sessionKey.slice(-6) : '';
    return `chat state=${state}${sk ? ' sk=' + sk : ''}`;
  }
  if (ev === 'res') return `res id=${String(d?.id ?? '').slice(-6)} ok=${d?.ok}`;
  return ev;
}

function DirBadge({ dir }: { dir: 'SEND' | 'RECV' }) {
  return dir === 'SEND' ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
      <ArrowUp className="w-2.5 h-2.5" />SEND
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
      <ArrowDown className="w-2.5 h-2.5" />RECV
    </span>
  );
}

// ─── 单条消息 ────────────────────────────────────────────────────────────────
function EntryRow({ entry }: { entry: WsLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const ts = new Date(entry.ts);
  const timeStr = ts.toLocaleTimeString('zh-CN', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const ms = String(entry.ts % 1000).padStart(3, '0');

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left group"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-gray-400 flex-shrink-0 tabular-nums text-[10px]">{timeStr}.{ms}</span>
        <DirBadge dir={entry.dir} />
        <span className={`flex-1 text-[11px] font-mono truncate ${getEventColor(entry)}`}>
          {buildSummary(entry)}
        </span>
        <span className="text-gray-300 group-hover:text-gray-500 flex-shrink-0">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {expanded && (
        <pre className="px-4 pb-3 pt-1 text-[10px] font-mono text-gray-700 bg-gray-50 overflow-x-auto whitespace-pre-wrap break-all leading-5">
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── 主面板 ──────────────────────────────────────────────────────────────────
export function WsDebugPanel() {
  const [entries, setEntries] = useState<WsLogEntry[]>(() => getWsLogBuffer());
  const [filterDir, setFilterDir] = useState<FilterDir>('ALL');
  const [filterEvent, setFilterEvent] = useState<FilterEvent>('ALL');
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // 历史回放：historyKey != null 即处于回放模式
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  // 弹窗
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<CaptureFileMeta[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  // 在订阅回调里读取最新值，避免重新订阅
  const skipLiveRef = useRef(false);
  skipLiveRef.current = paused || historyKey !== null;

  // ── 实时帧订阅 ────────────────────────────────────────────────
  useEffect(() => {
    return subscribeWsLog(entry => {
      if (skipLiveRef.current) return;
      setEntries(prev => {
        if (prev.length < MAX_LIVE_ENTRIES) return [...prev, entry];
        return [...prev.slice(prev.length - MAX_LIVE_ENTRIES + 1), entry];
      });
    });
  }, []);

  // ── 自动滚动 ──────────────────────────────────────────────────
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  // ── 过滤 ──────────────────────────────────────────────────────
  const filtered = useMemo(() => entries.filter(e => {
    if (filterDir !== 'ALL' && e.dir !== filterDir) return false;
    if (filterEvent === 'ALL') return true;
    const ev = getEventType(e);
    if (filterEvent === 'other') return !KNOWN_EVENTS.includes(ev as any);
    return ev.startsWith(filterEvent);
  }), [entries, filterDir, filterEvent]);

  // ── 历史 JSONL 加载 ───────────────────────────────────────────
  const refreshSessions = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.wsCaptureList) {
      setPickerError('当前环境不可用（仅 Electron 支持）');
      return;
    }
    setPickerLoading(true);
    setPickerError(null);
    try {
      const r = await api.wsCaptureList();
      if (!r?.ok) throw new Error(r?.error || '读取失败');
      setPickerFiles(r.files || []);
    } catch (e: any) {
      setPickerError(e?.message || String(e));
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    refreshSessions();
  }, [refreshSessions]);

  const loadHistory = useCallback(async (sessionKey: string) => {
    const api = (window as any).electronAPI;
    if (!api?.wsCaptureRead) return;
    try {
      const r = await api.wsCaptureRead(sessionKey);
      if (!r?.ok) throw new Error(r?.error || '读取失败');
      const lines: any[] = r.lines || [];
      const mapped: WsLogEntry[] = lines.map((ln, idx) => ({
        id: idx + 1,
        dir: ln.dir === 'SEND' ? 'SEND' : 'RECV',
        ts: typeof ln.ts === 'number' ? ln.ts : Date.now(),
        data: ln.data,
      }));
      setEntries(mapped);
      setHistoryKey(sessionKey);
      setPickerOpen(false);
    } catch (e: any) {
      setPickerError(e?.message || String(e));
    }
  }, []);

  const exitHistory = useCallback(() => {
    setHistoryKey(null);
    setEntries(getWsLogBuffer());
  }, []);

  const inHistory = historyKey !== null;

  // ── 渲染 ──────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">WS 消息流</p>
          <p className="text-[10px] text-gray-500">
            {inHistory ? (
              <>历史回放 · <span className="text-amber-600 font-mono">{historyKey}</span> · {filtered.length} / {entries.length} 条</>
            ) : (
              <>实时原始 WebSocket 帧 · {filtered.length} / {entries.length} 条</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <IconBtn title="加载缓存 JSONL" onClick={openPicker}>
            <FolderOpen className="w-3.5 h-3.5" />
          </IconBtn>
          {inHistory && (
            <button
              onClick={exitHistory}
              title="退出历史回放，返回实时模式"
              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              退出回放
            </button>
          )}
          <IconBtn
            title={paused ? '继续' : '暂停'}
            onClick={() => setPaused(v => !v)}
            disabled={inHistory}
            active={paused}
            activeClass="bg-amber-100 text-amber-700"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </IconBtn>
          <IconBtn
            title={autoScroll ? '关闭自动滚动' : '开启自动滚动'}
            onClick={() => setAutoScroll(v => !v)}
            active={autoScroll}
            activeClass="bg-blue-100 text-blue-700"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title="清空" onClick={() => setEntries([])}>
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          {FILTER_DIRS.map(d => (
            <FilterChip
              key={d}
              active={filterDir === d}
              onClick={() => setFilterDir(d)}
              activeClass="bg-blue-600 text-white"
            >
              {d === 'ALL' ? '全向' : d}
            </FilterChip>
          ))}
        </div>
        <div className="w-px h-3 bg-gray-200" />
        <div className="flex items-center gap-1">
          {FILTER_EVENTS.map(({ key, label }) => (
            <FilterChip
              key={key}
              active={filterEvent === key}
              onClick={() => setFilterEvent(key)}
              activeClass="bg-emerald-600 text-white"
            >
              {label}
            </FilterChip>
          ))}
        </div>
        {paused && !inHistory && (
          <span className="ml-auto text-[10px] text-amber-600 font-medium animate-pulse">● 已暂停</span>
        )}
      </div>

      {/* Entry list */}
      <div
        ref={listRef}
        className="h-80 overflow-y-auto bg-white"
        onScroll={e => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (!atBottom && autoScroll) setAutoScroll(false);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
            <Activity className="w-6 h-6" />
            <p className="text-xs text-gray-400">
              {inHistory ? '该会话的 JSONL 中无匹配帧' : '暂无消息，发送对话后将实时显示 WS 帧'}
            </p>
          </div>
        ) : (
          filtered.map(e => <EntryRow key={e.id} entry={e} />)
        )}
      </div>

      {/* JSONL 会话选择弹窗 */}
      {pickerOpen && (
        <SessionPicker
          loading={pickerLoading}
          files={pickerFiles}
          error={pickerError}
          onRefresh={refreshSessions}
          onClose={() => setPickerOpen(false)}
          onSelect={loadHistory}
        />
      )}
    </div>
  );
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────
function IconBtn({
  children, onClick, title, disabled, active, activeClass = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  activeClass?: string;
}) {
  const base = 'p-1.5 rounded-lg transition-colors';
  const cls = active
    ? `${base} ${activeClass}`
    : `${base} hover:bg-gray-100 text-gray-500`;
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${cls} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function FilterChip({
  children, active, onClick, activeClass,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
        active ? activeClass : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function SessionPicker({
  loading, files, error, onRefresh, onClose, onSelect,
}: {
  loading: boolean;
  files: CaptureFileMeta[];
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
  onSelect: (sessionKey: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-h-[70vh] flex flex-col bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <FolderOpen className="w-4 h-4 text-amber-600" />
          <p className="flex-1 text-sm font-semibold text-gray-900">加载缓存 JSONL（按 sessionKey）</p>
          <button onClick={onRefresh} title="刷新" className="p-1 rounded hover:bg-gray-200 text-gray-500">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} title="关闭" className="p-1 rounded hover:bg-gray-200 text-gray-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-xs text-red-600 border-b border-red-100 bg-red-50">{error}</div>
          )}
          {loading ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">加载中…</div>
          ) : files.length === 0 && !error ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">暂无缓存文件</div>
          ) : (
            <ul>
              {files.map(f => (
                <li key={f.name} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => onSelect(f.sessionKey)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-[12px] font-mono text-gray-800 truncate">{f.sessionKey}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-3">
                      <span>{formatBytes(f.size)}</span>
                      <span>{new Date(f.mtime).toLocaleString('zh-CN', { hour12: false })}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
