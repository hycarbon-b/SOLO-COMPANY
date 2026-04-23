/**
 * A股数据服务
 * 提供股票行情、技术指标等数据的获取
 * 使用 akshare HTTP API 或备用数据源
 */

// 备用：使用腾讯财经接口获取实时行情（无需认证，免费）
const TENCENT_STOCK_API = "https://qt.gtimg.cn/q";

/**
 * 根据股票名称搜索股票代码
 * 使用东方财富搜索接口
 * @param {string} name - 股票名称，如 "平安银行"
 * @returns {Promise<string|null>} - 股票代码，如 "000001"
 */
export async function searchStockCodeByName(name) {
  try {

    const url = `/eastmoney/api/suggest/get?input=${encodeURIComponent(name)}&type=14&count=5`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.QuotationCodeTable || !data.QuotationCodeTable.Data) {
      return null;
    }

    const results = data.QuotationCodeTable.Data;
    if (results.length === 0) {
      return null;
    }

    // 优先返回A股（沪深）- 东方财富的 SecurityTypeName 可能是 "沪A"、"深A" 等
    const ashare = results.find((r) => {
      const typeName = r.SecurityTypeName || "";
      const classify = r.Classify || "";
      return (
        typeName.includes("A") ||
        classify === "AStock" ||
        typeName.includes("沪") ||
        typeName.includes("深")
      );
    });
    if (ashare) {
      return ashare.Code;
    }

    // 否则返回第一个结果
    return results[0].Code;
  } catch (error) {
    console.error("[StockData] 搜索股票代码失败:", error);
    return null;
  }
}

/**
 * 将股票代码转换为腾讯接口格式
 * @param {string} code - 股票代码，如 "000001"、"600000"
 * @returns {string} - 腾讯格式，如 "sh000001"、"sh600000"
 */
function formatCodeForTencent(code) {
  // 去除空格和前缀
  code = code.trim();
  if (code.startsWith("sz") || code.startsWith("sh")) {
    return code;
  }

  // 上海指数代码（特殊情况）
  const shIndexCodes = [
    "000001",
    "000002",
    "000003",
    "000016",
    "000010",
    "000688",
    "000689",
  ];
  if (shIndexCodes.includes(code)) {
    return `sh${code}`;
  }

  // 6开头是上海主板
  if (code.startsWith("6")) {
    return `sh${code}`;
  }
  // 0开头是深圳主板，3开头是创业板
  else if (code.startsWith("0") || code.startsWith("3")) {
    return `sz${code}`;
  }
  // 9开头通常是深圳指数
  else if (code.startsWith("9")) {
    return `sz${code}`;
  }

  return code;
}

/**
 * 获取单只股票实时行情
 * 支持股票代码或股票名称
 * @param {string} codeOrName - 股票代码或名称，如 "000001" 或 "平安银行"
 * @returns {Promise<Object>} - 股票数据
 */
