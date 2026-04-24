# Freqtrade 官方文档要点

本文档总结freqtrade框架的核心概念和使用方法。

官方文档：https://www.freqtrade.io/en/stable/

---

## 核心概念

### 1. 策略结构

所有策略继承自IStrategy：

```python
from freqtrade.strategy import IStrategy
from pandas import DataFrame

class MyStrategy(IStrategy):
    # 时间周期
    timeframe = '5m'
    
    # 最小ROI（利润目标）
    minimal_roi = {
        "0": 0.10  # 10%利润
    }
    
    # 止损
    stoploss = -0.05  # 5%止损
    
    # 指标计算
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 计算技术指标
        return dataframe
    
    # 入场信号（v2+ API）
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[条件, 'enter_long'] = 1
        return dataframe
    
    # 出场信号（v2+ API）
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[条件, 'exit_long'] = 1
        return dataframe

# ⚠️ 注意：freqtrade v2+ 已弃用旧 API
# 旧 API（已废弃）：populate_buy_trend / populate_sell_trend，信号列 'buy' / 'sell'
# 新 API（推荐）：populate_entry_trend / populate_exit_trend，信号列 'enter_long' / 'exit_long'
```

### 2. 配置文件

config.json核心配置：

```json
{
    "max_open_trades": 3,  // 最大持仓数
    "stake_currency": "USDT",  // 计价货币
    "stake_amount": "unlimited",  // 每笔交易金额
    "dry_run": true,  // 模拟盘
    "dry_run_wallet": 1000,  // 模拟资金
    
    "exchange": {
        "name": "binance",
        "key": "",
        "secret": "",
        "pair_whitelist": ["BTC/USDT"]
    }
}
```

### 3. 时间周期

支持的时间周期：
- 分钟：1m, 3m, 5m, 15m, 30m
- 小时：1h, 2h, 4h, 6h, 8h, 12h
- 日：1d, 3d
- 周：1w
- 月：1M

---

## 常用命令

### 回测

```bash
# 基本回测
freqtrade backtesting --config config.json --strategy MyStrategy

# 指定时间范围
freqtrade backtesting --config config.json --strategy MyStrategy --timerange 20230101-20231231

# 导出结果
freqtrade backtesting --config config.json --strategy MyStrategy --export trades
```

### 参数优化

```bash
# 超参数优化
freqtrade hyperopt --config config.json --hyperopt-loss SharpeHyperOptLoss --strategy MyStrategy -e 100

# 空间优化
freqtrade hyperopt --config config.json --hyperopt-loss WinDrawLoss --strategy MyStrategy --spaces buy sell
```

### 实盘运行

```bash
# 模拟盘
freqtrade trade --config config.json --strategy MyStrategy

# 实盘（需要API密钥）
freqtrade trade --config config.json --strategy MyStrategy --dry-run false
```

### 数据管理

```bash
# 下载数据
freqtrade download-data --exchange binance --pairs BTC/USDT --timeframe 1d --timerange 20230101-

# 列出数据
freqtrade list-data --exchange binance
```

---

## 技术指标

### 使用TA-Lib

```python
import talib.abstract as ta

# 移动平均
dataframe['sma'] = ta.SMA(dataframe, timeperiod=20)
dataframe['ema'] = ta.EMA(dataframe, timeperiod=20)

# RSI
dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)

# MACD
macd = ta.MACD(dataframe, fastperiod=12, slowperiod=26, signalperiod=9)
dataframe['macd'] = macd['macd']
dataframe['macdsignal'] = macd['macdsignal']

# 布林带
bollinger = ta.BBANDS(dataframe, timeperiod=20)
dataframe['bb_upper'] = bollinger['upperband']
dataframe['bb_lower'] = bollinger['lowerband']
```

### 自定义指标

```python
def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
    # 自定义计算
    dataframe['custom_indicator'] = (
        dataframe['close'] - dataframe['close'].rolling(20).mean()
    ) / dataframe['close'].rolling(20).std()
    
    return dataframe
```

---

## 风险管理

### 止损类型

```python
# 固定止损
stoploss = -0.05

# 追踪止损
stoploss = -0.05
trailing_stop = True
trailing_stop_positive = 0.02
trailing_stop_positive_offset = 0.03
trailing_only_offset_is_reached = True
```

### 仓位管理

```python
# 固定金额
stake_amount = 100

# 动态仓位
def custom_stake_amount(self, pair: str, current_time: datetime, current_rate: float,
                       proposed_stake: float, min_stake: float, max_stake: float,
                       leverage: float, entry_tag: str, side: str, **kwargs) -> float:
    # 根据信号强度调整仓位
    return proposed_stake * 0.5
```

---

## 回测评估

### 评估指标

- 总收益率
- 年化收益率
- 最大回撤
- 夏普比率
- 胜率
- 盈亏比

### 可视化

```bash
# 生成回测报告
freqtrade backtesting-show --backtest-filename user_data/backtest_results/backtest-result-xxx.json
```

---

## 注意事项

1. **避免未来函数**：不要使用未来数据（如shift(-1)）
2. **数据泄漏**：训练ML模型时注意时间切分
3. **过拟合**：回测好不代表实盘好，需要样本外测试
4. **交易成本**：回测时考虑手续费和滑点
5. **流动性**：大资金需要考虑冲击成本
