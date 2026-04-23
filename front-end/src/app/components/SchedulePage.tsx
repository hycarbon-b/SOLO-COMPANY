import { useMemo, useState } from 'react';
import { Clock3, CalendarClock, PlayCircle, PauseCircle, CheckCircle2, AlertTriangle, ChevronRight, TimerReset, BellRing, Workflow, Repeat2 } from 'lucide-react';

type TaskStatus = 'running' | 'paused' | 'success' | 'warning';

type ScheduleTask = {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  nextRun: string;
  lastRun: string;
  duration: string;
  workspace: string;
  createdBy: string;
  timezone: string;
  status: TaskStatus;
  recentOutput: string;
  trigger: string;
  tags: string[];
  metrics: {
    successRate: string;
    avgDuration: string;
    runs: number;
  };
  timeline: Array<{
    time: string;
    title: string;
    detail: string;
    type: 'info' | 'success' | 'warning';
  }>;
};

const scheduledTasks: ScheduleTask[] = [
  {
    id: 'morning-market-brief',
    name: '早盘行情简报',
    prompt: '每天开盘前汇总 A 股与加密市场隔夜波动、热点板块、异动个股，并生成可直接发送的晨会摘要。',
    schedule: '每个交易日 08:45',
    nextRun: '今天 08:45',
    lastRun: '今天 08:45',
    duration: '2分18秒',
    workspace: 'trade-agent / hsm-console',
    createdBy: 'YUANJI T',
    timezone: 'Asia/Shanghai',
    status: 'running',
    recentOutput: '已生成今日 A 股早盘摘要、BTC 夜盘波动提醒、热点板块 Top 5。',
    trigger: '按工作日循环',
    tags: ['行情', '晨报', '交易日'],
    metrics: {
      successRate: '98.2%',
      avgDuration: '2分05秒',
      runs: 46,
    },
    timeline: [
      {
        time: '08:45',
        title: '任务启动',
        detail: '已拉取沪深两市竞价数据、BTC/ETH 夜盘涨跌与北向资金预估。',
        type: 'info',
      },
      {
        time: '08:46',
        title: '内容生成完成',
        detail: '输出晨报 Markdown 与摘要卡片，已同步到消息面板。',
        type: 'success',
      },
      {
        time: '08:47',
        title: '待人工确认',
        detail: '发现 2 条新闻标题存在语义重合，建议发送前快速过目。',
        type: 'warning',
      },
    ],
  },
  {
    id: 'strategy-backtest-nightly',
    name: '策略回测夜跑',
    prompt: '每日收盘后批量回测双均线、趋势跟踪、网格策略，更新近 30 日收益率、回撤和胜率。',
    schedule: '每天 21:30',
    nextRun: '今天 21:30',
    lastRun: '昨天 21:30',
    duration: '14分52秒',
    workspace: 'trade-agent',
    createdBy: '策略顾问',
    timezone: 'Asia/Shanghai',
    status: 'success',
    recentOutput: '已完成 12 个策略组合回测，双均线策略夏普比率提升至 1.42。',
    trigger: '按自然日循环',
    tags: ['回测', '策略', '日报'],
    metrics: {
      successRate: '100%',
      avgDuration: '13分40秒',
      runs: 28,
    },
    timeline: [
      {
        time: '21:30',
        title: '回测任务入队',
        detail: '读取最新行情收盘数据，开始刷新策略参数。',
        type: 'info',
      },
      {
        time: '21:41',
        title: '回测完成',
        detail: '已生成收益曲线、参数对比表和风险提示摘要。',
        type: 'success',
      },
    ],
  },
  {
    id: 'risk-check-alert',
    name: '持仓风控巡检',
    prompt: '每 2 小时扫描重点持仓的回撤、波动率和消息面异动，触发风险预警并附操作建议。',
    schedule: '每 2 小时',
    nextRun: '今天 12:00',
    lastRun: '今天 10:00',
    duration: '48秒',
    workspace: 'trade-agent / mobile',
    createdBy: '风险管理师',
    timezone: 'Asia/Shanghai',
    status: 'paused',
    recentOutput: '当前暂停，等待你确认新的预警阈值。',
    trigger: '固定间隔轮询',
    tags: ['风控', '预警', '轮询'],
    metrics: {
      successRate: '96.4%',
      avgDuration: '55秒',
      runs: 135,
    },
    timeline: [
      {
        time: '10:00',
        title: '最近一次巡检',
        detail: '检测到新能源仓位波动率抬升 18%，但尚未达到告警阈值。',
        type: 'info',
      },
      {
        time: '10:02',
        title: '任务已暂停',
        detail: '由于阈值策略更新中，自动预警暂时关闭。',
        type: 'warning',
      },
    ],
  },
  {
    id: 'weekly-token-report',
    name: '周度用量复盘',
    prompt: '每周一整理 Token 用量、调用峰值、模型成本构成，并生成管理层复盘摘要。',
    schedule: '每周一 09:30',
    nextRun: '下周一 09:30',
    lastRun: '本周一 09:30',
    duration: '4分06秒',
    workspace: 'hsm-console',
    createdBy: '运营分析',
    timezone: 'Asia/Shanghai',
    status: 'warning',
    recentOutput: '上周 GPT-5.4 调用成本偏高，建议下周调低长链路任务频率。',
    trigger: '按周循环',
    tags: ['用量', '复盘', '周报'],
    metrics: {
      successRate: '91.7%',
      avgDuration: '3分48秒',
      runs: 12,
    },
    timeline: [
      {
        time: '09:30',
        title: '周报生成完成',
        detail: '统计了 4 个 workspace 的 Token 消耗与成本分布。',
        type: 'success',
      },
      {
        time: '09:32',
        title: '发现异常峰值',
        detail: '上周三 16:00 的多模型并发导致成本抬升，建议重点复盘。',
        type: 'warning',
      },
    ],
  },
];

