import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PageHeader, StatCard, Badge, StatusDot, PlatformChip, SectionTitle } from '../components/common';
import { KPI, FOLLOWER_TREND, DRAFTS, AGENTS, ACTIVITY_FEED, PLATFORMS } from '@/services/mock';
import { PenSquare, Users, Radio, Bot } from 'lucide-react';

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

const KPI_META = [
  { icon: PenSquare, accentColor: '#6366f1' },
  { icon: Users,     accentColor: '#10b981' },
  { icon: Radio,     accentColor: '#f59e0b' },
  { icon: Bot,       accentColor: '#ec4899' },
];

const PLATFORM_LEGEND = [
  { key: 'douyin',      label: '抖音',    color: '#0f0f0f' },
  { key: 'xiaohongshu', label: '小红书',  color: '#FE2C55' },
  { key: 'wechat',      label: '公众号',  color: '#07C160' },
  { key: 'bilibili',    label: 'B站',     color: '#00A1D6' },
];

const STATUS_MAP: Record<string, { color: 'green'|'red'|'gray'|'amber'; dot: boolean }> = {
  published: { color: 'green', dot: true },
  queued:    { color: 'indigo' as any, dot: true },
  draft:     { color: 'gray', dot: false },
  failed:    { color: 'red', dot: true },
};

