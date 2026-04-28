import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Star,
  StarOff,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
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

// === Constants ===
const MARKET_TABS = [
  { key: 'a', label: 'A股' },
  { key: 'us', label: '美股' },
  { key: 'hk', label: '港股' },
];

const MOCK_STOCKS: Record<string, StockInfo[]> = {
  us: [
    { symbol: 'AAPL',  name: '苹果公司',   price: 215.32, change:  3.21, changePercent:  1.51, volume: '5,234万', marketCap: '3.28万亿', high: 217.45, low: 212.10, open: 212.50, prevClose: 212.11, time: '04/22 16:00' },
    { symbol: 'TSLA',  name: '特斯拉',     price: 248.50, change: -5.30, changePercent: -2.09, volume: '1.02亿',  marketCap: '7,920亿',  high: 255.80, low: 246.20, open: 254.00, prevClose: 253.80, time: '04/22 16:00' },
    { symbol: 'NVDA',  name: '英伟达',     price: 875.40, change: 18.60, changePercent:  2.17, volume: '4,521万', marketCap: '2.15万亿', high: 882.00, low: 860.50, open: 862.00, prevClose: 856.80, time: '04/22 16:00' },
    { symbol: 'MSFT',  name: '微软',       price: 415.80, change:  2.15, changePercent:  0.52, volume: '2,189万', marketCap: '3.09万亿', high: 418.20, low: 413.50, open: 414.00, prevClose: 413.65, time: '04/22 16:00' },
    { symbol: 'AMZN',  name: '亚马逊',     price: 192.30, change:  1.80, changePercent:  0.95, volume: '3,876万', marketCap: '2.01万亿', high: 194.00, low: 190.50, open: 191.00, prevClose: 190.50, time: '04/22 16:00' },
    { symbol: 'GOOGL', name: '谷歌',       price: 174.50, change:  2.30, changePercent:  1.34, volume: '2,012万', marketCap: '2.18万亿', high: 176.20, low: 172.80, open: 173.00, prevClose: 172.20, time: '04/22 16:00' },
    { symbol: 'META',  name: 'Meta',       price: 521.80, change:  8.20, changePercent:  1.60, volume: '1,543万', marketCap: '1.32万亿', high: 526.00, low: 514.50, open: 515.00, prevClose: 513.60, time: '04/22 16:00' },
    { symbol: 'NFLX',  name: '奈飞',       price: 638.40, change: -3.10, changePercent: -0.48, volume: '5,230千', marketCap: '2,760亿',  high: 645.00, low: 635.20, open: 641.50, prevClose: 641.50, time: '04/22 16:00' },
    { symbol: 'AMD',   name: 'AMD',        price: 164.70, change:  4.20, changePercent:  2.62, volume: '3,812万', marketCap: '2,668亿',  high: 167.30, low: 160.50, open: 161.00, prevClose: 160.50, time: '04/22 16:00' },
    { symbol: 'INTC',  name: '英特尔',     price: 21.35,  change: -0.35, changePercent: -1.61, volume: '4,230万', marketCap: '895亿',    high: 22.10,  low: 21.20,  open: 21.80,  prevClose: 21.70,  time: '04/22 16:00' },
    { symbol: 'JPM',   name: '摩根大通',   price: 248.20, change:  2.10, changePercent:  0.85, volume: '1,230万', marketCap: '7,130亿',  high: 250.50, low: 246.30, open: 246.80, prevClose: 246.10, time: '04/22 16:00' },
    { symbol: 'BAC',   name: '美国银行',   price: 43.15,  change: -0.80, changePercent: -1.82, volume: '3,450万', marketCap: '3,390亿',  high: 44.20,  low: 42.90,  open: 44.00,  prevClose: 43.95,  time: '04/22 16:00' },
    { symbol: 'V',     name: '维萨',       price: 339.80, change:  1.20, changePercent:  0.35, volume: '8,120千', marketCap: '6,880亿',  high: 341.50, low: 338.00, open: 338.60, prevClose: 338.60, time: '04/22 16:00' },
    { symbol: 'BRK.B', name: '伯克希尔B',  price: 479.50, change:  0.90, changePercent:  0.19, volume: '4,560千', marketCap: '1.05万亿', high: 481.00, low: 477.20, open: 478.00, prevClose: 478.60, time: '04/22 16:00' },
    { symbol: 'WMT',   name: '沃尔玛',     price: 97.30,  change:  0.50, changePercent:  0.52, volume: '1,890万', marketCap: '7,810亿',  high: 98.10,  low: 96.80,  open: 96.90,  prevClose: 96.80,  time: '04/22 16:00' },
  ],
  hk: [
    { symbol: '0700.HK', name: '腾讯控股', price: 398.20, change:  8.40, changePercent:  2.16, volume: '2,341万', marketCap: '3.71万亿', high: 401.00, low: 390.50, open: 391.00, prevClose: 389.80, time: '04/22 16:09' },
    { symbol: '9988.HK', name: '阿里巴巴', price: 118.50, change: -2.30, changePercent: -1.90, volume: '5,678万', marketCap: '2.27万亿', high: 122.00, low: 117.80, open: 121.00, prevClose: 120.80, time: '04/22 16:09' },
    { symbol: '3690.HK', name: '美团',     price: 182.60, change:  4.20, changePercent:  2.35, volume: '3,456万', marketCap: '1.13万亿', high: 185.00, low: 178.50, open: 179.00, prevClose: 178.40, time: '04/22 16:09' },
    { symbol: '9618.HK', name: '京东集团', price: 132.80, change:  1.50, changePercent:  1.14, volume: '2,189万', marketCap: '8,920亿',  high: 134.50, low: 131.00, open: 131.50, prevClose: 131.30, time: '04/22 16:09' },
    { symbol: '1810.HK', name: '小米集团', price: 48.90,  change: -0.80, changePercent: -1.61, volume: '6,543万', marketCap: '1.22万亿', high: 50.20,  low: 48.50,  open: 49.80,  prevClose: 49.70,  time: '04/22 16:09' },
    { symbol: '0941.HK', name: '中国移动', price: 88.50,  change:  0.60, changePercent:  0.68, volume: '1,823万', marketCap: '1.73万亿', high: 89.30,  low: 87.80,  open: 88.00,  prevClose: 87.90,  time: '04/22 16:09' },
    { symbol: '0388.HK', name: '港交所',   price: 312.00, change:  2.80, changePercent:  0.91, volume: '5,430千', marketCap: '3,980亿',  high: 315.00, low: 309.00, open: 309.50, prevClose: 309.20, time: '04/22 16:09' },
    { symbol: '2318.HK', name: '中国平安', price: 52.35,  change:  0.45, changePercent:  0.87, volume: '3,210万', marketCap: '9,560亿',  high: 53.00,  low: 51.80,  open: 52.00,  prevClose: 51.90,  time: '04/22 16:09' },
    { symbol: '0005.HK', name: '汇丰控股', price: 78.20,  change: -0.30, changePercent: -0.38, volume: '1,650万', marketCap: '1.58万亿', high: 79.00,  low: 77.80,  open: 78.50,  prevClose: 78.50,  time: '04/22 16:09' },
    { symbol: '2020.HK', name: '安踏体育', price: 89.15,  change:  1.20, changePercent:  1.36, volume: '2,340万', marketCap: '2,380亿',  high: 90.30,  low: 87.90,  open: 88.20,  prevClose: 87.95,  time: '04/22 16:09' },
    { symbol: '9999.HK', name: '网易',     price: 158.40, change:  2.10, changePercent:  1.34, volume: '1,120万', marketCap: '2,040亿',  high: 160.20, low: 156.50, open: 157.00, prevClose: 156.30, time: '04/22 16:09' },
    { symbol: '0175.HK', name: '吉利汽车', price: 18.02,  change: -0.20, changePercent: -1.10, volume: '4,560万', marketCap: '1,730亿',  high: 18.50,  low: 17.90,  open: 18.30,  prevClose: 18.22,  time: '04/22 16:09' },
    { symbol: '1211.HK', name: '比亚迪',   price: 298.00, change:  5.40, changePercent:  1.85, volume: '3,230万', marketCap: '8,630亿',  high: 301.00, low: 292.50, open: 293.00, prevClose: 292.60, time: '04/22 16:09' },
    { symbol: '9868.HK', name: '小鹏汽车', price: 82.30,  change:  1.80, changePercent:  2.24, volume: '2,100万', marketCap: '1,400亿',  high: 84.00,  low: 80.50,  open: 81.00,  prevClose: 80.50,  time: '04/22 16:09' },
    { symbol: '2015.HK', name: '理想汽车', price: 114.80, change: -2.30, changePercent: -1.96, volume: '2,870万', marketCap: '2,380亿',  high: 118.00, low: 114.00, open: 117.50, prevClose: 117.10, time: '04/22 16:09' },
  ],
  a: [
    { symbol: '600519.SH', name: '贵州茅台', price: 1680.50, change:  22.30, changePercent:  1.34, volume: '3.21万手', marketCap: '2.11万亿', high: 1695.00, low: 1658.20, open: 1660.00, prevClose: 1658.20, time: '15:00' },
    { symbol: '000858.SZ', name: '五粮液',   price:  158.20, change:  -1.80, changePercent: -1.13, volume: '4.56万手', marketCap: '6140亿',   high:  161.00, low:  157.50, open:  160.50, prevClose:  160.00, time: '15:00' },
    { symbol: '601318.SH', name: '中国平安', price:   52.30, change:   0.85, changePercent:  1.65, volume: '5.89万手', marketCap: '9550亿',   high:   53.00, low:   51.50, open:   51.80, prevClose:   51.45, time: '15:00' },
    { symbol: '000001.SZ', name: '平安银行', price:   12.45, change:   0.12, changePercent:  0.97, volume: '8.23万手', marketCap: '2420亿',   high:   12.60, low:   12.30, open:   12.35, prevClose:   12.33, time: '15:00' },
    { symbol: '600036.SH', name: '招商银行', price:   38.90, change:   0.45, changePercent:  1.17, volume: '4.12万手', marketCap: '9720亿',   high:   39.50, low:   38.40, open:   38.60, prevClose:   38.45, time: '15:00' },
    { symbol: '000333.SZ', name: '美的集团', price:   68.50, change:   0.80, changePercent:  1.18, volume: '3.45万手', marketCap: '4820亿',   high:   69.30, low:   67.80, open:   67.90, prevClose:   67.70, time: '15:00' },
    { symbol: '600900.SH', name: '长江电力', price:   26.80, change:   0.30, changePercent:  1.13, volume: '2.10万手', marketCap: '6450亿',   high:   27.10, low:   26.50, open:   26.60, prevClose:   26.50, time: '15:00' },
    { symbol: '601012.SH', name: '隆基绿能', price:   18.20, change:  -0.40, changePercent: -2.15, volume: '6.78万手', marketCap: '1380亿',   high:   18.80, low:   18.10, open:   18.70, prevClose:   18.60, time: '15:00' },
    { symbol: '002594.SZ', name: '比亚迪',   price:  285.00, change:   4.20, changePercent:  1.50, volume: '3.21万手', marketCap: '8250亿',   high:  288.00, low:  281.00, open:  282.00, prevClose:  280.80, time: '15:00' },
    { symbol: '000002.SZ', name: '万科A',    price:    8.80, change:  -0.10, changePercent: -1.12, volume: '5.63万手', marketCap: '1020亿',   high:    9.00, low:    8.72, open:    8.95, prevClose:    8.90, time: '15:00' },
    { symbol: '600887.SH', name: '伊利股份', price:   31.50, change:   0.25, changePercent:  0.80, volume: '2.34万手', marketCap: '2060亿',   high:   31.90, low:   31.20, open:   31.30, prevClose:   31.25, time: '15:00' },
    { symbol: '601166.SH', name: '兴业银行', price:   24.30, change:   0.18, changePercent:  0.75, volume: '4.56万手', marketCap: '5040亿',   high:   24.60, low:   24.10, open:   24.20, prevClose:   24.12, time: '15:00' },
    { symbol: '000568.SZ', name: '泸州老窖', price:  125.00, change:  -1.50, changePercent: -1.19, volume: '1.89万手', marketCap: '1820亿',   high:  127.50, low:  124.50, open:  127.00, prevClose:  126.50, time: '15:00' },
    { symbol: '002714.SZ', name: '牧原股份', price:   52.80, change:   0.90, changePercent:  1.73, volume: '2.45万手', marketCap: '2170亿',   high:   53.50, low:   51.90, open:   52.10, prevClose:   51.90, time: '15:00' },
    { symbol: '601888.SH', name: '中国国旅', price:  132.50, change:   1.80, changePercent:  1.38, volume: '1.23万手', marketCap: '2100亿',   high:  134.00, low:  130.80, open:  131.00, prevClose:  130.70, time: '15:00' },
  ],
};

