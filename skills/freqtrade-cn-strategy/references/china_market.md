# 中国市场适配指南

本文档介绍A股市场的特殊规则和freqtrade适配方法。

---

## A股市场特点

### 1. 交易时间

- 上午：9:30 - 11:30
- 下午：13:00 - 15:00
- 共4小时交易时间

**与加密货币的区别**：
- 加密货币24/7交易
- A股有午休和夜间休市

**适配建议**：
- 使用日线策略，避免日内策略
- 注意开盘和收盘的波动

### 2. 涨跌停限制

- 主板：±10%
- 创业板/科创板：±20%
- ST股票：±5%

**影响**：
- 涨停后无法买入
- 跌停后无法卖出

**适配建议**：
```python
# 策略中判断涨跌停
def populate_buy_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
    dataframe.loc[
        (dataframe['buy_signal']) &
        (dataframe['pct_change'] < 9.5),  # 避开涨停附近
        'buy'
    ] = 1
    return dataframe
```

### 3. T+1制度

当天买入的股票，次日才能卖出。

**与加密货币的区别**：
- 加密货币T+0
- A股不能日内回转

**适配建议**：
- 设置持仓周期≥1天
- 使用日线级别策略

### 4. 股票代码格式

- 上海主板：600xxx
- 上海科创板：688xxx
- 深圳主板：000xxx, 001xxx
- 深圳创业板：300xxx
- 北交所：430xxx, 830xxx

**格式转换**：
```python
# akshare格式：纯数字
symbol = "600519"

# tushare格式：数字.交易所
symbol = "600519.SH"

# baostock格式：sh/sz + 数字
symbol = "sh600519"
```

---

## 数据适配

### 1. 复权处理

A股历史数据需要复权处理（调整因分红、配股导致的价格跳跃）。

**复权类型**：
- 前复权（qfq）：当前价格不变，调整历史价格
- 后复权（hfq）：历史价格不变，调整当前价格
- 不复权：原始价格

**建议使用前复权**：
```python
# akshare
df = ak.stock_zh_a_hist(symbol="600519", adjust="qfq")

# baostock
rs = bs.query_history_k_data_plus(..., adjustflag="2")  # 2=前复权
```

### 2. 财务数据

A股财务数据获取方式：

```python
# tushare
df = pro.income(ts_code='600519.SH')  # 利润表
df = pro.balancesheet(ts_code='600519.SH')  # 资产负债表
df = pro.cashflow(ts_code='600519.SH')  # 现金流表

# akshare
df = ak.stock_financial_report_em(symbol="600519")  # 财报
```

### 3. 指数数据

常用指数：
- 上证指数（000001.SH）
- 深证成指（399001.SZ）
- 沪深300（000300.SH）
- 创业板指（399006.SZ）

```python
# akshare获取指数
df = ak.stock_zh_index_daily_em(symbol="000300")  # 沪深300
```

---

## 交易所适配

Freqtrade原生不支持A股交易所，但可以通过以下方式适配：

### 1. 使用自定义交易所类

```python
from freqtrade.exchange import Exchange

class AStockExchange(Exchange):
    # 实现A股交易接口
    # 需要对接券商API
```

### 2. 模拟回测模式

由于freqtrade主要支持加密货币，A股策略建议：
- 使用dry_run模式回测
- 用下载的本地数据进行回测
- 不用于实盘交易（除非对接券商API）

---

## 监管合规

### 1. 量化交易监管

中国对量化交易有监管要求：
- 报备要求
- 交易限制
- 风控要求

### 2. API限制

国内券商API使用限制：
- 需要签约
- 可能收费
- 接口可能不稳定

---

## 特殊现象

### 1. 白马股效应

部分龙头股长期跑赢市场（如茅台、平安）。

**策略建议**：
- 关注基本面
- 选择优质标的

### 2. 政策影响

A股受政策影响较大：
- 行业政策
- 宏观调控
- 国际关系

**策略建议**：
- 关注政策动态
- 避开敏感时期

### 3. 季节效应

A股存在季节性规律：
- 春节红包行情
- 年底结算行情
- 报告期波动

---

## 实盘对接

如需A股实盘交易，可考虑：

### 1. 第三方框架

- vn.py：支持A股交易
- easytrader：券商接口封装
- QuantOS：开源量化平台

### 2. 券商API

各券商提供的API：
- 华泰证券
- 国泰君安
- 中信证券
- 东方财富

### 3. 建议流程

```
策略设计（freqtrade） -> 回测验证 -> vn.py/easytrader对接 -> 实盘运行
```
