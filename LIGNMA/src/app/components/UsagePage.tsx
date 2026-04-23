import { useState } from 'react';
import { Coins, TrendingUp, CreditCard, Smartphone, Bitcoin, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const timeRanges = ['近1天', '近7天', '近30天', '近1年', '全部'];

const usageData = {
  '近1天': [
    { id: '1d-1', time: '00:00', usage: 120 },
    { id: '1d-2', time: '04:00', usage: 80 },
    { id: '1d-3', time: '08:00', usage: 250 },
    { id: '1d-4', time: '12:00', usage: 420 },
    { id: '1d-5', time: '16:00', usage: 380 },
    { id: '1d-6', time: '20:00', usage: 290 },
    { id: '1d-7', time: '23:59', usage: 150 },
  ],
  '近7天': [
    { id: '7d-1', time: '04-15', usage: 1500 },
    { id: '7d-2', time: '04-16', usage: 2100 },
    { id: '7d-3', time: '04-17', usage: 1800 },
    { id: '7d-4', time: '04-18', usage: 2400 },
    { id: '7d-5', time: '04-19', usage: 2200 },
    { id: '7d-6', time: '04-20', usage: 1900 },
    { id: '7d-7', time: '04-21', usage: 1690 },
  ],
  '近30天': [
    { id: '30d-1', time: '03-22', usage: 18000 },
    { id: '30d-2', time: '03-29', usage: 22000 },
    { id: '30d-3', time: '04-05', usage: 25000 },
    { id: '30d-4', time: '04-12', usage: 21000 },
    { id: '30d-5', time: '04-19', usage: 19000 },
  ],
  '近1年': [
    { id: '1y-1', time: '05月', usage: 85000 },
    { id: '1y-2', time: '06月', usage: 92000 },
    { id: '1y-3', time: '07月', usage: 88000 },
    { id: '1y-4', time: '08月', usage: 95000 },
    { id: '1y-5', time: '09月', usage: 102000 },
    { id: '1y-6', time: '10月', usage: 98000 },
    { id: '1y-7', time: '11月', usage: 105000 },
    { id: '1y-8', time: '12月', usage: 110000 },
    { id: '1y-9', time: '01月', usage: 108000 },
    { id: '1y-10', time: '02月', usage: 95000 },
    { id: '1y-11', time: '03月', usage: 112000 },
    { id: '1y-12', time: '04月', usage: 45000 },
  ],
  '全部': [
    { id: 'all-1', time: '2025 Q1', usage: 280000 },
    { id: 'all-2', time: '2025 Q2', usage: 320000 },
    { id: 'all-3', time: '2025 Q3', usage: 350000 },
    { id: 'all-4', time: '2025 Q4', usage: 390000 },
    { id: 'all-5', time: '2026 Q1', usage: 315000 },
  ],
};

const rechargeRecords = [
  { id: '1', time: '2026-04-20 14:35:22', method: 'wechat', methodName: '微信支付', amount: 100, tokens: 100000 },
  { id: '2', time: '2026-04-20 09:12:45', method: 'alipay', methodName: '支付宝', amount: 200, tokens: 200000 },
  { id: '3', time: '2026-04-19 16:48:33', method: 'crypto', methodName: '数字货币', amount: 500, tokens: 550000 },
  { id: '4', time: '2026-04-18 11:22:10', method: 'wechat', methodName: '微信支付', amount: 100, tokens: 100000 },
  { id: '5', time: '2026-04-17 18:05:55', method: 'alipay', methodName: '支付宝', amount: 300, tokens: 300000 },
  { id: '6', time: '2026-04-16 13:28:17', method: 'wechat', methodName: '微信支付', amount: 200, tokens: 200000 },
  { id: '7', time: '2026-04-15 10:15:42', method: 'crypto', methodName: '数字货币', amount: 1000, tokens: 1100000 },
  { id: '8', time: '2026-04-14 15:33:29', method: 'alipay', methodName: '支付宝', amount: 100, tokens: 100000 },
  { id: '9', time: '2026-04-13 09:47:56', method: 'wechat', methodName: '微信支付', amount: 500, tokens: 500000 },
  { id: '10', time: '2026-04-12 14:21:38', method: 'alipay', methodName: '支付宝', amount: 200, tokens: 200000 },
  { id: '11', time: '2026-04-11 11:08:15', method: 'crypto', methodName: '数字货币', amount: 300, tokens: 330000 },
  { id: '12', time: '2026-04-10 16:52:44', method: 'wechat', methodName: '微信支付', amount: 100, tokens: 100000 },
  { id: '13', time: '2026-04-09 13:19:27', method: 'alipay', methodName: '支付宝', amount: 500, tokens: 500000 },
  { id: '14', time: '2026-04-08 10:41:53', method: 'wechat', methodName: '微信支付', amount: 200, tokens: 200000 },
  { id: '15', time: '2026-04-07 15:26:08', method: 'crypto', methodName: '数字货币', amount: 1000, tokens: 1100000 },
  { id: '16', time: '2026-04-06 09:14:35', method: 'alipay', methodName: '支付宝', amount: 100, tokens: 100000 },
  { id: '17', time: '2026-04-05 14:58:21', method: 'wechat', methodName: '微信支付', amount: 300, tokens: 300000 },
  { id: '18', time: '2026-04-04 11:37:49', method: 'alipay', methodName: '支付宝', amount: 200, tokens: 200000 },
  { id: '19', time: '2026-04-03 16:22:12', method: 'crypto', methodName: '数字货币', amount: 500, tokens: 550000 },
  { id: '20', time: '2026-04-02 13:05:47', method: 'wechat', methodName: '微信支付', amount: 100, tokens: 100000 },
  { id: '21', time: '2026-04-01 10:43:29', method: 'alipay', methodName: '支付宝', amount: 200, tokens: 200000 },
  { id: '22', time: '2026-03-31 15:18:56', method: 'wechat', methodName: '微信支付', amount: 500, tokens: 500000 },
];

export function UsagePage() {
  const [selectedRange, setSelectedRange] = useState('近7天');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'wechat' | 'alipay' | 'crypto' | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('100');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const remainingTokens = 245680;
  const currentData = usageData[selectedRange as keyof typeof usageData];
  const totalUsage = currentData.reduce((sum, item) => sum + item.usage, 0);

  // 分页逻辑
  const totalPages = Math.ceil(rechargeRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = rechargeRecords.slice(startIndex, endIndex);

  const handleRecharge = () => {
    if (selectedPayment && rechargeAmount) {
      console.log('充值:', { method: selectedPayment, amount: rechargeAmount });
      setShowRechargeModal(false);
      setSelectedPayment(null);
      setRechargeAmount('100');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">用量管理</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Remaining Tokens Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5" />
                <span className="text-sm opacity-90">剩余额度</span>
              </div>
              <div className="text-4xl font-bold">
                {remainingTokens.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              立即充值
            </button>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">用量趋势</h3>
            <div className="flex gap-2">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    selectedRange === range
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">总用量</div>
              <div className="text-2xl font-semibold text-gray-900">
                {totalUsage.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">平均值</div>
              <div className="text-2xl font-semibold text-gray-900">
                {Math.floor(totalUsage / currentData.length).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">峰值</div>
              <div className="text-2xl font-semibold text-gray-900">
                {Math.max(...currentData.map(d => d.usage)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Usage Trend Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentData} key={selectedRange}>
                <CartesianGrid key={`grid-${selectedRange}`} strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  key={`xaxis-${selectedRange}`}
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  key={`yaxis-${selectedRange}`}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  key={`tooltip-${selectedRange}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  key={`line-${selectedRange}`}
                  type="monotone"
                  dataKey="usage"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharge Records */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            <h3 className="text-base font-semibold text-gray-900">充值记录</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">充值方式</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">获得额度</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{record.time}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {record.method === 'wechat' && (
                          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        {record.method === 'alipay' && (
                          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                            <CreditCard className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        {record.method === 'crypto' && (
                          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                            <Bitcoin className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <span className="text-sm text-gray-900">{record.methodName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">¥{record.amount}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                      +{record.tokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-500">
              共 {rechargeRecords.length} 条记录，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={() => setShowRechargeModal(false)}>
          <div
            className="bg-white w-full max-w-md h-full shadow-xl transform transition-transform duration-300 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">充值额度</h3>
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">充值金额</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition-colors"
                    placeholder="请输入充值金额"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  {[100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setRechargeAmount(amount.toString())}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      ¥{amount}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  将获得 {(parseInt(rechargeAmount || '0') * 1000).toLocaleString()} 额度
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">支付方式</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedPayment('wechat')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedPayment === 'wechat'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium">微信</span>
                      {selectedPayment === 'wechat' && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPayment('alipay')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedPayment === 'alipay'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium">支付宝</span>
                      {selectedPayment === 'alipay' && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPayment('crypto')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedPayment === 'crypto'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                        <Bitcoin className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium">数字货币</span>
                      {selectedPayment === 'crypto' && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRechargeModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleRecharge}
                  disabled={!selectedPayment || !rechargeAmount}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认充值
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
