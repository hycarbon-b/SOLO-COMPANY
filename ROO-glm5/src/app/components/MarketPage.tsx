import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Search,
  Star,
  StarOff,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  ChevronDown,
  RefreshCw,
  Monitor,
} from 'lucide-react';

// === Types ===
interface StockInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  time: string;
}

interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// === Constants ===
const MARKET_TABS = [
  { key: 'us', label: '美股', suffix: '' },
  { key: 'hk', label: '港股', suffix: '' },
  { key: 'a', label: 'A股', suffix: '' },
];

const TIME_TABS = ['日线', '周线', '月线', '1分钟', '5分钟', '15分钟', '30分钟', '60分钟'];

// === Mock Data ===
const generateKLineData = (base: number, days: number, trend: 'up' | 'down' | 'flat'): KLineData[] => {
  const data: KLineData[] = [];
  let price = base;
  const now = new Date('2026-04-22');

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const volatility = base * 0.02;
    const drift = trend === 'up' ? base * 0.001 : trend === 'down' ? -base * 0.001 : 0;
    const change = (Math.random() - 0.48) * volatility + drift;
    const open = price;
    price = Math.max(price + change, 1);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    data.push({
      date: dateStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000) + 5000000,
    });
  }
  return data;
};

const MOCK_STOCKS: Record<string, StockInfo[]> = {
  us: [
    { symbol: 'AAPL', name: '苹果公司', price: 215.32, change: 3.21, changePercent: 1.51, volume: '5,234万', marketCap: '3.28万亿', high: 217.45, low: 212.10, open: 212.50, prevClose: 212.11, time: '04/22 16:00' },
    { symbol: 'TSLA', name: '特斯拉', price: 248.50, change: -5.30, changePercent: -2.09, volume: '1.02亿', marketCap: '7,920亿', high: 255.80, low: 246.20, open: 254.00, prevClose: 253.80, time: '04/22 16:00' },
    { symbol: 'NVDA', name: '英伟达', price: 875.40, change: 18.60, changePercent: 2.17, volume: '4,521万', marketCap: '2.15万亿', high: 882.00, low: 860.50, open: 862.00, prevClose: 856.80, time: '04/22 16:00' },
    { symbol: 'MSFT', name: '微软', price: 415.80, change: 2.15, changePercent: 0.52, volume: '2,189万', marketCap: '3.09万亿', high: 418.20, low: 413.50, open: 414.00, prevClose: 413.65, time: '04/22 16:00' },
    { symbol: 'AMZN', name: '亚马逊', price: 192.30, change: 1.80, changePercent: 0.95, volume: '3,876万', marketCap: '2.01万亿', high: 194.00, low: 190.50, open: 191.00, prevClose: 190.50, time: '04/22 16:00' },
  ],
  hk: [
    { symbol: '0700.HK', name: '腾讯控股', price: 398.20, change: 8.40, changePercent: 2.16, volume: '2,341万', marketCap: '3.71万亿', high: 401.00, low: 390.50, open: 391.00, prevClose: 389.80, time: '04/22 16:09' },
    { symbol: '9988.HK', name: '阿里巴巴', price: 118.50, change: -2.30, changePercent: -1.90, volume: '5,678万', marketCap: '2.27万亿', high: 122.00, low: 117.80, open: 121.00, prevClose: 120.80, time: '04/22 16:09' },
    { symbol: '3690.HK', name: '美团', price: 182.60, change: 4.20, changePercent: 2.35, volume: '3,456万', marketCap: '1.13万亿', high: 185.00, low: 178.50, open: 179.00, prevClose: 178.40, time: '04/22 16:09' },
    { symbol: '9618.HK', name: '京东集团', price: 132.80, change: 1.50, changePercent: 1.14, volume: '2,189万', marketCap: '8,920亿', high: 134.50, low: 131.00, open: 131.50, prevClose: 131.30, time: '04/22 16:09' },
    { symbol: '1810.HK', name: '小米集团', price: 48.90, change: -0.80, changePercent: -1.61, volume: '6,543万', marketCap: '1.22万亿', high: 50.20, low: 48.50, open: 49.80, prevClose: 49.70, time: '04/22 16:09' },
  ],
  a: [
    { symbol: '600519.SH', name: '贵州茅台', price: 1680.50, change: 22.30, changePercent: 1.34, volume: '3.21万手', marketCap: '2.11万亿', high: 1695.00, low: 1658.20, open: 1660.00, prevClose: 1658.20, time: '15:00' },
    { symbol: '000858.SZ', name: '五粮液', price: 158.20, change: -1.80, changePercent: -1.13, volume: '4.56万手', marketCap: '6140亿', high: 161.00, low: 157.50, open: 160.50, prevClose: 160.00, time: '15:00' },
    { symbol: '601318.SH', name: '中国平安', price: 52.30, change: 0.85, changePercent: 1.65, volume: '5.89万手', marketCap: '9550亿', high: 53.00, low: 51.50, open: 51.80, prevClose: 51.45, time: '15:00' },
    { symbol: '000001.SZ', name: '平安银行', price: 12.45, change: 0.12, changePercent: 0.97, volume: '8.23万手', marketCap: '2420亿', high: 12.60, low: 12.30, open: 12.35, prevClose: 12.33, time: '15:00' },
    { symbol: '600036.SH', name: '招商银行', price: 38.90, change: 0.45, changePercent: 1.17, volume: '4.12万手', marketCap: '9720亿', high: 39.50, low: 38.40, open: 38.60, prevClose: 38.45, time: '15:00' },
  ],
};

