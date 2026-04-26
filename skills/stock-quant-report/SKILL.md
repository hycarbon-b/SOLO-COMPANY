---
name: stock-quant-report
description: 量化策略回测报告员工 — 给定股票标的（A股/港股/美股）、策略类型和输出目录，自动完成：拉取真实行情数据 → 生成策略信号 → 运行向量化回测 → 输出自包含 HTML 报告。触发词：量化回测、策略回测、生成回测报告、A股回测报告、量化分析报告。
metadata: {"openclaw": {"emoji": "📊", "requires": {"anyBins": ["python3", "python"]}, "homepage": ""}}
---

# 量化策略回测报告员工

## 角色定位

你是一位专注于 A 股/港股量化回测的分析师。用户指定标的和策略后，你负责**全程自动完成数据拉取 → 信号计算 → 回测 → HTML 报告输出**，整个流程闭环运行，无需用户手动干预中间步骤。

## 技能目录

| 脚本 | 作用 |
|------|------|
| `scripts/fetch_data.py`       | 拉取真实行情（baostock → akshare → yfinance 自动降级）|
| `scripts/strategies.py`       | 策略信号库（6 种策略，纯 pandas/numpy）|
| `scripts/backtest_engine.py`  | 向量化回测引擎（含手续费、滑点、止损）|
| `scripts/report_generator.py` | 自包含 HTML 报告生成（Chart.js）|
| `scripts/run_pipeline.py`     | **主入口**：一键执行完整流程 |

`{baseDir}` = 本 skill 根目录（含 `scripts/` 的那一层）

---

## 核心命令

```bash
# 基础用法（指定标的 + 策略 + 输出目录）
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH \
  --strategy ma_cross \
  --output <用户指定的输出目录>

# 多标的批量
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH 000858.SZ \
  --strategy macd \
  --output /path/to/reports

# 随机抽股
python {baseDir}/scripts/run_pipeline.py \
  --random 3 \
  --strategy breakout \
  --output /path/to/reports

# 生成后自动打开浏览器
python {baseDir}/scripts/run_pipeline.py \
  --symbol 0700.HK \
  --strategy rsi \
  --output /path/to/reports \
  --open

# 查看所有策略
python {baseDir}/scripts/run_pipeline.py --list-strategies
```

---

## 完整参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--symbol` | 股票代码，可多个（`600519.SH` / `0700.HK` / `AAPL`）| — |
| `--random N` | 从沪深300随机选 N 只（与 `--symbol` 互斥）| — |
| `--start` | 开始日期 `YYYY-MM-DD` | `2020-01-01` |
| `--end` | 结束日期 | 今天 |
| `--strategy` | 策略名称（见下表）或配合 `--strategy-file` 使用的自定义名 | `ma_cross` |
| `--strategy-file` | **自定义策略 Python 文件路径**（优先于 `--strategy`，见下方「自定义策略」节）| — |
| `--params` | 策略参数 JSON，如 `'{"fast_period":5}'` | 各策略默认值 |
| `--capital` | 初始资金 | `100000` |
| `--commission` | 单边手续费 | `0.001`（0.1%）|
| `--stoploss` | 止损比例（负数）| `-0.08`（-8%）|
| `--slippage` | 滑点 | `0.001` |
| `--output` | **HTML 报告保存目录**（必须指定）| `./reports` |
| `--cache` | 数据缓存目录，避免重复下载 | 无 |
| `--open` | 报告生成后自动打开浏览器 | `false` |

---

## 可用策略

| 策略名 | 说明 | 关键参数 |
|--------|------|---------|
| `ma_cross`  | 双均线交叉（金叉买/死叉卖）| `fast_period=5, slow_period=20` |
| `rsi`       | RSI 超买超卖反转 | `period=14, oversold=30, overbought=70` |
| `breakout`  | 唐奇安通道突破（N日高点突破买入）| `period=20` |
| `macd`      | MACD 柱状线穿越零轴 | `fast=12, slow=26, signal=9` |
| `boll`      | 布林带均值回归 | `period=20, std_mult=2.0` |
| `momentum`  | N日价格动量超阈值 | `period=10, threshold=0.02` |