export async function getStockQuote(codeOrName) {
  try {
    let code = codeOrName.trim();

    // 如果不是纯数字代码（6位数字），则认为是名称，需要搜索
    if (!/^\d{6}$/.test(code)) {
      const searchedCode = await searchStockCodeByName(code);
      if (!searchedCode) {
        throw new Error(`未找到股票: ${code}`);
      }
      code = searchedCode;
    }

    const tencentCode = formatCodeForTencent(code);
    const url = `${TENCENT_STOCK_API}=${tencentCode}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    // 腾讯接口返回的是 JavaScript 变量赋值格式
    // 如: v_sz000001="1~平安银行~000001~..."
    const match = text.match(/v_[^=]+="([^"]+)"/);
    if (!match) {
      throw new Error("无法解析股票数据");
    }

    const data = match[1].split("~");
    // 腾讯数据字段索引：
    // 0: 市场 1: 名称 2: 代码 3: 当前价 4: 昨收 5: 今开 6: 成交量(手) 7: 外盘 8: 内盘
    // 9: 买一 10: 买一量 11-18: 买二到买五 19-26: 卖一到卖五
    // 27-32: 最近六笔成交 33: 时间 34: 涨跌 35: 涨跌幅 36: 最高 37: 最低
    // 38: 价格/成交量(手)/成交额 39: 成交量(手) 40: 成交额(万) 41: 换手率
    // 42: 市盈率 43: 未知 44: 最高 45: 最低 46: 振幅 47: 流通市值 48: 总市值
    // 49: 市净率 50: 涨停价 51: 跌停价

    return {
      code: data[2],
      name: data[1],
      price: parseFloat(data[3]),
      previousClose: parseFloat(data[4]),
      open: parseFloat(data[5]),
      high: parseFloat(data[36]),
      low: parseFloat(data[37]),
      volume: parseInt(data[6]) * 100, // 手转股
      amount: parseFloat(data[40]) * 10000, // 万转元
      change: parseFloat(data[34]),
      changePercent: parseFloat(data[35]),
      turnover: parseFloat(data[41]), // 换手率
      pe: parseFloat(data[42]), // 市盈率
      pb: parseFloat(data[49]), // 市净率
      marketCap: parseFloat(data[48]) * 100000000, // 总市值
      floatCap: parseFloat(data[47]) * 100000000, // 流通市值
      limitUp: parseFloat(data[50]), // 涨停价
      limitDown: parseFloat(data[51]), // 跌停价
      amplitude: parseFloat(data[46]), // 振幅
      time: data[33],
    };
  } catch (error) {
    console.error("[StockData] 获取股票行情失败:", error);
    throw error;
  }
}

/**
 * 获取多只股票实时行情
 * @param {string[]} codes - 股票代码数组
 * @returns {Promise<Object[]>} - 股票数据数组
 */
export async function getBatchStockQuotes(codes) {
  try {
    const tencentCodes = codes.map(formatCodeForTencent).join(",");
    const url = `${TENCENT_STOCK_API}=${tencentCodes}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const results = [];

    // 解析多只股票数据
    const lines = text.split(";");
    for (const line of lines) {
      const match = line.match(/v_[^=]+="([^"]+)"/);
      if (match) {
        const data = match[1].split("~");
        results.push({
          code: data[2],
          name: data[1],
          price: parseFloat(data[3]),
          previousClose: parseFloat(data[4]),
          open: parseFloat(data[5]),
          high: parseFloat(data[36]),
          low: parseFloat(data[37]),
          volume: parseInt(data[6]) * 100,
          amount: parseFloat(data[40]) * 10000,
          change: parseFloat(data[34]),
          changePercent: parseFloat(data[35]),
          turnover: parseFloat(data[41]),
          pe: parseFloat(data[42]),
          pb: parseFloat(data[49]),
          marketCap: parseFloat(data[48]) * 100000000,
          floatCap: parseFloat(data[47]) * 100000000,
          limitUp: parseFloat(data[50]),
          limitDown: parseFloat(data[51]),
          amplitude: parseFloat(data[46]),
          time: data[33],
        });
      }
    }

    return results;
  } catch (error) {
    console.error("[StockData] 批量获取股票行情失败:", error);
    throw error;
  }
}

/**
 * 获取上证指数和创业板指行情
 * @returns {Promise<Object>} - 指数数据
 */
export async function getMajorIndices() {
  return await getBatchStockQuotes(["000001", "399006"]);
}

/**
 * 格式化股票数据为文本报告
 * @param {Object} data - 股票数据
 * @returns {string} - 格式化后的文本
 */
export function formatStockReport(data) {
  const changeSymbol = data.change >= 0 ? "+" : "";
  return `
【${data.name} (${data.code})】
最新价: ${data.price.toFixed(2)} (${changeSymbol}${data.change.toFixed(2)}, ${changeSymbol}${data.changePercent.toFixed(2)}%)
今开: ${data.open.toFixed(2)}  昨收: ${data.previousClose.toFixed(2)}
最高: ${data.high.toFixed(2)}  最低: ${data.low.toFixed(2)}
振幅: ${data.amplitude.toFixed(2)}%
成交量: ${(data.volume / 10000).toFixed(2)}万手
成交额: ${(data.amount / 100000000).toFixed(2)}亿元
换手率: ${data.turnover.toFixed(2)}%
市盈率: ${data.pe.toFixed(2)}  市净率: ${data.pb.toFixed(2)}
总市值: ${(data.marketCap / 100000000).toFixed(2)}亿元
流通市值: ${(data.floatCap / 100000000).toFixed(2)}亿元
涨停价: ${data.limitUp.toFixed(2)}  跌停价: ${data.limitDown.toFixed(2)}
数据时间: ${data.time}
  `.trim();
}

