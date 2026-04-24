---
name: freqtrade-cn-strategy
description: 生成针对中国市场（A股/港股）的量化交易策略代码框架，基于 freqtrade v2+ 框架。支持 CTA 趋势策略（均线、突破、动量、海龟）、机器学习策略（XGBoost/LSTM）、多因子策略。可初始化项目结构、下载数据、生成策略代码、运行回测和参数优化。触发词：量化策略、freqtrade 策略、A 股回测、CTA 策略、机器学习交易、因子策略、中国市场量化。
metadata: {"openclaw": {"emoji": "📈", "requires": {"anyBins": ["python3", "python", "freqtrade"]}, "homepage": "https://www.freqtrade.io/en/stable/"}}
---

# Freqtrade 中国市场量化策略生成器

## 概述

此 skill 帮助快速搭建针对中国市场的量化交易策略框架，基于 **freqtrade v2+** 框架（使用 `enter_long` / `exit_long` 新 API）。支持：

- **CTA 趋势策略**：均线交叉（ma_cross）、突破（breakout）、动量（momentum）、海龟法则（turtle）
- **机器学习策略**：XGBoost 特征预测
- **多因子策略**：动量 + 质量 + 趋势因子组合

脚本目录：`{baseDir}/scripts/`  
参考文档：`{baseDir}/references/`

## 重要：freqtrade v2+ API

freqtrade ≥ 2023.1 使用新信号命名：

| 旧 API（已弃用）| 新 API |
|---|---|
| `populate_buy_trend` | `populate_entry_trend` |
| `populate_sell_trend` | `populate_exit_trend` |
| `dataframe['buy'] = 1` | `dataframe['enter_long'] = 1` |
| `dataframe['sell'] = 1` | `dataframe['exit_long'] = 1` |

生成的所有策略均使用新 API。

## 工作流程

### 1. 环境初始化

```bash
python {baseDir}/scripts/init_project.py --target <目标目录>
```

未指定目录时默认在当前目录下创建 `freqtrade-cn/`。

### 2. 项目结构

```
freqtrade-cn/
├── strategies/
│   ├── cta/          # CTA 趋势策略
│   ├── ml/           # 机器学习策略
│   └── factor/       # 多因子策略
├── backtest/
│   ├── configs/      # 回测配置
│   └── results/      # 回测结果
├── data/             # 本地数据
├── user_data/
│   └── strategies/   # freqtrade 策略入口
├── config/
│   └── config.json   # freqtrade 配置
└── requirements.txt
```

### 3. 数据下载与转换

| 数据源 | 类型 | 适合场景 |
|--------|------|----------|
| **baostock** | 免费 | **推荐**：A 股日线，私有协议，无 TLS 问题 |
| akshare | 免费 | 已知网络兼容问题（eastmoney TLS 重协商） |
| tushare | 免费/付费 | 专业研究 |
| ccxt | 免费 | 加密货币（币安、OKX） |

```bash
# 步骤 1：下载 CSV 数据（默认 baostock，推荐）
python {baseDir}/scripts/download_data.py --symbol 600519.SH --start 2020-01-01 --end 2024-01-01 --source baostock --output ./freqtrade-cn/data

# 步骤 2：转换为 freqtrade JSON 格式（回测必需步骤！）
python {baseDir}/scripts/convert_data.py --input ./freqtrade-cn/data --output ./freqtrade-cn/user_data/data

# 随机选股 + 转换
python {baseDir}/scripts/download_data.py --random 3 --start 2020-01-01 --output ./freqtrade-cn/data
python {baseDir}/scripts/convert_data.py --input ./freqtrade-cn/data --output ./freqtrade-cn/user_data/data
```

> **重要**：freqtrade 回测必须使用专有 JSON 格式（存于 `user_data/data/<exchange>/` 目录）。convert_data.py 会自动更新 config.json 的 `pair_whitelist`。

### 4. 策略生成

```bash
# CTA 策略（ma_cross / breakout / momentum / turtle）
python {baseDir}/scripts/generate_strategy.py --type cta --template ma_cross --name MyMACross --output ./freqtrade-cn

# 机器学习策略
python {baseDir}/scripts/generate_strategy.py --type ml --template xgboost --name MyMLStrategy --output ./freqtrade-cn

# 多因子策略
python {baseDir}/scripts/generate_strategy.py --type factor --template multi --name MyFactor --output ./freqtrade-cn
```

### 5. 运行回测

freqtrade 回测必须先运行步骤 3（convert_data.py）将数据转换为 JSON 格式。

