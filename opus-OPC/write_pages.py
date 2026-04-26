"""Script to rewrite AnalyticsPage.tsx and DashboardPage.tsx with correct UTF-8 encoding."""
import os

BASE = r"d:\Worksapce_tradingbase\SOLO-COMPANY\opus-OPC\src\app\pages"

ANALYTICS = """\
import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PageHeader, StatCard, Badge, SectionTitle } from '../components/common';
import { ENGAGEMENT_BAR } from '@/services/mock';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { BarChart3, Users, Eye, Repeat2 } from 'lucide-react';

type DateRange = '7日' | '30日' | '90日';

const TOP_CONTENT = [
  { title: '一人公司启动指南：从 0 到 1 的 7 个动作', views: '24.3k', platforms: 3, cr: '4.2%', crNum: 4.2 },
  { title: 'AI 工具栈拆解 · 2026', views: '18.1k', platforms: 3, cr: '3.8%', crNum: 3.8 },
  { title: '副业转主业的三组现金流', views: '12.8k', platforms: 2, cr: '3.1%', crNum: 3.1 },
  { title: '直播切片 #14 · 选品 SOP', views: '9.2k', platforms: 2, cr: '5.6%', crNum: 5.6 },
  { title: '今日实验：用 GPT 写带货文案', views: '6.5k', platforms: 2, cr: '2.3%', crNum: 2.3 },
];

const RANGE_MULT: Record<DateRange, number> = { '7日': 1, '30日': 4.2, '90日': 11.8 };
const KPI_BASE = [
  { label: '总曝光', value: 93400, delta: '+18.2%', icon: Eye, accentColor: '#6366f1' },
  { label: '总互动', value: 10300, delta: '+22.4%', icon: BarChart3, accentColor: '#ec4899' },
  { label: '互动率', value: '11.0%', delta: '+0.8 pp', static: true, icon: Repeat2, accentColor: '#10b981' },
  { label: '新增粉丝', value: 1284, delta: '+9.6%', icon: Users, accentColor: '#f59e0b' },
];

function formatNum(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('7日');
  const [expanded, setExpanded] = useState<number | null>(null);
  const mult = RANGE_MULT[range];

  const scaledBar = ENGAGEMENT_BAR.map((item) => ({
    ...item,
    impressions: Math.round(item.impressions * mult),
    engagement: Math.round(item.engagement * mult),
  }));

  return (
    <div className="page-shell" data-testid="page-analytics">
      <div className="page-inner">
        <PageHeader
          title="数据分析"
          description="跨平台曝光、互动、转化总览。"
          actions={
            <div
              className="flex gap-1 p-1 rounded-lg"
              style={{ background: 'var(--panel-muted)', border: '1px solid var(--panel-border)' }}
              data-testid="date-range-selector"
            >
              {(['7日', '30日', '90日'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[12px] px-3 py-1.5 rounded-md font-medium transition-all ${
                    range === r
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-[color:var(--muted-foreground)] hover:bg-white/60'
                  }`}
                  data-testid={`range-${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_BASE.map((k) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.static ? k.value : formatNum(Math.round((k.value as number) * mult))}
              delta={k.delta}
              icon={k.icon}
              accentColor={k.accentColor}
            />
          ))}
        </div>

        {/* Bar chart */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>各平台曝光 vs 互动</SectionTitle>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />曝光
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm bg-pink-500" />互动
              </span>
              <span data-testid="range-badge"><Badge color="indigo">{range}</Badge></span>
            </div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={scaledBar} barGap={3} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNum} />
                <Tooltip
                  formatter={(v: number) => formatNum(v)}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid rgba(15,23,42,0.08)',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} name="曝光" maxBarSize={32} />
                <Bar dataKey="engagement" fill="#ec4899" radius={[4, 4, 0, 0]} name="互动" maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top content + Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="panel p-5">
            <SectionTitle>热门内容 Top 5</SectionTitle>
            <ol className="space-y-1">
              {TOP_CONTENT.map((item, i) => (
                <li
                  key={item.title}
                  className="border-b last:border-0"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <button
                    className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50 rounded-lg px-2 transition"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <span className="truncate flex-1 text-[13px]">
                      <span
                        className="inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-bold mr-2 shrink-0"
                        style={{
                          background: i < 3 ? 'var(--gradient-primary)' : 'var(--panel-muted)',
                          color: i < 3 ? '#fff' : 'var(--muted-foreground)',
                        }}
                      >
                        {i + 1}
                      </span>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-mono text-[color:var(--muted-foreground)]">
                        {item.views}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {expanded === i && (
                    <div className="px-2 pb-3 pt-1 grid grid-cols-3 gap-3">
                      {[
                        { k: '总曝光', v: item.views },
                        { k: '发布平台', v: `${item.platforms} 个` },
                        { k: '转化率', v: item.cr },
                      ].map(({ k, v }) => (
                        <div key={k} className="bg-slate-50 rounded-lg p-2.5">
                          <div className="text-[10px] text-[color:var(--muted-foreground)] font-medium">{k}</div>
                          <div className="text-[13px] font-semibold mt-0.5">{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Revenue breakdown */}
          <div className="panel p-5">
            <SectionTitle
              actions={
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <TrendingUp className="h-3 w-3" />本月 +14.2%
                </span>
              }
            >
              收入来源（本月）
            </SectionTitle>
            <div className="space-y-4">
              {[
                { label: '付费会员订阅', value: '¥18,420', pct: 62, color: '#6366f1' },
                { label: '品牌合作', value: '¥7,200', pct: 24, color: '#ec4899' },
                { label: '课程销售', value: '¥3,100', pct: 11, color: '#10b981' },
                { label: '广告分成', value: '¥980', pct: 3, color: '#f59e0b' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium">{item.label}</span>
                    <span className="text-[12px] font-mono text-slate-700">{item.value}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                  <div className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5">{item.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

DASHBOARD = """\
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

        {/* ── KPI Row ───────────────────────────────────────────── */}
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

        {/* ── Chart + Agents ────────────────────────────────────── */}
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

        {/* ── Upcoming publishes ────────────────────────────────── */}
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
                      {{ draft: '草稿', queued: '已排期', published: '已发布', failed: '失败' }[d.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Activity + Todos ──────────────────────────────────── */}
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
"""

for fname, content in [('AnalyticsPage.tsx', ANALYTICS), ('DashboardPage.tsx', DASHBOARD)]:
    path = os.path.join(BASE, fname)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f'Written: {path}')

print('All done!')