const KLINE_DATA: Record<string, Record<string, KLineData[]>> = {
  us: { 日线: generateKLineData(200, 60, 'up'), 周线: generateKLineData(200, 52, 'up'), 月线: generateKLineData(200, 24, 'up'), '1分钟': generateKLineData(215, 60, 'flat'), '5分钟': generateKLineData(215, 48, 'flat'), '15分钟': generateKLineData(215, 32, 'up'), '30分钟': generateKLineData(215, 24, 'up'), '60分钟': generateKLineData(215, 20, 'down') },
  hk: { 日线: generateKLineData(380, 60, 'up'), 周线: generateKLineData(380, 52, 'up'), 月线: generateKLineData(380, 24, 'flat'), '1分钟': generateKLineData(398, 60, 'flat'), '5分钟': generateKLineData(398, 48, 'up'), '15分钟': generateKLineData(398, 32, 'up'), '30分钟': generateKLineData(398, 24, 'down'), '60分钟': generateKLineData(398, 20, 'up') },
  a: { 日线: generateKLineData(50, 60, 'up'), 周线: generateKLineData(50, 52, 'up'), 月线: generateKLineData(50, 24, 'up'), '1分钟': generateKLineData(1680, 60, 'flat'), '5分钟': generateKLineData(1680, 48, 'down'), '15分钟': generateKLineData(1680, 32, 'up'), '30分钟': generateKLineData(1680, 24, 'flat'), '60分钟': generateKLineData(1680, 20, 'up') },
};

const STOCK_DETAIL_STATS: Record<string, Record<string, { label: string; value: string }[]>> = {
  us: {
    AAPL: [
      { label: '今开', value: '212.50' },
      { label: '昨收', value: '212.11' },
      { label: '最高', value: '217.45' },
      { label: '最低', value: '212.10' },
      { label: '市值', value: '3.28万亿' },
      { label: '市盈率', value: '34.2x' },
      { label: '52周最高', value: '237.23' },
      { label: '52周最低', value: '164.08' },
      { label: '成交量', value: '5,234万' },
      { label: '换手率', value: '3.21%' },
      { label: '总股本', value: '152.4亿' },
      { label: '每股盈利', value: '6.29' },
    ],
  },
  hk: {
    '0700.HK': [
      { label: '今开', value: '391.00' },
      { label: '昨收', value: '389.80' },
      { label: '最高', value: '401.00' },
      { label: '最低', value: '390.50' },
      { label: '市值', value: '3.71万亿' },
      { label: '市盈率', value: '28.5x' },
      { label: '52周最高', value: '415.60' },
      { label: '52周最低', value: '285.40' },
      { label: '成交量', value: '2,341万' },
      { label: '换手率', value: '0.52%' },
      { label: '总股本', value: '93.2亿' },
      { label: '每股盈利', value: '13.97' },
    ],
  },
  a: {
    '600519.SH': [
      { label: '今开', value: '1,660.00' },
      { label: '昨收', value: '1,658.20' },
      { label: '最高', value: '1,695.00' },
      { label: '最低', value: '1,658.20' },
      { label: '市值', value: '2.11万亿' },
      { label: '市盈率', value: '28.7x' },
      { label: '52周最高', value: '1,877.00' },
      { label: '52周最低', value: '1,461.00' },
      { label: '成交量', value: '3.21万手' },
      { label: '成交额', value: '53.8亿' },
      { label: '总股本', value: '12.56亿' },
      { label: '每股盈利', value: '58.57' },
    ],
  },
};

// === Sub-components ===
function StockRow({ stock, isActive, onClick }: { stock: StockInfo; isActive: boolean; onClick: () => void }) {
  const isUp = stock.change >= 0;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all text-left ${
        isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
            {stock.symbol}
          </span>
          <span className="text-xs text-gray-400 truncate max-w-[60px]">{stock.name}</span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{stock.time}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-gray-900">{stock.price.toLocaleString()}</div>
        <div className={`text-xs font-medium mt-0.5 ${isUp ? 'text-red-500' : 'text-green-500'}`}>
          {isUp ? '+' : ''}{stock.change.toFixed(2)} {isUp ? '▲' : '▼'}
        </div>
      </div>
    </button>
  );
}

