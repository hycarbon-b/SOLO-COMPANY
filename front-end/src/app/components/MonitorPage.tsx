import { useState, useRef } from 'react';
import {
  Radio, BarChart2, BookOpen,
  MessageCircle, Mail, Bell, Send,
  Zap, Plus, Play, Clock, ChevronRight,
  Smartphone, CheckCircle2, ArrowRight,
  Star, Tag, ChevronDown, X as XIcon,
  ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────
type NodeKind = 'source' | 'analysis' | 'channel';

interface FlowNode {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  active: boolean;
}

interface Connection { from: string; to: string; }

// ── Canvas nodes ───────────────────────────────────────────────
const defaultNodes: FlowNode[] = [
  { id: 's1', kind: 'source',   label: '持仓股票',      sublabel: '5 支',        icon: BookOpen,      color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   active: true  },
  { id: 's2', kind: 'source',   label: '自选股票',       sublabel: '已选 4 支',   icon: Star,          color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   active: true  },
  { id: 's3', kind: 'source',   label: '策略与持仓状态', sublabel: '双均线策略',  icon: BarChart2,     color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   active: false },
  { id: 's4', kind: 'source',   label: '自定义关键词',   sublabel: '2 个关键词',  icon: Tag,           color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   active: true  },
  { id: 'a1', kind: 'analysis', label: '聚合分析',       sublabel: 'AI 综合研判', icon: Zap,           color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', active: true  },
  { id: 'c1', kind: 'channel',  label: '微信',           sublabel: '已连接',      icon: MessageCircle, color: 'text-green-600',  bgColor: 'bg-green-50',  borderColor: 'border-green-200',  active: true  },
  { id: 'c2', kind: 'channel',  label: 'Telegram',       sublabel: '已连接',      icon: Send,          color: 'text-green-600',  bgColor: 'bg-green-50',  borderColor: 'border-green-200',  active: true  },
  { id: 'c3', kind: 'channel',  label: '邮件',           sublabel: '未配置',      icon: Mail,          color: 'text-gray-400',   bgColor: 'bg-gray-50',   borderColor: 'border-gray-200',   active: false },
];

const defaultConnections: Connection[] = [
  { from: 's1', to: 'a1' }, { from: 's2', to: 'a1' },
  { from: 's3', to: 'a1' }, { from: 's4', to: 'a1' },
  { from: 'a1', to: 'c1' }, { from: 'a1', to: 'c2' }, { from: 'a1', to: 'c3' },
];

// Positions — stored in state so nodes are draggable
const initialPositions: Record<string, { x: number; y: number }> = {
  s1: { x: 100, y:  40 },
  s2: { x: 100, y: 145 },
  s3: { x: 100, y: 250 },
  s4: { x: 100, y: 355 },
  a1: { x: 370, y: 190 },
  c1: { x: 630, y:  60 },
  c2: { x: 630, y: 190 },
  c3: { x: 630, y: 320 },
};

// Node card width/height for connection anchors
const NW = 148;
const NH = 64;

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

// ── Draggable Node Card ────────────────────────────────────────
function NodeCard({
  node, pos, scale, selected, onSelect, onMove,
}: {
  node: FlowNode;
  pos: { x: number; y: number };
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (id: string, dx: number, dy: number) => void;
}) {
  const Icon = node.icon;
  const hasMoved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    hasMoved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    hasMoved.current = true;
    // divide by scale so movement matches canvas-space coordinates
    onMove(node.id, e.movementX / scale, e.movementY / scale);
  };

  const handlePointerUp = () => {
    if (!hasMoved.current) onSelect();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`
        absolute rounded-xl border-2 select-none transition-shadow duration-150
        ${node.bgColor}
        ${selected
          ? 'border-indigo-400 shadow-lg ring-2 ring-indigo-200 cursor-grabbing z-10'
          : node.borderColor + ' hover:shadow-md cursor-grab'}
      `}
      style={{ left: pos.x, top: pos.y, width: NW, height: NH, touchAction: 'none' }}
    >
      <div className="flex items-center gap-2.5 px-3 h-full">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
          <Icon className={`w-4 h-4 ${node.color}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-800 truncate">{node.label}</div>
          <div className="text-[10px] text-gray-400 truncate mt-0.5">{node.sublabel}</div>
        </div>
        {node.active && (
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400 flex-shrink-0 shadow-sm shadow-green-200" />
        )}
      </div>
    </div>
  );
}

// ── Watchlist stocks ───────────────────────────────────────────
const watchlistAll = [
  { symbol: 'AAPL',   name: '苹果' },
  { symbol: 'MSFT',   name: '微软' },
  { symbol: 'NVDA',   name: '英伟达' },
  { symbol: 'TSLA',   name: '特斯拉' },
  { symbol: 'GOOGL',  name: '谷歌' },
  { symbol: '600519', name: '贵州茅台' },
  { symbol: '300750', name: '宁德时代' },
  { symbol: '002594', name: '比亚迪' },
];

function WatchlistPaletteItem() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(
    new Set(['AAPL', 'MSFT', 'NVDA', 'TSLA'])
  );

  const toggle = (sym: string) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });

  return (
    <div>
      <div
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-all"
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-50 flex-shrink-0">
          <Star className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-700">自选股票</div>
          <div className="text-[10px] text-gray-400">已选 {checked.size} 支</div>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="ml-1 mt-1 border-l-2 border-blue-100 pl-2 space-y-0.5">
          {watchlistAll.map(s => (
            <label
              key={s.symbol}
              className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-blue-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked.has(s.symbol)}
                onChange={() => toggle(s.symbol)}
                className="w-3 h-3 accent-indigo-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-[11px] font-medium text-gray-700">{s.symbol}</span>
              <span className="text-[10px] text-gray-400">{s.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom Keywords palette item ───────────────────────────────
function KeywordsPaletteItem() {
  const [open, setOpen] = useState(false);
  const [keywords, setKeywords] = useState<string[]>(['新能源', 'AI芯片']);
  const [input, setInput] = useState('');

  const addKw = () => {
    const kw = input.trim();
    if (kw && !keywords.includes(kw)) setKeywords(prev => [...prev, kw]);
    setInput('');
  };

  const removeKw = (kw: string) =>
    setKeywords(prev => prev.filter(k => k !== kw));

  return (
    <div>
      <div
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-all"
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-50 flex-shrink-0">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-700">自定义关键词</div>
          <div className="text-[10px] text-gray-400">{keywords.length} 个关键词</div>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="ml-1 mt-1 border-l-2 border-blue-100 pl-2">
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {keywords.map(kw => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-full"
                >
                  {kw}
                  <button
                    onClick={e => { e.stopPropagation(); removeKw(kw); }}
                    className="hover:text-indigo-900 transition-colors"
                  >
                    <XIcon className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKw(); } }}
              placeholder="输入关键词回车添加…"
              className="flex-1 text-[11px] border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-indigo-300 bg-white min-w-0"
            />
            <button
              onClick={addKw}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-500 text-white hover:bg-indigo-600 flex-shrink-0 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Simple palette item ────────────────────────────────────────
function PaletteItem({ icon: Icon, label, sublabel, color, bg }: {
  icon: React.ElementType; label: string; sublabel: string; color: string; bg: string;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 cursor-grab hover:border-gray-400 hover:bg-gray-50 transition-all group`}>
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-700 truncate">{label}</div>
        <div className="text-[10px] text-gray-400 truncate">{sublabel}</div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export function MonitorPage() {
  const [nodes, setNodes] = useState<FlowNode[]>(defaultNodes);
  const [positions, setPositions] = useState(initialPositions);
  const [selectedId, setSelectedId] = useState<string | null>('a1');
  const [schedule, setSchedule] = useState('每 30 分钟');
  const [isRunning, setIsRunning] = useState(true);
  const [showAdded, setShowAdded] = useState(false);
  // viewport: canvas pan + zoom
  const [viewport, setViewport] = useState({ x: 40, y: 30, scale: 1 });
  const isPanning = useRef(false);

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null;

  const handleNodeMove = (id: string, dx: number, dy: number) =>
    setPositions(prev => ({
      ...prev,
      [id]: {
        x: Math.max(0, prev[id].x + dx),
        y: Math.max(0, prev[id].y + dy),
      },
    }));

  // ── Canvas pan handlers ────────────────────────────────────
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    isPanning.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current || !(e.buttons & 1)) return;
    setViewport(v => ({ ...v, x: v.x + e.movementX, y: v.y + e.movementY }));
  };
  const handleCanvasPointerUp = () => { isPanning.current = false; };

  // ── Wheel zoom (cursor-centered) ───────────────────────────
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setViewport(v => {
      const newScale = Math.min(2.5, Math.max(0.25, v.scale * factor));
      const ratio = newScale / v.scale;
      return {
        x: mx - (mx - v.x) * ratio,
        y: my - (my - v.y) * ratio,
        scale: newScale,
      };
    });
  };

  const zoomIn  = () => setViewport(v => ({ ...v, scale: Math.min(2.5, +(v.scale * 1.2).toFixed(2)) }));
  const zoomOut = () => setViewport(v => ({ ...v, scale: Math.max(0.25, +(v.scale / 1.2).toFixed(2)) }));
  const zoomFit = () => setViewport({ x: 40, y: 30, scale: 1 });

  const handleAddNode = () => {
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 2000);
  };

  const scheduleOptions = ['每 15 分钟', '每 30 分钟', '每 1 小时', '每天 08:30', '每天 20:00'];

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-6 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo-500" />
          <h1 className="text-sm font-semibold text-gray-900">实盘监控工作流</h1>
          <span className="text-xs text-gray-400 ml-1">—— 拖拽节点，几秒钟完成配置，自动定时推送到手机</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Schedule selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <select
              className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
            >
              {scheduleOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Run/Pause toggle */}
          <button
            onClick={() => setIsRunning(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isRunning
                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {isRunning
              ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />运行中</>
              : <><Play className="w-3 h-3" />启动</>
            }
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            <Play className="w-3 h-3" />
            立即执行
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left palette */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-1 mb-3">节点面板</p>

            {/* 消息源 */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold mb-1.5 px-1 text-blue-600">消息源</p>
              <div className="space-y-1.5">
                <PaletteItem icon={BookOpen} label="持仓股票" sublabel="实时盯盘持仓标的" color="text-blue-600" bg="bg-blue-50" />
                <WatchlistPaletteItem />
                <PaletteItem icon={BarChart2} label="策略与持仓状态" sublabel="当前策略运行情况" color="text-blue-600" bg="bg-blue-50" />
                <KeywordsPaletteItem />
              </div>
            </div>

            {/* 分析 */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold mb-1.5 px-1 text-purple-600">分析</p>
              <div className="space-y-1.5">
                <PaletteItem icon={Zap} label="聚合分析" sublabel="AI 多源综合研判" color="text-purple-600" bg="bg-purple-50" />
              </div>
            </div>

            {/* 推送渠道 */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold mb-1.5 px-1 text-green-600">推送渠道</p>
              <div className="space-y-1.5">
                {[
                  { icon: MessageCircle, label: '微信',     sublabel: '企业微信 / 服务号' },
                  { icon: Send,          label: 'Telegram', sublabel: 'Bot 推送' },
                  { icon: Bell,          label: '钉钉',     sublabel: '钉钉机器人' },
                  { icon: Mail,          label: '邮件',     sublabel: 'SMTP 发送' },
                  { icon: Smartphone,    label: 'App 通知', sublabel: '手机推送' },
                ].map(item => (
                  <PaletteItem key={item.label} icon={item.icon} label={item.label} sublabel={item.sublabel} color="text-green-600" bg="bg-green-50" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto p-3 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 leading-relaxed">
              拖拽节点到画布，连接后即可自动运行定时推送
            </div>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          className="flex-1 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px]"
          style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleWheel}
        >
          {/* Transformed canvas layer (pan + zoom) */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: 1600, height: 1200,
              transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`,
              transformOrigin: '0 0',
            }}
          >
            {/* SVG connections */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#a5b4fc" />
                </marker>
                <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#818cf8" />
                </marker>
              </defs>
              {defaultConnections.map((conn, i) => {
                const from = positions[conn.from];
                const to   = positions[conn.to];
                if (!from || !to) return null;
                const x1 = from.x + NW;
                const y1 = from.y + NH / 2;
                const x2 = to.x;
                const y2 = to.y + NH / 2;
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode   = nodes.find(n => n.id === conn.to);
                const active   = !!(fromNode?.active && toNode?.active);
                return (
                  <path
                    key={i}
                    d={bezier(x1, y1, x2, y2)}
                    fill="none"
                    stroke={active ? '#818cf8' : '#cbd5e1'}
                    strokeWidth={active ? 2 : 1.5}
                    strokeDasharray={active ? undefined : '5 4'}
                    markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
                    opacity={active ? 0.85 : 0.5}
                  />
                );
              })}
            </svg>

            {/* Node cards */}
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                pos={positions[node.id]}
                scale={viewport.scale}
                selected={selectedId === node.id}
                onSelect={() => setSelectedId(node.id === selectedId ? null : node.id)}
                onMove={handleNodeMove}
              />
            ))}

            {/* Column labels */}
            <div className="absolute top-4 left-0 pointer-events-none flex" style={{ paddingLeft: 68, gap: 248 }}>
              {(['消息源', '聚合分析', '推送渠道'] as const).map(label => (
                <span key={label} className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">{label}</span>
              ))}
            </div>
          </div>

          {/* ── Zoom controls overlay (not transformed) ── */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full px-2 py-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-1" />
            <span className="text-xs text-gray-500 mr-2 whitespace-nowrap">
              工作流运行中 · {schedule}触发一次
            </span>
            <ChevronRight className="w-3 h-3 text-gray-300 mr-2" />
            <button onClick={zoomOut} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-gray-500 w-10 text-center tabular-nums">
              {Math.round(viewport.scale * 100)}%
            </span>
            <button onClick={zoomIn} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={zoomFit} title="重置视图" className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors ml-0.5">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Add node button */}
          <button
            onClick={handleAddNode}
            className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          {showAdded && (
            <div className="absolute bottom-16 right-4 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 text-xs text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              节点已添加到画布
            </div>
          )}
        </div>

        {/* ── Right detail panel ── */}
        <div className="w-64 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
          {selectedNode ? (
            <div className="p-4 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedNode.bgColor}`}>
                  <selectedNode.icon className={`w-4 h-4 ${selectedNode.color}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{selectedNode.label}</div>
                  <div className="text-xs text-gray-400">{selectedNode.sublabel}</div>
                </div>
              </div>

              {/* Config fields by kind */}
              {selectedNode.kind === 'source' && (
                <div className="space-y-3">
                  <ConfigRow label="数据源" value="交易所实时行情" />
                  <ConfigRow label="刷新频率" value="跟随工作流触发" />
                  <ConfigRow label="过滤规则" value="仅涨跌幅 > 3%" />
                  <ConfigRow label="状态" value={selectedNode.active ? '已启用' : '已禁用'} highlight={selectedNode.active} />
                </div>
              )}
              {selectedNode.kind === 'analysis' && (
                <div className="space-y-3">
                  <ConfigRow label="分析模型" value="GPT-4o" />
                  <ConfigRow label="输入来源" value="所有已连接消息源" />
                  <ConfigRow label="输出格式" value="简报 + 信号" />
                  <ConfigRow label="语言" value="中文" />
                  <ConfigRow label="摘要长度" value="200 字以内" />
                </div>
              )}
              {selectedNode.kind === 'channel' && (
                <div className="space-y-3">
                  <ConfigRow label="渠道" value={selectedNode.label} />
                  <ConfigRow label="连接状态" value={selectedNode.active ? '已连接' : '未配置'} highlight={selectedNode.active} />
                  <ConfigRow label="消息模板" value="默认简报模板" />
                  {selectedNode.active && <ConfigRow label="最后推送" value="3 分钟前" />}
                </div>
              )}

              {/* Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">启用此节点</span>
                <button
                  onClick={() => setNodes(prev => prev.map(n =>
                    n.id === selectedNode.id ? { ...n, active: !n.active } : n
                  ))}
                  className={`relative w-9 h-5 rounded-full transition-colors ${selectedNode.active ? 'bg-indigo-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${selectedNode.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 p-6 text-center">
              <BarChart2 className="w-8 h-8 text-gray-200" />
              <p className="text-xs leading-relaxed">点击画布中的节点<br />查看和编辑配置</p>
            </div>
          )}

          {/* Quick guide */}
          <div className="p-4 border-t border-gray-100 space-y-2.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">快速上手</p>
            {[
              { step: '1', text: '从左侧拖入消息源节点' },
              { step: '2', text: '连接到聚合分析节点' },
              { step: '3', text: '选择推送渠道并连接' },
              { step: '4', text: '设置触发频率，启动！' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                <span className="text-[11px] text-gray-500">{text}</span>
                {step === '4' && <ArrowRight className="w-3 h-3 text-indigo-400 ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-[11px] font-medium text-right ${highlight === false ? 'text-gray-400' : highlight ? 'text-green-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}