**A 股 config.json 必须包含以下关键字段（否则回测失败）**：
```json
{
    "stake_currency": "USDT",        // A 股价格用 USDT 标记（freqtrade 要求 Binance 支持的货币）
    "trading_mode": "spot",
    "dataformat_ohlcv": "json",       // 必须显式指定，否则找不到数据文件
    "fee": 0.001,                     // A 股手续费 0.1%（绕过 exchange 查询）
    "skip_pair_validation": true,     // 根级别设置，让非标准对通过配置验证
    "pairlists": [{"method": "StaticPairList", "allow_inactive": true}],
    "exchange": {
        "name": "binance",
        "ccxt_async_config": {"aiohttp_proxy": "http://127.0.0.1:7897"},
        "pair_whitelist": ["600519/USDT"]
    }
}
```

**策略必须实现 `bot_start` 注入 A 股市场元数据**：
```python
def bot_start(self, **kwargs) -> None:
    """注入 A 股假市场数据（Binance 无 A 股，需手动添加）"""
    if self.dp and hasattr(self.dp, '_exchange'):
        for pair in (self.dp.current_whitelist() or []):
            if pair not in self.dp._exchange.markets:
                base, quote = pair.split('/')
                self.dp._exchange.markets[pair] = {
                    'id': pair.replace('/', ''), 'symbol': pair,
                    'base': base, 'quote': quote, 'active': True, 'spot': True,
                    'limits': {'amount': {'min': 1}, 'cost': {'min': 1}},
                    'precision': {'amount': 1, 'price': 0.01},  # TICK_SIZE 模式，不能为 0
                    'taker': 0.001, 'maker': 0.001, 'info': {},
                }
```

**数据文件命名**：`{BASE}_{QUOTE}-{timeframe}.json`（注意是连字符 `-`，不是下划线）
- 正确：`600519_USDT-1d.json`，对应 pair `600519/USDT`

```bash
# 标准回测（指定时间范围）
python {baseDir}/scripts/run_backtest.py --strategy MyMACross --output ./freqtrade-cn --timerange 20200101-20240101

# 不指定时间范围（使用全部数据）
python {baseDir}/scripts/run_backtest.py --strategy MyMACross --output ./freqtrade-cn
```

回测结果保存到 `./freqtrade-cn/backtest/results/` 目录。

### 6. 参数优化

```bash
python {baseDir}/scripts/optimize.py --strategy MyMACross --output ./freqtrade-cn
```

### 7. 标的选择规则

- 用户指定了标的（如"茅台"、"600519.SH"）→ 使用指定标的
- 用户**未指定**标的 → 从沪深300成分股中随机选择1~3只

```python
# 随机选股
from scripts.random_symbol import get_random_symbols
symbols = get_random_symbols(n=2)
```

## 参考文件

- `{baseDir}/references/strategy_templates.md` - 策略模板详解
- `{baseDir}/references/data_sources.md` - 数据源配置
- `{baseDir}/references/freqtrade_docs.md` - freqtrade 核心文档
- `{baseDir}/references/china_market.md` - A 股市场适配（T+1、涨跌停、复权等）

## 输出规范

生成的策略代码必须：

1. **使用 v2+ API**：`populate_entry_trend` / `populate_exit_trend`，信号列 `enter_long` / `exit_long`
2. **完整可运行**：包含所有 import 和配置
3. **参数化设计**：使用 `IntParameter` / `DecimalParameter` 便于 hyperopt
4. **包含止损**：`stoploss` 和 `minimal_roi` 必须设置
5. **避免未来函数**：所有 shift/rolling 使用正确方向

## 使用示例

### 示例1：茅台均线策略

> 生成一个针对茅台的均线交叉策略并回测

```bash
python {baseDir}/scripts/init_project.py
python {baseDir}/scripts/download_data.py --symbol 600519.SH --start 2020-01-01 --output ./freqtrade-cn/data
python {baseDir}/scripts/convert_data.py --input ./freqtrade-cn/data --output ./freqtrade-cn/user_data/data
python {baseDir}/scripts/generate_strategy.py --type cta --template ma_cross --name MaotaiMA --output ./freqtrade-cn
python {baseDir}/scripts/run_backtest.py --strategy MaotaiMA --output ./freqtrade-cn --timerange 20200101-20240101
```

### 示例2：随机选股 XGBoost 策略

> 用 XGBoost 随机选股回测

```bash
python {baseDir}/scripts/init_project.py
python {baseDir}/scripts/download_data.py --random 2 --start 2021-01-01 --output ./freqtrade-cn/data
python {baseDir}/scripts/convert_data.py --input ./freqtrade-cn/data --output ./freqtrade-cn/user_data/data
python {baseDir}/scripts/generate_strategy.py --type ml --template xgboost --name RandomML --output ./freqtrade-cn
python {baseDir}/scripts/run_backtest.py --strategy RandomML --output ./freqtrade-cn
```