function KLineChart({ data, symbol, market }: { data: KLineData[]; symbol: string; market: string }) {
  const isUpTrend = data.length > 1 && data[data.length - 1].close >= data[0].close;
  const lineColor = isUpTrend ? '#ef4444' : '#22c55e';
  const fillGradientId = `gradient-${symbol.replace(/[^a-z0-9]/gi, '')}`;

  const minPrice = Math.min(...data.map(d => d.low)) * 0.998;
  const maxPrice = Math.max(...data.map(d => d.high)) * 1.002;

  const formatYAxis = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    if (market === 'a') return value.toFixed(0);
    return value.toFixed(1);
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          labelStyle={{ color: '#6b7280', marginBottom: 4 }}
          formatter={(value: number) => [value.toFixed(2), '价格']}
        />
        <ReferenceLine y={data[0]?.close} stroke={lineColor} strokeDasharray="4 4" strokeOpacity={0.5} />
        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={1.5}
          fill={`url(#${fillGradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// === Main Component ===
export function MarketPage() {
  const [market, setMarket] = useState<'us' | 'hk' | 'a'>('us');
  const [timeTab, setTimeTab] = useState('日线');
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'TSLA', 'NVDA']);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const stocks = MOCK_STOCKS[market];

  const activeStock = useMemo(() => {
    if (selectedStock) return selectedStock;
    return stocks[0] || null;
  }, [selectedStock, stocks]);

  const chartData = useMemo(() => {
    const key = activeStock?.symbol || 'AAPL';
    const marketKey = market;
    return KLINE_DATA[marketKey]?.[timeTab] || KLINE_DATA.us['日线'];
  }, [activeStock, market, timeTab]);

  const detailStats = useMemo(() => {
    if (!activeStock) return [];
    const s = STOCK_DETAIL_STATS[market]?.[activeStock.symbol];
    if (s) return s;
    return [
      { label: '今开', value: activeStock.open.toFixed(2) },
      { label: '昨收', value: activeStock.prevClose.toFixed(2) },
      { label: '最高', value: activeStock.high.toFixed(2) },
      { label: '最低', value: activeStock.low.toFixed(2) },
      { label: '市值', value: activeStock.marketCap },
      { label: '成交量', value: activeStock.volume },
      { label: '时间', value: activeStock.time },
    ];
  }, [activeStock, market]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;
    const q = searchQuery.toLowerCase();
    return stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }, [searchQuery, stocks]);

  const handleToggleWatchlist = (symbol: string) => {
    setWatchlist(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">行情</h2>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>

      {/* Market Tabs */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100">
        {MARKET_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setMarket(tab.key as 'us' | 'hk' | 'a');
              setSelectedStock(null);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              market === tab.key
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索股票..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none w-36 transition-all"
            />
          </div>
          <button
            onClick={() => setShowWatchlist(!showWatchlist)}
            className={`p-1.5 rounded-lg transition-colors ${showWatchlist ? 'bg-yellow-50 text-yellow-500' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Stock List */}
        <div className="w-[260px] border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Watchlist section */}
          {showWatchlist && watchlist.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-xs font-medium text-yellow-600 mb-1.5 flex items-center gap-1">
                <Star className="w-3 h-3" />
                我的自选
              </div>
              <div className="space-y-0.5">
                {stocks.filter(s => watchlist.includes(s.symbol)).map(stock => (
                  <StockRow
                    key={stock.symbol}
                    stock={stock}
                    isActive={activeStock?.symbol === stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                  />
                ))}
              </div>
              <div className="border-t border-gray-100 mt-2 pt-2" />
            </div>
          )}

          {/* Full list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <div className="space-y-0.5">
              {filteredStocks.map(stock => (
                <StockRow
                  key={stock.symbol}
                  stock={stock}
                  isActive={activeStock?.symbol === stock.symbol}
                  onClick={() => setSelectedStock(stock)}
                />
              ))}
            </div>
            {filteredStocks.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">未找到相关股票</div>
            )}
          </div>
        </div>

        {/* Center + Right: Chart + Stats */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeStock ? (
            <>
              {/* Stock Header */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{activeStock.symbol}</h3>
                      <button
                        onClick={() => handleToggleWatchlist(activeStock.symbol)}
                        className={`transition-colors ${watchlist.includes(activeStock.symbol) ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        {watchlist.includes(activeStock.symbol) ? (
                          <Star className="w-4 h-4 fill-current" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{activeStock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {activeStock.price.toLocaleString()}
                      {market === 'a' ? '' : ''}
                    </div>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      activeStock.change >= 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {activeStock.change >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span className="text-sm font-semibold">
                        {activeStock.change >= 0 ? '+' : ''}{activeStock.change.toFixed(2)} &nbsp;
                        ({activeStock.change >= 0 ? '+' : ''}{activeStock.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Tabs */}
              <div className="flex items-center gap-1 px-5 pb-2">
                {TIME_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTimeTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      timeTab === tab
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="px-3">
                <KLineChart data={chartData} symbol={activeStock.symbol} market={market} />
              </div>

              {/* Stats Grid */}
              <div className="px-5 py-3">
                <div className="grid grid-cols-6 gap-2">
                  {detailStats.map(stat => (
                    <div key={stat.label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className="text-xs text-gray-400 mb-0.5">{stat.label}</div>
                      <div className="text-sm font-semibold text-gray-800">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="px-5 pb-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  数据时间：{activeStock.time}
                </span>
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  延迟 15 分钟
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">请选择一只股票</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}