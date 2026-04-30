/**
 * Fake chat data for demo/testing purposes
 * Contains initial messages and library files
 */

import { FileText, Table, Image as ImageIcon } from 'lucide-react';
import type { ToolCallSnapshot } from '../types/agentStream';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 'text' = markdown (default) | 'html' = inline HTML card */
  type?: 'text' | 'html';
  timestamp: Date;
  isStrategy?: boolean;
  isStockPicker?: boolean;
  isStockPickerCode?: boolean;
  /** 本条 assistant 消息伴随产生的工具调用快照（按工具调用顺序） */
  toolCalls?: ToolCallSnapshot[];
}

export interface LibraryFile {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  icon: typeof FileText;
  color: string;
}

export const LIBRARY_TABS = ['全部', '文档', '幻灯片', '表格', '图片与视频', '策略代码', '更多'] as const;

export const libraryFiles: LibraryFile[] = [
  { id: '1', name: '股票分析报告.pdf', size: '2.3 MB', date: '2026-04-20', type: '文档', icon: FileText, color: 'text-red-600' },
  { id: '4', name: '交易数据.xlsx', size: '1.2 MB', date: '2026-04-20', type: '表格', icon: Table, color: 'text-green-600' },
  { id: '6', name: '趋势图.png', size: '456 KB', date: '2026-04-20', type: '图片与视频', icon: ImageIcon, color: 'text-purple-600' },
  { id: '9', name: '量化策略_V1.py', size: '128 KB', date: '2026-04-20', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '2', name: '市场研究.docx', size: '1.5 MB', date: '2026-04-19', type: '文档', icon: FileText, color: 'text-blue-600' },
  { id: '5', name: '财务报表.csv', size: '856 KB', date: '2026-04-19', type: '表格', icon: Table, color: 'text-green-600' },
  { id: '10', name: '趋势跟踪策略.py', size: '95 KB', date: '2026-04-19', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '3', name: '季度总结.pptx', size: '5.2 MB', date: '2026-04-18', type: '幻灯片', icon: FileText, color: 'text-orange-600' },
  { id: '11', name: '网格交易策略.json', size: '45 KB', date: '2026-04-18', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '7', name: '演示视频.mp4', size: '15.3 MB', date: '2026-04-17', type: '图片与视频', icon: ImageIcon, color: 'text-pink-600' },
  { id: '8', name: '配置文件.json', size: '12 KB', date: '2026-04-16', type: '更多', icon: FileText, color: 'text-gray-600' },
];