export function DashboardPage() {
  return (
    <div className="page-shell" data-testid="page-dashboard">
      <div className="page-inner">
        <PageHeader
          title="今日工作台"
          description="一眼查看所有平台、所有 Agent、所有发布任务的状态。"
        />

        {/* ── KPI Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI.map((k, i) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              delta={k.delta}
              icon={KPI_META[i].icon}
              accentColor={KPI_META[i].accentColor}
              live={k.trend === 'flat' && k.label === '直播在播'}
            />
          ))}
        </div>

        {/* ── Chart + Agents ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Follower chart */}
          <div className="panel p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>跨平台粉丝增长 · 7 日</SectionTitle>
              <div className="flex items-center gap-3">
                {PLATFORM_LEGEND.map((p) => (
                  <span key={p.key} className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
                    {p.label}
                  </span>
                ))}
                <Badge color="indigo" dot>实时</Badge>
              </div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={FOLLOWER_TREND} margin={{ left: -12, right: 4, top: 4, bottom: 0 }}>
                  <defs>
                    {PLATFORM_LEGEND.map((p) => (
                      <linearGradient key={p.key} id={`g-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={p.color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={p.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderRadius: 10,
                      boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
                      fontSize: 12,
                    }}
                  />
                  {PLATFORM_LEGEND.map((p) => (
                    <Area
                      key={p.key}
                      type="monotone"
                      dataKey={p.key}
                      stroke={p.color}
                      strokeWidth={2}
                      fill={`url(#g-${p.key})`}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agents panel */}
          <div className="panel p-5">
            <SectionTitle
              actions={
                <span className="text-[11px] text-[color:var(--muted-foreground)] cursor-pointer hover:text-indigo-600 transition-colors">
                  全部 →
                </span>
              }
            >
              运行中的 Agent
            </SectionTitle>
            <ul className="space-y-0">
              {AGENTS.map((a) => (
                <li
                  key={a.id}
                  className="table-row-hover flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg border-b last:border-0"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StatusDot status={a.status as 'running' | 'idle' | 'error'} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{a.name}</div>
                      <div className="text-[11px] text-[color:var(--muted-foreground)] truncate">
                        {a.lastRun}
                      </div>
                    </div>
                  </div>
                  <Badge
                    color={
                      a.status === 'running' ? 'green' : a.status === 'error' ? 'red' : 'gray'
                    }
                    dot
                  >
                    {a.status === 'running' ? '运行中' : a.status === 'error' ? '错误' : '空闲'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Upcoming publishes ──────────────────────────── */}
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--panel-border)' }}>
            <SectionTitle>即将发布</SectionTitle>
            <Badge color="indigo">{DRAFTS.filter((d) => d.status === 'queued').length} 待发布</Badge>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--panel-muted)' }}>
                {['标题', '平台', '计划时间', '状态'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold py-2.5 px-4 first:pl-5 last:pr-5"
                    style={{ color: 'var(--muted-foreground)', letterSpacing: '0.03em' }}
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DRAFTS.map((d) => (
                <tr
                  key={d.id}
                  className="table-row-hover border-t"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <td className="py-3 px-4 pl-5 font-medium max-w-[240px]">
                    <div className="truncate">{d.title}</div>
                    <div className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5">{d.type}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {d.platforms.map((pid) => {
                        const p = PLATFORM_MAP[pid];
                        return p ? (
                          <PlatformChip key={pid} name={p.name} color={p.color} short={p.shortLabel} />
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[color:var(--muted-foreground)] whitespace-nowrap">
                    {d.scheduledAt}
                  </td>
                  <td className="py-3 px-4 pr-5">
                    <Badge
                      color={(STATUS_MAP[d.status]?.color as any) ?? 'gray'}
                      dot={STATUS_MAP[d.status]?.dot}
                    >
                      {{ draft: '草稿', queued: '已排程', published: '已发布', failed: '失败' }[d.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Activity + Todos ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity feed */}
          <div className="panel p-5">
            <SectionTitle>最近动态</SectionTitle>
            <ul className="relative space-y-0 timeline-line pl-8">
              {ACTIVITY_FEED.map((item, idx) => (
                <li key={item.id} className={`relative flex gap-3 ${idx < ACTIVITY_FEED.length - 1 ? 'pb-3' : ''}`}>
                  {/* Dot on timeline */}
                  <div
                    className="absolute -left-[22px] top-1 h-6 w-6 rounded-lg flex items-center justify-center text-sm z-10"
                    style={{ background: 'var(--panel-strong)', border: '1px solid var(--panel-border)' }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-[12px] leading-relaxed">{item.text}</div>
                    <div className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5">
                      {item.time}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Today's todos */}
          <div className="panel p-5">
            <SectionTitle
              actions={
                <span className="text-[10px] text-[color:var(--muted-foreground)]">2 / 5 完成</span>
              }
            >
              今日待办
            </SectionTitle>
            <ul className="space-y-1">
              {[
                { text: '审核「一人公司启动指南」小红书版本', done: true },
                { text: '确认今晚 20:00 B站直播设备', done: true },
                { text: '回复昨日小红书评论 (23 条)', done: false },
                { text: '检查「评论回复官」Agent Token 配置', done: false },
                { text: '上传抖音切片 #14 字幕文件', done: false },
              ].map((task, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 py-2 border-b last:border-0 table-row-hover rounded-lg px-2 -mx-2 cursor-pointer"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold border transition-colors ${
                      task.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {task.done ? '✓' : ''}
                  </span>
                  <span
                    className={`text-[12px] leading-relaxed ${task.done ? 'line-through text-[color:var(--muted-foreground)]' : ''}`}
                  >
                    {task.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


export function DashboardPage() {
  return (
    <div className="page-shell" data-testid="page-dashboard">
      <div className="page-inner">
        <PageHeader
          title="今日工作台"
          description="一眼查看所有平台、所有 Agent、所有发布任务的状态。"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="panel p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">跨平台粉丝增长 · 7 日</h3>
              <Badge color="indigo">实时</Badge>
            </div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <AreaChart data={FOLLOWER_TREND}>
                  <defs>
                    {['wechat', 'xiaohongshu', 'douyin', 'bilibili'].map((id, i) => (
                      <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={['#07C160', '#FE2C55', '#000', '#00A1D6'][i]}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={['#07C160', '#FE2C55', '#000', '#00A1D6'][i]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="douyin" stroke="#000" fill="url(#g-douyin)" />
                  <Area
                    type="monotone"
                    dataKey="xiaohongshu"
                    stroke="#FE2C55"
                    fill="url(#g-xiaohongshu)"
                  />
                  <Area type="monotone" dataKey="wechat" stroke="#07C160" fill="url(#g-wechat)" />
                  <Area
                    type="monotone"
                    dataKey="bilibili"
                    stroke="#00A1D6"
                    fill="url(#g-bilibili)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">运行中的 Agent</h3>
            <ul className="space-y-3">
              {AGENTS.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 pb-3 last:pb-0 border-b last:border-0"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] truncate">
                      {a.role}
                    </div>
                  </div>
                  <Badge
                    color={
                      a.status === 'running' ? 'green' : a.status === 'error' ? 'red' : 'gray'
                    }
                  >
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-3">即将发布</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[color:var(--muted-foreground)]">
              <tr>
                <th className="py-2 pr-3">标题</th>
                <th className="py-2 pr-3">类型</th>
                <th className="py-2 pr-3">平台</th>
                <th className="py-2 pr-3">计划时间</th>
                <th className="py-2 pr-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {DRAFTS.map((d) => (
                <tr
                  key={d.id}
                  className="border-t"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <td className="py-2.5 pr-3 font-medium">{d.title}</td>
                  <td className="py-2.5 pr-3">{d.type}</td>
                  <td className="py-2.5 pr-3">{d.platforms.join(' · ')}</td>
                  <td className="py-2.5 pr-3">{d.scheduledAt}</td>
                  <td className="py-2.5 pr-3">
                    <Badge
                      color={
                        d.status === 'published'
                          ? 'green'
                          : d.status === 'failed'
                          ? 'red'
                          : d.status === 'queued'
                          ? 'indigo'
                          : 'gray'
                      }
                    >
                      {d.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">最近动态</h3>
            <ul className="space-y-3">
              {ACTIVITY_FEED.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-base"
                    style={{ background: 'var(--panel-muted)' }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-relaxed">{item.text}</div>
                    <div className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5">
                      {item.time}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">今日待办</h3>
            <ul className="space-y-2">
              {[
                { text: '审核「一人公司启动指南」小红书版本', done: true },
                { text: '确认今晚 20:00 B站直播设备', done: true },
                { text: '回复昨日小红书评论 (23 条)', done: false },
                { text: '检查「评论回复官」Agent Token 配置', done: false },
                { text: '上传抖音切片 #14 字幕文件', done: false },
              ].map((task, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs py-1.5 border-b last:border-0"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold border ${
                      task.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {task.done ? '✓' : ''}
                  </span>
                  <span className={task.done ? 'line-through text-[color:var(--muted-foreground)]' : ''}>
                    {task.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