/**
 * 格式化指数数据为文本报告
 * @param {Object[]} indices - 指数数据数组
 * @returns {string} - 格式化后的文本
 */
export function formatIndicesReport(indices) {
  const sh = indices.find((i) => i.code === "000001");
  const cy = indices.find((i) => i.code === "399006");

  let report = "【A股主要指数行情】\n\n";

  if (sh) {
    const changeSymbol = sh.change >= 0 ? "+" : "";
    report += `上证指数: ${sh.price.toFixed(2)} (${changeSymbol}${sh.change.toFixed(2)}, ${changeSymbol}${sh.changePercent.toFixed(2)}%)\n`;
    report += `  开盘: ${sh.open.toFixed(2)}  最高: ${sh.high.toFixed(2)}  最低: ${sh.low.toFixed(2)}\n`;
    report += `  成交: ${(sh.amount / 100000000).toFixed(2)}亿元\n\n`;
  }

  if (cy) {
    const changeSymbol = cy.change >= 0 ? "+" : "";
    report += `创业板指: ${cy.price.toFixed(2)} (${changeSymbol}${cy.change.toFixed(2)}, ${changeSymbol}${cy.changePercent.toFixed(2)}%)\n`;
    report += `  开盘: ${cy.open.toFixed(2)}  最高: ${cy.high.toFixed(2)}  最低: ${cy.low.toFixed(2)}\n`;
    report += `  成交: ${(cy.amount / 100000000).toFixed(2)}亿元\n`;
  }

  return report.trim();
}

/**
 * 获取股票历史K线数据（使用东方财富接口）
 * 支持股票代码或股票名称
 * @param {string} codeOrName - 股票代码或名称，如 "000001" 或 "平安银行"
 * @param {string} period - 周期: 'day', 'week', 'month'
 * @param {number} limit - 获取条数
 * @returns {Promise<Object[]>} - K线数据
 */
export async function getStockKlines(codeOrName, period = "day", limit = 100) {
  try {
    let code = codeOrName.trim();

    // 如果不是纯数字代码（6位数字），则认为是名称，需要搜索
    if (!/^\d{6}$/.test(code)) {
      const searchedCode = await searchStockCodeByName(code);
      if (!searchedCode) {
        throw new Error(`未找到股票: ${code}`);
      }
      code = searchedCode;
    }

    // 东方财富接口
    const market = code.startsWith("6") ? "1" : "0";
    const periodMap = { day: "101", week: "102", month: "103" };
    const periodCode = periodMap[period] || "101";

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${market}.${code}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${periodCode}&fqt=0&end=20500101&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    if (!json.data || !json.data.klines) {
      throw new Error("无法解析K线数据");
    }

    // K线数据格式: 日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
    return json.data.klines.map((line) => {
      const parts = line.split(",");
      return {
        date: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseInt(parts[5]),
        amount: parseFloat(parts[6]),
        amplitude: parseFloat(parts[7]),
        changePercent: parseFloat(parts[8]),
        change: parseFloat(parts[9]),
        turnover: parseFloat(parts[10]),
      };
    });
  } catch (error) {
    console.error("[StockData] 获取K线数据失败:", error);
    throw error;
  }
}

/**
 * 计算简单移动平均线 (SMA)
 * @param {number[]} data - 价格数组
 * @param {number} period - 周期
 * @returns {number[]} - 均线数组
 */
export function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
}

/**
 * 计算MACD指标
 * @param {number[]} closes - 收盘价数组
 * @returns {Object} - MACD数据
 */
export function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    const emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  };

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const dif = emaFast.map((v, i) => v - emaSlow[i]);
  const dea = ema(dif, signal);
  const macd = dif.map((v, i) => (v - dea[i]) * 2);

  return { dif, dea, macd };
}

/**
 * 计算RSI指标
 * @param {number[]} closes - 收盘价数组
 * @param {number} period - 周期，默认14
 * @returns {number[]} - RSI数组
 */
export function calculateRSI(closes, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  // 计算初始平均涨跌
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(null);
      continue;
    }

    const rs = avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));

    // 更新平均涨跌
    if (i < closes.length - 1) {
      const change = closes[i + 1] - closes[i];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
  }

  return rsi;
}