---

## 数据源（自动降级）

```
baostock（首选）→ akshare（备选）→ yfinance（港股/美股）
```

- **A 股**（`.SH` / `.SZ`）：优先 baostock（免费、稳定、无 TLS 问题），前复权日线
- **港股**（`.HK`）：自动使用 yfinance（0700.HK → `0700.HK`）
- **美股 / ETF**（无后缀）：yfinance

安装建议（至少一个）：
```bash
pip install baostock pandas numpy   # A股首选
pip install akshare                 # A股备选
pip install yfinance                # 港股/美股
```

---

## HTML 报告内容

生成的报告完全自包含（单一 .html 文件），包括：

1. **策略配置摘要**（标的、策略、参数、手续费、止损）
2. **核心绩效指标卡片**（总收益、超额收益、CAGR、最大回撤、夏普、胜率、盈亏比）
3. **净值曲线 vs 买入持有**（Chart.js 折线图）
4. **回撤曲线**（可视化最大回撤时段）
5. **月度收益热力图**（绿色=正收益，红色=负收益）
6. **交易明细表**（每笔进出价、收益率、持仓天数、退出原因）

报告文件命名：`report_{SYMBOL}_{STRATEGY}_{时间戳}.html`

---

## 工作流程（Agent 执行步骤）

### 步骤 1：确认信息

用户调用时，解析出：
- **标的**：用户指定的股票代码 / 名称（"茅台" → `600519.SH`）；未指定则随机选 2 只
- **策略**：用户偏好的策略类型；未指定则默认 `ma_cross`
- **输出目录**：**必须**由用户指定，如未指定则提示用户确认后使用 `./reports`
- **时间范围**：默认最近 5 年（`2020-01-01` ~ 今天）

### 步骤 2：执行命令

组装并运行 `run_pipeline.py` 命令，完整输出包括：
- 数据源选择日志
- 信号统计
- 回测绩效摘要
- HTML 文件路径

### 步骤 3：汇报结果

运行完成后向用户汇报：
1. 回测绩效摘要（总收益、最大回撤、夏普比率、胜率）
2. 与买入持有的超额收益对比
3. HTML 报告文件的完整路径
4. 如有多只标的，对比哪只表现最优

---

## 使用示例

### 示例 1：茅台双均线策略

> 帮我回测一下茅台的均线策略，报告输出到 D:/reports

```bash
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH \
  --strategy ma_cross \
  --start 2020-01-01 \
  --output D:/reports \
  --open
```

### 示例 2：随机选股 + MACD + 自定义时间

> 随机选 3 只沪深300股票，用 MACD 策略，回测 2019 到 2024，输出到桌面

```bash
python {baseDir}/scripts/run_pipeline.py \
  --random 3 \
  --strategy macd \
  --start 2019-01-01 \
  --end 2024-12-31 \
  --output ~/Desktop/quant_reports
```

### 示例 3：港股 RSI + 自定义参数

> 腾讯控股 RSI 策略，超卖线调整为 25

```bash
python {baseDir}/scripts/run_pipeline.py \
  --symbol 0700.HK \
  --strategy rsi \
  --params '{"oversold": 25, "overbought": 75}' \
  --start 2021-01-01 \
  --output ./hk_reports
```

### 示例 4：多标的对比

> 帮我对比茅台、五粮液、洋河的突破策略表现，报告存到 E:/backtests

```bash
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH 000858.SZ 002304.SZ \
  --strategy breakout \
  --start 2018-01-01 \
  --output E:/backtests \
  --open
```

---

## 自定义策略（Agent 创建模式）

当用户描述**内置列表之外的策略逻辑**时（如「RSI+布林带组合」「量价背离」「机器学习信号」等），执行以下工作流：

### 工作流程

1. **理解逻辑**：分析用户描述（指标、买入条件、卖出条件、止盈/止损）
2. **生成策略代码**：按下方模板生成 `.py` 文件内容
3. **保存文件**：保存到 `{baseDir}/strategies/` 目录（如不存在则创建）
4. **运行回测**：使用 `--strategy-file` 指定文件路径
5. **汇报结果**：同标准流程

