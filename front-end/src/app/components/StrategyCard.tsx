import { Code, Play, TrendingUp, TrendingDown, FileText, Clock, BarChart2, ShieldCheck, Cpu } from 'lucide-react';
import { useState } from 'react';
import type { TabType } from './MainContent';

const REPORT_URL =
  'file://wsl.localhost/Ubuntu-22.04/home/chen/.openclaw/workspace/reports/report_600519_SH_vol_price_divergence_20260427_004854.html';

interface StrategyCardProps {
  title: string;
  description: string;
  code: string;
  onOpenTab?: (type: TabType, title: string, taskId?: string, url?: string) => void;
}

// ── 小进度步骤 ────────────────────────────────────────────────────────────
const BACKTEST_STEPS = [
  '加载历史行情数据 (2020-01 ~ 2024-01)…',
  '逐日回放，生成交易信号…',
  '计算持仓 PnL 与风控触发…',
  '统计绩效指标 & 生成 HTML 报告…',
];

type BacktestState = 'idle' | 'running' | 'done';

export function StrategyCard({ title, description, code, onOpenTab }: StrategyCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [backtestState, setBacktestState] = useState<BacktestState>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [backtestResult, setBacktestResult] = useState<{
    totalReturn: number; annualReturn: number; sharpeRatio: number;
    maxDrawdown: number; winRate: number; totalTrades: number; profitFactor: number;
  } | null>(null);

  const handleBacktest = () => {
    setBacktestState('running');
    setCurrentStep(0);

    // 模拟逐步推进进度
    BACKTEST_STEPS.forEach((_, idx) => {
      setTimeout(() => setCurrentStep(idx + 1), (idx + 1) * 600);
    });

    setTimeout(() => {
      setBacktestResult({
        totalReturn: 23.5, annualReturn: 18.2, sharpeRatio: 1.85,
        maxDrawdown: -8.3, winRate: 62.5, totalTrades: 156, profitFactor: 2.1,
      });
      setBacktestState('done');
    }, BACKTEST_STEPS.length * 600 + 400);
  };

  const handleViewReport = () => {
    onOpenTab?.('web', '策略回测报告', undefined, REPORT_URL);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      {/* ── 卡片头部 ─────────────────────────────────────────── */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
          <span className="flex-shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            已生成
          </span>
        </div>

        {/* 元数据标签 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { icon: <BarChart2 className="w-3 h-3" />, text: 'A 股主板·日线' },
            { icon: <Clock className="w-3 h-3" />, text: '2020-01 ~ 2024-01' },
            { icon: <Cpu className="w-3 h-3" />, text: 'Python · Freqtrade' },
            { icon: <ShieldCheck className="w-3 h-3" />, text: '止损 2% / 冷静 2 日' },
          ].map(({ icon, text }) => (
            <span key={text} className="flex items-center gap-1 text-xs text-gray-600 bg-white/70 border border-gray-200 px-2 py-0.5 rounded-md">
              {icon}{text}
            </span>
          ))}
        </div>
      </div>

      {/* ── 策略参数面板 ──────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">策略参数</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '短周期均线', value: '5 日 SMA' },
            { label: '长周期均线', value: '20 日 SMA' },
            { label: '最大仓位', value: '95%' },
            { label: '单笔下单比', value: '50%' },
            { label: '止损线', value: '−2%' },
            { label: '连亏冷静期', value: '3 次 / 2 日' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
              <div className="text-sm font-semibold text-gray-800">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 操作按钮行 ────────────────────────────────────────── */}
      <div className="px-4 py-4 flex gap-2">
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
        >
          <Code className="w-4 h-4" />
          {showCode ? '隐藏代码' : '查看代码'}
        </button>

        {backtestState === 'idle' && (
          <button
            onClick={handleBacktest}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <Play className="w-4 h-4" />
            回测
          </button>
        )}

        {backtestState === 'running' && (
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-blue-400 text-white rounded-lg text-sm cursor-not-allowed"
          >
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            回测中…
          </button>
        )}

        {backtestState === 'done' && (
          <button
            onClick={handleViewReport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            查看报告
          </button>
        )}
      </div>

      {/* ── 代码展示 ──────────────────────────────────────────── */}
      {showCode && (
        <div className="px-4 pt-3">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
            <code>{code}</code>
          </pre>
        </div>
      )}

      {/* ── 回测进度 ──────────────────────────────────────────── */}
      {backtestState === 'running' && (
        <div className="mx-4 mt-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">回测进度</p>
          <ul className="space-y-1.5">
            {BACKTEST_STEPS.map((step, idx) => (
              <li key={idx} className={`flex items-center gap-2 text-xs transition-colors ${
                idx < currentStep ? 'text-emerald-600' : idx === currentStep ? 'text-blue-600 animate-pulse' : 'text-gray-400'
              }`}>
                {idx < currentStep ? (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0 inline-block" />
                )}
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 回测结果 ──────────────────────────────────────────── */}
      {backtestState === 'done' && backtestResult && (
        <div className="mx-4 mt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">回测结果摘要</p>
            <span className="text-xs text-gray-400">点击「查看报告」获取完整分析</span>
          </div>

          {/* 关键指标 2列网格 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: '总收益率', value: `+${backtestResult.totalReturn}%`, positive: true },
              { label: '年化收益', value: `${backtestResult.annualReturn}%`, positive: true },
              { label: '夏普比率', value: String(backtestResult.sharpeRatio), positive: true },
              { label: '最大回撤', value: `${backtestResult.maxDrawdown}%`, positive: false },
              { label: '胜率', value: `${backtestResult.winRate}%`, positive: true },
              { label: '交易次数', value: String(backtestResult.totalTrades), positive: true },
            ].map(({ label, value, positive }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-sm font-semibold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* 盈亏因子条形 */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">盈亏因子（Profit Factor）</span>
              <span className="text-sm font-semibold text-emerald-600">{backtestResult.profitFactor}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((backtestResult.profitFactor / 3) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

