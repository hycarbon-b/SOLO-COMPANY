import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader, StatCard, Badge } from '../components/common';
import { ENGAGEMENT_BAR } from '@/services/mock';
import { ChevronDown } from 'lucide-react';

type DateRange = '7日' | '30日' | '90日';

const TOP_CONTENT = [
  { title: '一人公司启动指南：从 0 到 1 的 7 个动作', views: '24.3k', platforms: 3, cr: '4.2%' },
  { title: 'AI 工具栈拆解 · 2026', views: '18.1k', platforms: 3, cr: '3.8%' },
  { title: '副业转主业的三组现金流', views: '12.8k', platforms: 2, cr: '3.1%' },
  { title: '直播切片 #14 · 选品 SOP', views: '9.2k', platforms: 2, cr: '5.6%' },
  { title: '今日实验：用 GPT 写带货文案', views: '6.5k', platforms: 2, cr: '2.3%' },
];

// Multipliers to simulate different date range data
const RANGE_MULT: Record<DateRange, number> = { '7日': 1, '30日': 4.2, '90日': 11.8 };
const KPI_BASE = [
  { label: '总曝光', value: 93400, delta: '+18.2%' },
  { label: '总互动', value: 10300, delta: '+22.4%' },
  { label: '互动率', value: '11.0%', delta: '+0.8 pp', static: true },
  { label: '新增粉丝', value: 1284, delta: '+9.6%' },
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
          title="数据分析 Analytics"
          description="跨平台曝光、互动、转化总览。"
          actions={
            <div
              className="flex gap-1 p-1 rounded-lg"
              style={{ background: 'var(--panel-muted)' }}
              data-testid="date-range-selector"
            >
              {(['7日', '30日', '90日'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                    range === r ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                  }`}
                  data-testid={`range-${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_BASE.map((k) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.static ? k.value : formatNum(Math.round((k.value as number) * mult))}
              delta={k.delta}
            />
          ))}
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">各平台曝光 vs 互动</h3>
            <span data-testid="range-badge"><Badge color="indigo">{range}</Badge></span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={scaledBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatNum(v)} />
                <Tooltip formatter={(v: number) => formatNum(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="impressions" fill="#6366f1" radius={[6, 6, 0, 0]} name="曝光" />
                <Bar dataKey="engagement" fill="#ec4899" radius={[6, 6, 0, 0]} name="互动" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top content with expandable detail */}
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">热门内容 Top 5</h3>
            <ol className="space-y-1 text-sm">
              {TOP_CONTENT.map((item, i) => (
                <li key={item.title} className="border-b last:border-0" style={{ borderColor: 'var(--panel-border)' }}>
                  <button
                    className="w-full flex items-center justify-between gap-3 py-2 text-left hover:bg-slate-50 rounded-lg px-1 transition"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <span className="truncate flex-1">
                      <span className="text-[color:var(--muted-foreground)] mr-2">#{i + 1}</span>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-[color:var(--muted-foreground)]">
                        {item.views}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[color:var(--muted-foreground)] transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {expanded === i && (
                    <div
                      className="px-2 pb-2.5 pt-1 text-xs grid grid-cols-3 gap-2 text-[color:var(--muted-foreground)]"
                    >
                      <div>
                        <div className="font-semibold text-slate-700">曝光</div>
                        <div>{item.views}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">发布平台</div>
                        <div>{item.platforms} 个</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">转化率</div>
                        <div>{item.cr}</div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Revenue breakdown */}
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">收入来源（本月）</h3>
            <ul className="space-y-3 text-sm">
              {[
                ['付费会员订阅', '¥18,420', 62],
                ['品牌合作', '¥7,200', 24],
                ['课程销售', '¥3,100', 11],
                ['广告分成', '¥980', 3],
              ].map(([k, v, w]) => (
                <li key={k as string}>
                  <div className="flex items-center justify-between text-xs">
                    <span>{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${w as number}%`,
                        background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