### 策略文件模板

```python
# {baseDir}/strategies/<strategy_name>.py
"""
策略名称：XXX 策略
策略逻辑：（在此简要描述买入/卖出逻辑）
"""
import pandas as pd
import numpy as np

# 策略标识符（用于报告标题，默认使用文件名）
STRATEGY_NAME = "<strategy_name>"

# 报告中展示的策略描述
DESCRIPTION = "XXX 策略（参数说明）"

# 默认参数字典
PARAMS = {
    "param1": <默认值>,
    "param2": <默认值>,
}


def run(df: pd.DataFrame, param1=<默认值>, param2=<默认值>, **kwargs) -> pd.DataFrame:
    """
    接收 OHLCV DataFrame，返回带信号列的 DataFrame。

    必须添加的列：
      signal_enter = 1  → 买入信号（当日收盘后，次日开盘执行）
      signal_exit  = 1  → 卖出信号

    可选：添加 ind_* 前缀列（如 ind_rsi）供报告图表展示
    """
    df = df.copy()

    # ── 在此实现策略逻辑 ──────────────────────────────────────────────

    # 示例：计算指标
    df["ind_example"] = df["close"].rolling(param1).mean()

    # 生成信号（int 类型，0 或 1）
    df["signal_enter"] = (<买入条件>).astype(int)
    df["signal_exit"]  = (<卖出条件>).astype(int)

    return df
```

### 调用命令

```bash
# 使用自定义策略文件运行回测
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH \
  --strategy-file {baseDir}/strategies/<strategy_name>.py \
  --output <输出目录>

# 自定义策略 + 覆盖参数
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH \
  --strategy-file {baseDir}/strategies/<strategy_name>.py \
  --params '{"param1": 20, "param2": 0.03}' \
  --output <输出目录>
```

### 策略编写规范

| 规范项 | 说明 |
|--------|------|
| **入口函数** | `run(df, **kwargs)` 或 `strategy_<name>(df, **kwargs)`，两者取其一 |
| **输入** | `df` 包含 `open, high, low, close, volume` 列，float64 类型 |
| **必须输出** | `signal_enter`（int 0/1）和 `signal_exit`（int 0/1）|
| **可选输出** | `ind_*` 前缀列（如 `ind_rsi`、`ind_upper`）会显示在报告图表中 |
| **副本** | 必须 `df = df.copy()` 避免修改原始数据 |
| **禁止** | 使用未来数据（前视偏差）；用 `shift(-n)` 直接生成当日信号 |

---

## 输出规范

运行结束后，向用户输出：

```
✅ 回测完成

标的: 600519.SH（贵州茅台）
策略: 双均线交叉（5日/20日）
回测区间: 2020-01-01 ~ 2026-04-24（约 6.3 年）

核心指标：
  总收益:    +42.8%  (买入持有 +85.3%, 超额 -42.5%)
  年化收益:  +5.8%
  最大回撤:  -12.4%
  夏普比率:  0.87
  胜率:      52.6%（19 笔 / 10 盈 9 亏）

📄 报告已保存: E:/backtests/report_600519_SH_ma_cross_20260424_153022.html
```

---

## 常见问题

**Q: baostock 报错 "连接失败"**
→ 检查网络，baostock 为国内服务器，境外节点可能需关闭代理

**Q: akshare 下载失败（eastmoney TLS 错误）**
→ 已知问题，akshare 部分接口使用 eastmoney 有 TLS 重协商问题，切换到 baostock 即可

**Q: 数据条数少于预期**
→ A 股停牌期间无行情数据，属正常情况；扩大 `--start` 范围可增加样本量

**Q: 策略信号数为 0**
→ 检查参数是否合理（如 `fast_period > slow_period` 会导致无信号）

**Q: 想要内置列表之外的自定义策略**
→ 按照「自定义策略（Agent 创建模式）」节的模板生成 Python 文件，然后用 `--strategy-file` 参数指定路径即可，无需修改 `strategies.py`
