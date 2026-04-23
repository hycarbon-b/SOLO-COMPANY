import { Code, Play, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface StrategyCardProps {
  title: string;
  description: string;
  code: string;
}

export function StrategyCard({ title, description, code }: StrategyCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  const handleBacktest = () => {
    setIsBacktesting(true);
    // 模拟回测过程
    setTimeout(() => {
      setBacktestResult({
        totalReturn: 23.5,
        annualReturn: 18.2,
        sharpeRatio: 1.85,
        maxDrawdown: -8.3,
        winRate: 62.5,
        totalTrades: 156,
        profitFactor: 2.1,
      });
      setIsBacktesting(false);
    }, 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Card Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
          >
            <Code className="w-4 h-4" />
            {showCode ? '隐藏代码' : '查看代码'}
          </button>
          <button
            onClick={handleBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {isBacktesting ? '回测中...' : '回测'}
          </button>
        </div>

        {/* Code Display */}
        {showCode && (
          <div className="mb-4">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
              <code>{code}</code>
            </pre>
          </div>
        )}

        {/* Backtest Results */}
        {backtestResult && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">回测结果</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">总收益率</div>
                <div className={`text-lg font-semibold ${backtestResult.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                  {backtestResult.totalReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {backtestResult.totalReturn >= 0 ? '+' : ''}{backtestResult.totalReturn}%
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">年化收益</div>
                <div className="text-lg font-semibold text-gray-900">
                  {backtestResult.annualReturn}%
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">夏普比率</div>
                <div className="text-lg font-semibold text-gray-900">
                  {backtestResult.sharpeRatio}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">最大回撤</div>
                <div className={`text-lg font-semibold ${backtestResult.maxDrawdown >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {backtestResult.maxDrawdown}%
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">胜率</div>
                <div className="text-lg font-semibold text-gray-900">
                  {backtestResult.winRate}%
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">交易次数</div>
                <div className="text-lg font-semibold text-gray-900">
                  {backtestResult.totalTrades}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