// TradingView symbol map (stock symbol → TradingView exchange:symbol)
const TV_SYMBOL_MAP: Record<string, string> = {
  'AAPL':      'NASDAQ:AAPL',
  'TSLA':      'NASDAQ:TSLA',
  'NVDA':      'NASDAQ:NVDA',
  'MSFT':      'NASDAQ:MSFT',
  'AMZN':      'NASDAQ:AMZN',
  'GOOGL':     'NASDAQ:GOOGL',
  'META':      'NASDAQ:META',
  'NFLX':      'NASDAQ:NFLX',
  'AMD':       'NASDAQ:AMD',
  'INTC':      'NASDAQ:INTC',
  'JPM':       'NYSE:JPM',
  'BAC':       'NYSE:BAC',
  'V':         'NYSE:V',
  'BRK.B':     'NYSE:BRK.B',
  'WMT':       'NYSE:WMT',
  '0700.HK':   'HKEX:700',
  '9988.HK':   'HKEX:9988',
  '3690.HK':   'HKEX:3690',
  '9618.HK':   'HKEX:9618',
  '1810.HK':   'HKEX:1810',
  '0941.HK':   'HKEX:941',
  '0388.HK':   'HKEX:388',
  '2318.HK':   'HKEX:2318',
  '0005.HK':   'HKEX:5',
  '2020.HK':   'HKEX:2020',
  '9999.HK':   'HKEX:9999',
  '0175.HK':   'HKEX:175',
  '1211.HK':   'HKEX:1211',
  '9868.HK':   'HKEX:9868',
  '2015.HK':   'HKEX:2015',
  '600519.SH': 'SSE:600519',
  '000858.SZ': 'SZSE:000858',
  '601318.SH': 'SSE:601318',
  '000001.SZ': 'SZSE:000001',
  '600036.SH': 'SSE:600036',
  '000333.SZ': 'SZSE:000333',
  '600900.SH': 'SSE:600900',
  '601012.SH': 'SSE:601012',
  '002594.SZ': 'SZSE:002594',
  '000002.SZ': 'SZSE:000002',
  '600887.SH': 'SSE:600887',
  '601166.SH': 'SSE:601166',
  '000568.SZ': 'SZSE:000568',
  '002714.SZ': 'SZSE:002714',
  '601888.SH': 'SSE:601888',
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

function TradingViewWidget({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Use a stable, unique container id derived from symbol
  const containerId = `tv_${tvSymbol.replace(/[^a-zA-Z0-9]/g, '_')}`;

  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    const createWidget = () => {
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: 'D',
        timezone: 'Asia/Shanghai',
        theme: 'light',
        style: '1',
        locale: 'zh_CN',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_side_toolbar: true,
        withdateranges: true,
        container_id: containerId,
      });
    };

    if ((window as any).TradingView) {
      createWidget();
    } else {
      const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existing) {
        existing.addEventListener('load', createWidget, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = '';
    };
  }, [tvSymbol, containerId]);

  return (
    <div
      id={containerId}
      ref={containerRef}
      className="w-full h-full"
    />
  );
}

// === Main Component ===
export function MarketPage() {
  const [market, setMarket] = useState<'us' | 'hk' | 'a'>('a');
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'TSLA', 'NVDA']);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const stocks = MOCK_STOCKS[market];

  const activeStock = useMemo(() => {
    if (selectedStock) return selectedStock;
    return stocks[0] || null;
  }, [selectedStock, stocks]);

  const tvSymbol = useMemo(() => {
    if (!activeStock) return 'NASDAQ:AAPL';
    return TV_SYMBOL_MAP[activeStock.symbol] ?? activeStock.symbol;
  }, [activeStock]);

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

              {/* TradingView K-line Chart */}
              <div className="flex-1 px-3 pb-3 overflow-hidden">
                <TradingViewWidget tvSymbol={tvSymbol} />
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