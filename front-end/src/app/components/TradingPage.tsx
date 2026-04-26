import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Briefcase, BarChart2 } from 'lucide-react';

const tabs = ['模拟盘交易', '实盘交易'];

// ── 持仓数据 ────────────────────────────────────────────────
interface Holding {
  symbol: string;
  tvSymbol: string; // TradingView symbol, e.g. "NASDAQ:AAPL"
  name: string;
  qty: number;
  costPrice: number;
  currentPrice: number;
}

const mockHoldings: Record<string, Holding[]> = {
  '模拟盘交易': [
    { symbol: 'AAPL',  tvSymbol: 'NASDAQ:AAPL',  name: '苹果公司', qty: 100, costPrice: 172.10, currentPrice: 175.43 },
    { symbol: 'MSFT',  tvSymbol: 'NASDAQ:MSFT',  name: '微软',     qty: 75,  costPrice: 412.50, currentPrice: 420.15 },
    { symbol: 'NVDA',  tvSymbol: 'NASDAQ:NVDA',  name: '英伟达',   qty: 40,  costPrice: 870.00, currentPrice: 905.60 },
    { symbol: 'META',  tvSymbol: 'NASDAQ:META',  name: 'Meta',     qty: 60,  costPrice: 495.20, currentPrice: 481.30 },
    { symbol: 'TSLA',  tvSymbol: 'NASDAQ:TSLA',  name: '特斯拉',   qty: 30,  costPrice: 175.00, currentPrice: 182.62 },
    { symbol: 'AMZN',  tvSymbol: 'NASDAQ:AMZN',  name: '亚马逊',   qty: 25,  costPrice: 185.00, currentPrice: 178.25 },
    { symbol: 'GOOGL', tvSymbol: 'NASDAQ:GOOGL', name: '谷歌',     qty: 80,  costPrice: 140.00, currentPrice: 142.38 },
    { symbol: 'TSM',   tvSymbol: 'NYSE:TSM',     name: '台积电',   qty: 120, costPrice: 155.30, currentPrice: 162.40 },
  ],
  '实盘交易': [
    { symbol: 'GOOGL', tvSymbol: 'NASDAQ:GOOGL', name: '谷歌',     qty: 200, costPrice: 138.00, currentPrice: 142.38 },
    { symbol: 'AMZN',  tvSymbol: 'NASDAQ:AMZN',  name: '亚马逊',   qty: 150, costPrice: 182.80, currentPrice: 178.25 },
    { symbol: 'NVDA',  tvSymbol: 'NASDAQ:NVDA',  name: '英伟达',   qty: 20,  costPrice: 850.00, currentPrice: 905.60 },
    { symbol: 'BRK.B', tvSymbol: 'NYSE:BRK.B',  name: '伯克希尔', qty: 50,  costPrice: 408.00, currentPrice: 415.20 },
  ],
};

// ── 交易记录数据 ──────────────────────────────────────────────
const mockTrades = {
  '模拟盘交易': [
    { id: '1', symbol: 'AAPL', name: '苹果公司', type: 'buy',  price: 175.43, amount: 100, time: '10:23:15', profit:  245.50, profitPercent:  1.4 },
    { id: '2', symbol: 'TSLA', name: '特斯拉',   type: 'sell', price: 182.62, amount:  50, time: '09:45:32', profit: -123.20, profitPercent: -0.7 },
    { id: '3', symbol: 'MSFT', name: '微软',     type: 'buy',  price: 420.15, amount:  75, time: '09:12:08', profit:  567.80, profitPercent:  1.8 },
  ],
  '实盘交易': [
    { id: '4', symbol: 'GOOGL', name: '谷歌',   type: 'buy',  price: 142.38, amount: 200, time: '14:30:22', profit:  850.00, profitPercent:  3.0 },
    { id: '5', symbol: 'AMZN',  name: '亚马逊', type: 'sell', price: 178.25, amount: 150, time: '13:15:44', profit: -425.30, profitPercent: -1.6 },
  ],
};

