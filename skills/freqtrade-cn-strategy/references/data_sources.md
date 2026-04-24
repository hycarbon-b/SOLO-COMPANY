# 数据源配置指南

本文档介绍各数据源的配置和使用方法。

## 目录

1. [akshare](#akshare)
2. [baostock](#baostock)
3. [tushare](#tushare)
4. [ccxt（加密货币）](#ccxt)
5. [freqtrade内置数据源](#freqtrade内置)

---

## akshare

**简介**：免费的Python财经数据接口，数据丰富，更新及时。

**安装**：
```bash
pip install akshare
```

**数据类型**：
- A股实时行情
- A股历史K线
- 指数数据
- ETF数据
- 期货数据
- 基金数据

**使用示例**：
```python
import akshare as ak

# 获取股票历史数据
df = ak.stock_zh_a_hist(
    symbol="600519",  # 股票代码
    period="daily",   # 日线
    start_date="20230101",
    end_date="20231231",
    adjust="qfq"  # 前复权
)

# 获取实时行情
df = ak.stock_zh_a_spot_em()
```

**优点**：
- 完全免费
- 数据源稳定
- 支持多种数据类型

**缺点**：
- 某些接口可能有延迟
- 数据精度不如付费源

---

## baostock

**简介**：专业的证券宝数据平台，提供高质量A股历史数据。

**安装**：
```bash
pip install baostock
```

**使用示例**：
```python
import baostock as bs

# 登录
bs.login()

# 获取K线数据
rs = bs.query_history_k_data_plus(
    "sh600519",
    "date,code,open,high,low,close,volume,amount",
    start_date='2023-01-01',
    end_date='2023-12-31',
    frequency="d",
    adjustflag="2"  # 前复权
)

# 登出
bs.logout()
```

**优点**：
- 数据质量高
- 支持复权计算
- 历史数据完整

**缺点**：
- 需要登录登出
- 不支持实时数据

---

## tushare

**简介**：专业金融数据平台，提供丰富的研究数据。

**安装**：
```bash
pip install tushare
```

**认证**：
需要在 https://tushare.pro 注册获取token。

**使用示例**：
```python
import tushare as ts

# 设置token
ts.set_token('your_token_here')
pro = ts.pro_api()

# 获取日线数据
df = pro.daily(
    ts_code='600519.SH',
    start_date='20230101',
    end_date='20231231'
)

# 获取财务数据
df = pro.income(ts_code='600519.SH')
```

**优点**：
- 数据质量最高
- 包含财务数据
- 专业研究数据丰富

**缺点**：
- 需要付费（积分制）
- 某些数据需要高级权限

---

## ccxt

**简介**：加密货币交易所统一API，支持数十家交易所。

**安装**：
```bash
pip install ccxt
```

**支持的交易所**：
- Binance
- OKX
- Huobi
- Gate.io
- 等数十家

**使用示例**：
```python
import ccxt

# 创建交易所实例
exchange = ccxt.binance()

# 获取行情
ticker = exchange.fetch_ticker('BTC/USDT')

# 获取K线
ohlcv = exchange.fetch_ohlcv('BTC/USDT', '1d')
```

**优点**：
- 统一API接口
- 支持实盘交易
- 实时数据

**缺点**：
- 仅支持加密货币
- 需要交易所API密钥才能交易

---

## freqtrade内置数据源

**简介**：freqtrade内置支持的数据源。

**列表**：
- Binance
- Kraken
- Coinbase
- OKX
- Bittrex
- 等数十家交易所

**配置示例**：
```json
{
    "exchange": {
        "name": "binance",
        "key": "your_key",
        "secret": "your_secret",
        "pair_whitelist": ["BTC/USDT", "ETH/USDT"],
        "pair_blacklist": []
    }
}
```

**数据下载**：
```bash
freqtrade download-data --exchange binance --pairs BTC/USDT ETH/USDT --timeframe 1d --timerange 20230101-
```

---

## 数据源选择建议

| 使用场景 | 推荐数据源 |
|---------|-----------|
| A股回测研究 | akshare + baostock |
| A股专业研究 | tushare |
| 加密货币回测 | ccxt |
| 加密货币实盘 | freqtrade内置交易所 |
| 实盘交易 | 交易所官方API |