const statusConfig: Record<TaskStatus, { label: string; chip: string; dot: string; icon: typeof PlayCircle }> = {
  running: {
    label: '运行中',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: PlayCircle,
  },
  paused: {
    label: '已暂停',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: PauseCircle,
  },
  success: {
    label: '最近成功',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: CheckCircle2,
  },
  warning: {
    label: '需要关注',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
};

const timelineTone = {
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
};

export function SchedulePage() {
  const [selectedTaskId, setSelectedTaskId] = useState(scheduledTasks[0].id);

  const selectedTask = useMemo(
    () => scheduledTasks.find((task) => task.id === selectedTaskId) ?? scheduledTasks[0],
    [selectedTaskId]
  );

  const runningCount = scheduledTasks.filter((task) => task.status === 'running').length;
  const pausedCount = scheduledTasks.filter((task) => task.status === 'paused').length;
  const weeklyRuns = scheduledTasks.reduce((sum, task) => sum + task.metrics.runs, 0);
  const successAverage = Math.round(
    scheduledTasks.reduce((sum, task) => sum + parseFloat(task.metrics.successRate), 0) / scheduledTasks.length
  );

  return (
    <div className="h-full bg-[#f7f8fa] overflow-hidden">
      <div className="h-full p-5">
        <div className="h-full rounded-[28px] border border-gray-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  自动执行任务
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">定时任务</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                  按照固定时间或周期自动执行分析、回测、预警、复盘任务。整体布局参考 OpenClaw 的任务管理方式，左侧看任务队列，右侧看详情、运行状态和最近执行轨迹。
                </p>
              </div>

              <div className="grid min-w-[420px] grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">运行中</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{runningCount}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">已暂停</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{pausedCount}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">累计运行</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{weeklyRuns}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">平均成功率</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{successAverage}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid h-[calc(100%-133px)] grid-cols-[360px_minmax(0,1fr)]">
            <aside className="border-r border-gray-100 bg-gray-50/70 p-4">
              <div className="mb-4 flex items-center justify-between px-2">
                <div>
                  <div className="text-sm font-medium text-gray-900">任务队列</div>
                  <div className="mt-1 text-xs text-gray-500">按状态和执行频率管理自动流程</div>
                </div>
                <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500">
                  {scheduledTasks.length} 个任务
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1">
                {scheduledTasks.map((task) => {
                  const status = statusConfig[task.status];
                  const StatusIcon = status.icon;
                  const active = task.id === selectedTask.id;

                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? 'border-blue-200 bg-white shadow-[0_8px_24px_rgba(59,130,246,0.08)]'
                          : 'border-transparent bg-white/80 hover:border-gray-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`}></span>
                            <span className="text-sm font-medium text-gray-900">{task.name}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">{task.prompt}</p>
                        </div>
                        <ChevronRight className={`mt-0.5 h-4 w-4 flex-shrink-0 ${active ? 'text-blue-500' : 'text-gray-300'}`} />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${status.chip}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-500">
                          <Repeat2 className="h-3.5 w-3.5" />
                          {task.schedule}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <div>下次运行</div>
                          <div className="mt-1 font-medium text-gray-900">{task.nextRun}</div>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <div>平均耗时</div>
                          <div className="mt-1 font-medium text-gray-900">{task.metrics.avgDuration}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-w-0 overflow-y-auto bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold text-gray-950">{selectedTask.name}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusConfig[selectedTask.status].chip}`}>
                      {statusConfig[selectedTask.status].label}
                    </span>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">{selectedTask.prompt}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
                  <div className="text-xs text-gray-500">最近执行耗时</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{selectedTask.duration}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    调度周期
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-950">{selectedTask.schedule}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <TimerReset className="h-3.5 w-3.5" />
                    下次执行
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-950">{selectedTask.nextRun}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Workflow className="h-3.5 w-3.5" />
                    工作区
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-950">{selectedTask.workspace}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <BellRing className="h-3.5 w-3.5" />
                    触发方式
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-950">{selectedTask.trigger}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-6">
                <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">任务详情</div>
                      <div className="mt-1 text-xs text-gray-500">补充展示调度配置、运行指标和最近输出</div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs text-gray-500">{selectedTask.timezone}</div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">创建人</div>
                      <div className="mt-1 font-medium text-gray-900">{selectedTask.createdBy}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">最近执行</div>
                      <div className="mt-1 font-medium text-gray-900">{selectedTask.lastRun}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">成功率</div>
                      <div className="mt-1 font-medium text-gray-900">{selectedTask.metrics.successRate}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">累计运行次数</div>
                      <div className="mt-1 font-medium text-gray-900">{selectedTask.metrics.runs}</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white px-4 py-4">
                    <div className="text-xs text-gray-500">最近输出</div>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{selectedTask.recentOutput}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5">
                  <div className="text-sm font-medium text-gray-900">最近执行轨迹</div>
                  <div className="mt-1 text-xs text-gray-500">帮助快速判断任务是否稳定、哪里需要介入</div>

                  <div className="mt-5 space-y-4">
                    {selectedTask.timeline.map((item) => (
                      <div key={`${selectedTask.id}-${item.time}-${item.title}`} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`mt-1 h-2.5 w-2.5 rounded-full ${item.type === 'success' ? 'bg-emerald-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                          <div className="mt-1 h-full w-px bg-gray-200 last:hidden"></div>
                        </div>
                        <div className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm font-medium text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-400">{item.time}</div>
                          </div>
                          <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] ${timelineTone[item.type]}`}>
                            {item.type === 'success' ? '成功' : item.type === 'warning' ? '提醒' : '信息'}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-600">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
