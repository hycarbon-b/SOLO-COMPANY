import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

const tabs = ['模拟盘交易', '实盘交易'];

const mockTrades = {
  '模拟盘交易': [
    { id: '1', symbol: 'AAPL', name: '苹果公司', type: 'buy', price: 175.43, amount: 100, time: '10:23:15', profit: 245.50, profitPercent: 1.4 },
    { id: '2', symbol: 'TSLA', name: '特斯拉', type: 'sell', price: 182.62, amount: 50, time: '09:45:32', profit: -123.20, profitPercent: -0.7 },
    { id: '3', symbol: 'MSFT', name: '微软', type: 'buy', price: 420.15, amount: 75, time: '09:12:08', profit: 567.80, profitPercent: 1.8 },
  ],
  '实盘交易': [
    { id: '4', symbol: 'GOOGL', name: '谷歌', type: 'buy', price: 142.38, amount: 200, time: '14:30:22', profit: 850.00, profitPercent: 3.0 },
    { id: '5', symbol: 'AMZN', name: '亚马逊', type: 'sell', price: 178.25, amount: 150, time: '13:15:44', profit: -425.30, profitPercent: -1.6 },
  ],
};

export function TradingPage() {
  const [activeTab, setActiveTab] = useState('模拟盘交易');

  const currentTrades = mockTrades[activeTab as keyof typeof mockTrades] || [];

  const totalProfit = currentTrades.reduce((sum, trade) => sum + trade.profit, 0);
  const totalTrades = currentTrades.length;
  const winRate = currentTrades.filter(t => t.profit > 0).length / totalTrades * 100;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">交易管理</h2>
      </div>

      {/* Tabs */}
      <div className="px-6 pb-2">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-6 bg-gray-50">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">总盈亏</span>
            </div>
            <div className={`text-2xl font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">交易次数</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{totalTrades}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">胜率</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">价格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">盈亏</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">时间</th>
              </tr>
            </thead>
            <tbody>
              {currentTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{trade.symbol}</div>
                      <div className="text-xs text-gray-500">{trade.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      trade.type === 'buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {trade.type === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trade.type === 'buy' ? '买入' : '卖出'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-gray-900">${trade.price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right text-sm text-gray-900">{trade.amount}</td>
                  <td className="px-4 py-4 text-right">
                    <div className={`text-sm font-medium ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                    </div>
                    <div className={`text-xs ${trade.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-gray-500">{trade.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