export const fakeMessagesMap: Record<string, Message[]> = {
  '1': [
    { id: '1-1', role: 'user', content: '帮我分析一下今天的市场行情', timestamp: new Date('2024-01-21T10:00:00') },
    { id: '1-2', role: 'assistant', content: '好的，我来为您分析今日市场行情。\n\n**市场概况：**\n- 上证指数：3,245.67 (+1.2%)\n- 深证成指：11,234.89 (+0.8%)\n- 创业板指：2,456.78 (+1.5%)\n\n**行业表现：**\n1. 科技板块领涨，涨幅2.3%\n2. 新能源板块表现强劲，涨幅1.8%\n3. 金融板块相对平稳，涨幅0.5%\n\n**市场情绪：**\n整体市场情绪偏乐观，成交量较昨日放大15%，资金流入明显。建议关注科技和新能源板块的龙头股票。', timestamp: new Date('2024-01-21T10:00:30') },
    { id: '1-3', role: 'user', content: '有什么具体的投资建议吗？', timestamp: new Date('2024-01-21T10:05:00') },
    { id: '1-4', role: 'assistant', content: '基于当前市场行情，我给出以下建议：\n\n**短期操作建议：**\n1. 科技板块：可关注芯片、人工智能相关标的\n2. 新能源板块：光伏、储能产业链值得关注\n3. 仓位控制：建议保持6-7成仓位，留有应对回调空间\n\n**风险提示：**\n- 注意短期获利盘可能带来的调整压力\n- 关注外围市场变化\n- 设置好止盈止损位\n\n具体标的建议需要结合您的风险偏好和资金情况来定制，是否需要我进一步分析？', timestamp: new Date('2024-01-21T10:05:45') },
  ],
  '2': [
    { id: '2-1', role: 'user', content: '我需要优化现有的量化交易策略', timestamp: new Date('2024-01-20T14:00:00') },
    { id: '2-2', role: 'assistant', content: '好的，我来帮您优化量化交易策略。请先告诉我：\n\n1. 当前策略的主要逻辑是什么？（如趋势跟踪、均值回归等）\n2. 当前策略的回测收益率和最大回撤是多少？\n3. 您希望从哪些方面进行优化？\n   - 提高收益率\n   - 降低回撤\n   - 优化胜率\n   - 减少交易频率', timestamp: new Date('2024-01-20T14:00:25') },
    { id: '2-3', role: 'user', content: '主要是双均线策略，年化收益15%，最大回撤12%，希望降低回撤', timestamp: new Date('2024-01-20T14:03:00') },
    { id: '2-4', role: 'assistant', content: '明白了。针对您的双均线策略，我建议从以下几个方面优化以降低回撤：\n\n**1. 加入趋势过滤器**\n- 使用长周期均线（如200日线）判断大趋势\n- 只在趋势向上时做多，避免震荡市频繁交易\n\n**2. 优化止损机制**\n- 添加ATR动态止损，根据市场波动调整\n- 设置分批止损，而非一次性离场\n\n**3. 仓位管理优化**\n- 根据市场波动率动态调整仓位\n- 回撤期间降低仓位，突破新高时加仓\n\n**4. 加入风控指标**\n- 监控连续亏损次数，达到阈值暂停交易\n- 月度最大亏损限制\n\n我可以为您生成优化后的策略代码，需要我继续吗？', timestamp: new Date('2024-01-20T14:03:50') },
  ],
  '3': [
    { id: '3-1', role: 'user', content: '请帮我做一份持仓风险评估报告', timestamp: new Date('2024-01-18T16:00:00') },
    { id: '3-2', role: 'assistant', content: '好的，我来为您进行持仓风险评估。请提供以下信息：\n\n1. 当前持仓股票代码和仓位占比\n2. 持仓周期（短期/中期/长期）\n3. 您的风险承受能力（保守/稳健/激进）\n\n或者您可以直接上传持仓截图，我来帮您分析。', timestamp: new Date('2024-01-18T16:00:20') },
    { id: '3-3', role: 'user', content: '主要持仓是科技股，占比60%，新能源20%，金融20%，中长期持有，风险偏好稳健', timestamp: new Date('2024-01-18T16:05:00') },
    { id: '3-4', role: 'assistant', content: '基于您的持仓信息，我已完成风险评估：\n\n**持仓结构分析：**\n- 科技股60% - 占比较高，存在集中度风险\n- 新能源20% - 配置合理\n- 金融20% - 配置合理\n\n**风险等级：中等偏高**\n\n**主要风险点：**\n1. **行业集中度风险**：科技股占比过高，建议控制在40%以内\n2. **市场风险**：科技板块波动性较大，与稳健风险偏好不完全匹配\n3. **系统性风险**：缺乏防御性资产配置\n\n**优化建议：**\n1. 降低科技股仓位至40-45%\n2. 增配消费、医药等防御性板块15-20%\n3. 考虑配置5-10%债券或货币基金作为安全垫\n4. 分散持股，单只股票建议不超过15%\n\n**止损建议：**\n- 单只股票止损位：-8%\n- 总仓位止损位：-15%\n\n需要我提供详细的调仓方案吗？', timestamp: new Date('2024-01-18T16:06:15') },
  ],
  '4': [
    { id: '4-1', role: 'user', content: '帮我生成一个双均线交易策略', timestamp: new Date('2024-01-21T14:00:00') },
    { id: '4-n1', role: 'assistant', content: '收到，先整理设计思路。\n\n### 思考（一）：策略选型\n双均线属于**趋势跟踪**类，逻辑简单、可解释性强，适合量化基线策略：\n- **均线周期**：短周期越小信号越灵敏，5/20 日是 A 股常见组合，兼顾灵敏度与稳定性。\n- **市场适用性**：趋势市表现好，震荡市易产生假突破，建议叠加 ADX > 25 过滤器。\n- **与基准对比**：历史回测中该参数组合在趋势年份可跑赢沪深300约 8–15 pct。', timestamp: new Date('2024-01-21T14:00:04') },
    { id: '4-n2', role: 'assistant', content: '### 工具调用：行情元数据查询\n\n```text\n> market_data.describe(symbol="000001.SH", freq="D", start="2015-01-01", end="2024-01-01")\n<- {\n     total_bars: 2196,  missing_rate: 0.003,\n     avg_daily_volume: 2.81e10,\n     trend_days_ratio: 0.58,  oscillation_days_ratio: 0.42\n   }\n```\n\n趋势行情占比约 **58%**，策略适用性合格；以上证指数作为趋势环境过滤器，震荡期降低下单频率。', timestamp: new Date('2024-01-21T14:00:08') },
    { id: '4-n3', role: 'assistant', content: '### 思考（二）：参数确定 & 风控设计\n\n1. **参数**：短周期 5 日 + 长周期 20 日，两者差值适中，避免信号过密。\n2. **入场/出场**：金叉买入，死叉平仓；仓位上限 2 档，单笔 50%。\n3. **止损**：单笔亏损超过 −2% 强制止损，防止单次交易拖累整体曲线。\n4. **冷静期**：连续 3 次亏损后暂停 2 日交易，避免追损操作。', timestamp: new Date('2024-01-21T14:00:12') },
    { id: '4-n4', role: 'assistant', content: '### 工具调用：参数网格扫描\n\n```text\n> strategy.param_scan(\n    short_range=[3, 5, 8], long_range=[15, 20, 30],\n    metric="sharpe", market="CN-A"\n  )\n<- best  : short=5, long=20  ->  sharpe=1.85  annual=+18.2%  max_dd=-8.3%\n   2nd   : short=8, long=30  ->  sharpe=1.62  annual=+14.7%  max_dd=-11.1%\n   3rd   : short=3, long=15  ->  sharpe=1.41  annual=+21.3%  max_dd=-15.6%\n```\n\n(5, 20) 在 3×3 网格中夏普最优，最大回撤也优于邻近参数，采用该配置。', timestamp: new Date('2024-01-21T14:00:16') },
    { id: '4-2', role: 'assistant', content: '收到，我将基于经典的 SMA 双均线框架为您生成策略。\n\n### 思考过程（摘要）\n1. **参数选择**：短周期选 5 日（捕捉短期动能），长周期选 20 日（月均线，常作为趋势锚）。两者差值适中，避免过于频繁的虚假信号。\n2. **入场/出场规则**：短均上穿长均（金叉）买入，下穿（死叉）平仓；配合持仓不超过 2 档仓位约束。\n3. **风控设计**：加入单笔最大亏损 2% 的止损线，以及连续 3 次亏损后触发冷静期（暂停 2 日交易）。\n4. **适用标的**：主板蓝筹 / ETF，日线数据；震荡市效果减弱，建议叠加趋势过滤器。', timestamp: new Date('2024-01-21T14:00:18') },
    { id: '4-3', role: 'assistant', content: '### 代码生成日志\n\n```text\n[14:00:19] init strategy scaffold (dual_ma)\n[14:00:19] set params: short_window=5, long_window=20, stop_loss=0.02\n[14:00:20] generate signal logic (golden-cross / death-cross)\n[14:00:20] add position sizing: max_position=0.95, order_pct=0.50\n[14:00:21] add risk guard: consecutive_loss_limit=3, cooldown_days=2\n[14:00:21] format freqtrade-compatible output\n[14:00:21] done -> strategy.py (74 lines)\n```\n\n策略文件已生成，以下是完整代码与回测入口：', timestamp: new Date('2024-01-21T14:00:22') },
    { id: '4-4', role: 'assistant', content: '好的，我为您生成了一个完整的双均线交易策略。这是一个基于5日均线和20日均线的经典策略，适合中短期交易。', timestamp: new Date('2024-01-21T14:00:30'), isStrategy: true },
  ],
  '5': [
    { id: '5-1', role: 'user', content: '帮我智能选股，推荐一些优质标的', timestamp: new Date('2024-01-21T15:30:00') },
    { id: '5-2', role: 'assistant', content: '好的，我基于多因子量化模型为您筛选了当前市场中的优质标的。综合考虑了基本面、技术面、估值和市场情绪等多个维度。', timestamp: new Date('2024-01-21T15:30:20') },
    { id: '5-3', role: 'user', content: '能详细说明一下选股逻辑吗？', timestamp: new Date('2024-01-21T15:32:00') },
    { id: '5-4', role: 'assistant', content: '当然可以。我先给您同步当前轮次的分析进度。\n\n### 思考过程（摘要）\n1. **构建候选池**：先从A股主板+创业板中筛选流动性达标标的，剔除ST与近30日停牌股票。\n2. **多因子打分**：从盈利质量、成长性、估值、趋势强度、资金行为五个维度计算标准化分数。\n3. **风险约束**：增加行业集中度和波动率上限，避免推荐结果过于偏科。\n4. **组合平衡**：在高分股票中二次筛选，保留不同行业和风格的代表性个股。', timestamp: new Date('2024-01-21T15:32:20') },
    { id: '5-5', role: 'assistant', content: '### 执行调用日志（mock）\n\n```text\n[15:32:21] universe.load(market="CN-A", min_turnover=1e8)\n[15:32:22] factor.fetch(names=[ROE, yoy_revenue, PE_TTM, PEG, MOM_60D, VOL_20D])\n[15:32:23] quality.score(weights={fundamental:0.35, valuation:0.20, technical:0.25, sentiment:0.20})\n[15:32:24] risk.filter(max_industry_weight=0.35, max_volatility=0.42)\n[15:32:25] ranking.top_k(k=6, rebalance="weekly")\n[15:32:25] done -> 6 symbols selected\n```\n\n已完成计算，下面给出推荐结果与依据。', timestamp: new Date('2024-01-21T15:32:32') },
    { id: '5-6', role: 'assistant', content: '我的选股模型主要从以下几个维度进行评估：\n\n**1. 基本面分析**\n- ROE连续三年超过15%\n- 营收和净利润持续增长\n- 负债率处于合理水平\n\n**2. 估值分析**\n- PE、PB处于行业中位数以下或历史低位\n- PEG小于1，具有成长性溢价\n\n**3. 技术面分析**\n- 突破关键阻力位或处于上升通道\n- 成交量配合良好\n- MACD金叉等技术指标支持\n\n**4. 行业景气度**\n- 所属行业处于上升周期\n- 政策支持力度强\n- 市场需求旺盛\n\n以下是为您筛选出的6只优质标的：', timestamp: new Date('2024-01-21T15:32:45'), isStockPicker: true },
    { id: '5-7', role: 'assistant', content: '', timestamp: new Date('2024-01-21T15:33:10'), isStockPickerCode: true },
  ],
};
