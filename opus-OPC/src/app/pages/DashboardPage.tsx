import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PageHeader, StatCard, Badge } from '../components/common';
import { KPI, FOLLOWER_TREND, DRAFTS, AGENTS, ACTIVITY_FEED } from '@/services/mock';

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