/**
 * 计算布林带 (BOLL)
 * @param {number[]} closes - 收盘价数组
 * @param {number} period - 周期，默认20
 * @param {number} multiplier - 标准差倍数，默认2
 * @returns {Object} - BOLL数据
 */
export function calculateBOLL(closes, period = 20, multiplier = 2) {
  const middle = calculateSMA(closes, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    // 计算标准差
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(closes[i - j] - middle[i], 2);
    }
    const std = Math.sqrt(sum / period);

    upper.push(middle[i] + multiplier * std);
    lower.push(middle[i] - multiplier * std);
  }

  return { middle, upper, lower };
}

/**
 * 计算KDJ指标
 * @param {Object[]} klines - K线数据数组
 * @param {number} n - RSV周期，默认9
 * @param {number} m1 - K平滑周期，默认3
 * @param {number} m2 - D平滑周期，默认3
 * @returns {Object} - KDJ数据
 */
export function calculateKDJ(klines, n = 9, m1 = 3, m2 = 3) {
  const k = [];
  const d = [];
  const j = [];

  for (let i = 0; i < klines.length; i++) {
    if (i < n - 1) {
      k.push(null);
      d.push(null);
      j.push(null);
      continue;
    }

    // 计算RSV
    let lowest = klines[i].low;
    let highest = klines[i].high;
    for (let j = 1; j < n; j++) {
      lowest = Math.min(lowest, klines[i - j].low);
      highest = Math.max(highest, klines[i - j].high);
    }

    const rsv =
      highest === lowest
        ? 50
        : ((klines[i].close - lowest) / (highest - lowest)) * 100;

    if (i === n - 1) {
      k.push(rsv);
      d.push(rsv);
    } else {
      const newK = (2 / 3) * k[i - 1] + (1 / 3) * rsv;
      const newD = (2 / 3) * d[i - 1] + (1 / 3) * newK;
      k.push(newK);
      d.push(newD);
    }

    j.push(3 * k[i] - 2 * d[i]);
  }

  return { k, d, j };
}

/**
 * 获取股票财务数据（利润表）
 * 使用东方财富接口
 * @param {string} code - 股票代码，如 "600519"
 * @returns {Promise<Object>} - 利润表数据
 */
export async function getIncomeStatement(code) {
  try {
    const market = code.startsWith("6") ? "SH" : "SZ";
    const url = `/eastmoney-finance/NewFinanceAnalysis/lrbAjax?companyType=4&reportDateType=0&reportType=1&endDate=&code=${market}${code}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[StockData] 获取利润表失败:", error);
    return [];
  }
}

/**
 * 获取股票财务数据（资产负债表）
 * 使用东方财富接口
 * @param {string} code - 股票代码，如 "600519"
 * @returns {Promise<Object>} - 资产负债表数据
 */
export async function getBalanceSheet(code) {
  try {
    const market = code.startsWith("6") ? "SH" : "SZ";
    const url = `/eastmoney-finance/NewFinanceAnalysis/zcfzbAjax?companyType=4&reportDateType=0&reportType=1&endDate=&code=${market}${code}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[StockData] 获取资产负债表失败:", error);
    return [];
  }
}

/**
 * 获取股票财务数据（现金流量表）
 * 使用东方财富接口
 * @param {string} code - 股票代码，如 "600519"
 * @returns {Promise<Object>} - 现金流量表数据
 */
export async function getCashFlowStatement(code) {
  try {
    const market = code.startsWith("6") ? "SH" : "SZ";
    const url = `/eastmoney-finance/NewFinanceAnalysis/xjllbAjax?companyType=4&reportDateType=0&reportType=1&endDate=&code=${market}${code}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[StockData] 获取现金流量表失败:", error);
    return [];
  }
}

/**
 * 获取股票主要财务指标
 * 使用东方财富接口
 * @param {string} code - 股票代码，如 "600519"
 * @returns {Promise<Object>} - 主要财务指标
 */
export async function getFinancialIndicators(code) {
  try {
    const market = code.startsWith("6") ? "SH" : "SZ";
    const url = `/eastmoney-finance/NewFinanceAnalysis/MainTargetAjax?companyType=4&reportDateType=0&reportType=1&endDate=&code=${market}${code}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[StockData] 获取财务指标失败:", error);
    return [];
  }
}
