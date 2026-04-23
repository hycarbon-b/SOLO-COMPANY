import { TrendingUp, TrendingDown } from 'lucide-react';

interface Stock {
  name: string;
  code: string;
  reason: string;
  price: number;
  change: number;
  changePercent: number;
}

const stocks: Stock[] = [
  {
    name: '贵州茅台',
    code: '600519',
    reason: '业绩稳健增长，市盈率处于历史低位，白酒行业龙头地位稳固',
    price: 1850.50,
    change: 23.50,
    changePercent: 1.29,
  },
  {
    name: '宁德时代',
    code: '300750',
    reason: '新能源电池全球市占率第一，技术领先，获多个大单订单',
    price: 168.30,
    change: -2.10,
    changePercent: -1.23,
  },
  {
    name: '比亚迪',
    code: '002594',
    reason: '新能源汽车销量持续突破，垂直整合优势明显，估值合理',
    price: 245.80,
    change: 8.40,
    changePercent: 3.54,
  },
  {
    name: '中国平安',
    code: '601318',
    reason: '保险业务稳定，科技金融转型成效显著，分红率高',
    price: 45.60,
    change: 0.80,
    changePercent: 1.79,
  },
  {
    name: '隆基绿能',
    code: '601012',
    reason: '光伏组件出货量全球领先，成本优势突出，新技术储备充足',
    price: 23.50,
    change: 1.20,
    changePercent: 5.38,
  },
  {
    name: '药明康德',
    code: '603259',
    reason: 'CRO行业龙头，订单饱满，全球医药外包趋势明显',
    price: 78.90,
    change: -1.50,
    changePercent: -1.87,
  },
];

export function StockPickerTable() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900">智能选股推荐</h3>
        <p className="text-sm text-gray-600 mt-1">基于多因子模型综合评分，筛选出当前市场优质标的</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">代码</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">现价</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">涨跌幅</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">选股依据</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stocks.map((stock) => (
              <tr key={stock.code} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{stock.name}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600 font-mono">{stock.code}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="text-sm text-gray-900">¥{stock.price.toFixed(2)}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`text-sm font-medium flex items-center justify-end gap-1 ${
                    stock.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {stock.changePercent >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                  <div className={`text-xs ${stock.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600 max-w-md">{stock.reason}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          * 以上数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。
        </p>
      </div>
    </div>
  );
}