// ── TradingView Mini Symbol Overview 卡片 ─────────────────────
function TradingViewMiniWidget({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Clear any previously injected widget
    container.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: 240,
      height: 160,
      locale: 'zh_CN',
      dateRange: '1M',
      colorTheme: 'light',
      isTransparent: true,
      autosize: false,
      largeChartUrl: '',
      noTimeScale: false,
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [tvSymbol]);

  return <div ref={containerRef} className="tradingview-widget-container w-full" />;
}

// ── 持仓卡片 ─────────────────────────────────────────────────
function TradingViewCard({ holding }: { holding: Holding }) {
  const pnl = (holding.currentPrice - holding.costPrice) * holding.qty;
  const pnlPct = ((holding.currentPrice - holding.costPrice) / holding.costPrice) * 100;
  const isPositive = pnl >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* TradingView mini symbol overview */}
      <TradingViewMiniWidget tvSymbol={holding.tvSymbol} />

      {/* Holdings info footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span>持仓 <span className="font-medium text-gray-700">{holding.qty}</span> 股</span>
          <span className="mx-2 text-gray-200">|</span>
          <span>成本 <span className="font-medium text-gray-700">${holding.costPrice.toFixed(2)}</span></span>
        </div>
        <div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}${pnl.toFixed(0)}
          <span className="text-xs font-normal ml-1">({isPositive ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
        </div>
      </div>
    </div>
  );
}

// ── 分区标题组件 ──────────────────────────────────────────────
function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-2 text-gray-700">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        {count !== undefined && (
          <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <div className="flex-1 h-px bg-gray-100 ml-2" />
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export function TradingPage() {
  const [activeTab, setActiveTab] = useState('模拟盘交易');

  const currentTrades   = mockTrades[activeTab as keyof typeof mockTrades] || [];
  const currentHoldings = mockHoldings[activeTab as keyof typeof mockHoldings] || [];

  const totalProfit     = currentTrades.reduce((sum, t) => sum + t.profit, 0);
  const totalTrades     = currentTrades.length;
  const winRate         = currentTrades.filter(t => t.profit > 0).length / totalTrades * 100;
  const totalHoldingPnl = currentHoldings.reduce(
    (sum, h) => sum + (h.currentPrice - h.costPrice) * h.qty, 0
  );

  return (
    <div className="h-full flex flex-col bg-[#f8f9fb]">
      {/* ── Page header ── */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">交易管理</h2>
      </div>

      {/* ── Tabs ── */}
      <div className="px-6 pt-4 pb-0 bg-white border-b border-gray-100">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-400 mb-0.5">交易盈亏</div>
              <div className={`text-base font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-400 mb-0.5">持仓盈亏</div>
              <div className={`text-base font-semibold ${totalHoldingPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalHoldingPnl >= 0 ? '+' : ''}{totalHoldingPnl.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <Activity className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-400 mb-0.5">交易次数</div>
              <div className="text-base font-semibold text-gray-900">{totalTrades}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <TrendingUp className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-400 mb-0.5">胜率</div>
              <div className="text-base font-semibold text-gray-900">{winRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

        {/* ── 持仓区 ── */}
        <section>
          <SectionHeader
            icon={<Briefcase className="w-4 h-4" />}
            title="当前持仓"
            count={currentHoldings.length}
          />
          {currentHoldings.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">暂无持仓</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
              {currentHoldings.map((h) => (
                <div key={h.symbol} className="shrink-0 w-[240px]">
                  <TradingViewCard holding={h} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 交易记录区 ── */}
        <section>
          <SectionHeader
            icon={<BarChart2 className="w-4 h-4" />}
            title="交易记录"
            count={currentTrades.length}
          />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">股票</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">方向</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">价格</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">数量</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">盈亏</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium text-gray-900">{trade.symbol}</div>
                      <div className="text-xs text-gray-400">{trade.name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                        trade.type === 'buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {trade.type === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trade.type === 'buy' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-700">${trade.price.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-700">{trade.amount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className={`text-sm font-medium ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                      </div>
                      <div className={`text-xs ${trade.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-400">{trade.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
