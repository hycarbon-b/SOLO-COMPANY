# 模拟 OpenClaw 执行记录 — ML XGBoost 策略生成

**日期**：2026-04-21  
**Skill**：`freqtrade-cn-strategy`  
**场景**：用户请求生成一个基于机器学习（XGBoost）的 A 股量化策略

---

## 用户输入

> 帮我生成一个机器学习策略，用 XGBoost 预测 A 股涨跌，标的随机选一个

---

## OpenClaw 处理过程

### Step 1 · 匹配 Skill

OpenClaw 识别到关键词「机器学习策略」，匹配到 `freqtrade-cn-strategy` skill（emoji: 📈）。

---

### Step 2 · 确定标的（未指定 → 随机选股）

用户未指定标的，按 SKILL.md § 7 规则从沪深300成分股随机选择。

**执行命令**：
```bash
python {baseDir}/scripts/random_symbol.py --n 1
```

**输出**：
```
随机选择标的: ['600036.SH']  # 招商银行
```

---

### Step 3 · 初始化项目结构

**执行命令**：
```bash
python {baseDir}/scripts/init_project.py --target ./debug/freqtrade-cn
```

**创建目录结构**：
```
debug/freqtrade-cn/
├── strategies/
│   ├── cta/
│   ├── ml/
│   └── factor/
├── backtest/
│   ├── configs/
│   └── results/
├── data/
├── user_data/
│   └── strategies/
├── config/
│   └── config.json
└── requirements.txt
```

---

### Step 4 · 生成 ML 策略

**执行命令**：
```bash
python {baseDir}/scripts/generate_strategy.py \
  --type ml \
  --template xgboost \
  --name XGBoostCNStrategy \
  --output ./debug/freqtrade-cn
```

**实际输出**（已验证）：
```
策略已生成: debug\freqtrade-cn\strategies\ml\XGBoostCNStrategy.py
  类名: XGBoostCNStrategy
  同步到: debug\freqtrade-cn\user_data\strategies\XGBoostCNStrategy.py

下一步:
  回测: python scripts/run_backtest.py --strategy XGBoostCNStrategy --data ./freqtrade-cn/data --simple
  优化: python scripts/optimize.py --strategy XGBoostCNStrategy --output ./freqtrade-cn
```

---

### Step 5 · 生成的策略代码分析

文件路径：`debug/freqtrade-cn/strategies/ml/XGBoostCNStrategy.py`

| 属性 | 值 |
|------|-----|
| 框架 API | freqtrade v2+（`populate_entry_trend` / `populate_exit_trend`） |
| 信号列 | `enter_long` / `exit_long` |
| 时间周期 | `1d`（日线） |
| 止损 | `-5%` |
| 最小收益目标 | `8%` |
| 入场条件 | XGBoost 预测概率 > 0.6 |
| 出场条件 | XGBoost 预测概率 < 0.4 |
| Fallback | 无模型时用 momentum > 0 & RSI < 70 |

**特征工程**（6 个特征）：

| 特征 | 计算方法 |
|------|---------|
| `returns` | 日收益率 `close.pct_change()` |
| `volatility` | 20日收益率标准差 |
| `momentum` | 10日价格变化率 |
| `rsi` | 14日 RSI（手动计算，不依赖 ta-lib）|
| `macd` | EMA12 - EMA26 |
| `bb_width` | 布林带宽度 `2σ / SMA20` |

**模型训练逻辑**：
- 首次调用 `populate_entry_trend` 时触发 `_train_model`
- 标签：次日收益率 > 0 → 1，否则 → 0（二分类）
- 80% 训练集 / 20% 测试集（时序划分）
- 模型参数：`n_estimators=100, max_depth=4, learning_rate=0.1`
- 依赖缺失时自动降级到规则 fallback，不抛出异常

---

### Step 6 · 下一步建议

OpenClaw 向用户输出：

```
✅ 策略已生成：XGBoostCNStrategy

文件位置：
  debug/freqtrade-cn/strategies/ml/XGBoostCNStrategy.py
  debug/freqtrade-cn/user_data/strategies/XGBoostCNStrategy.py

建议下一步：

1. 下载数据（招商银行 600036.SH）：
   python scripts/download_data.py --symbol 600036.SH --start 2018-01-01 --end 2024-01-01 --source akshare --output ./debug/freqtrade-cn/data

2. 运行简单回测（无需 freqtrade）：
   python scripts/run_backtest.py --strategy XGBoostCNStrategy --data ./debug/freqtrade-cn/data/600036_SH_akshare.csv --simple

3. 参数优化：
   python scripts/optimize.py --strategy XGBoostCNStrategy --output ./debug/freqtrade-cn --mode grid --data ./debug/freqtrade-cn/data/600036_SH_akshare.csv

注意事项：
- 安装 XGBoost：pip install xgboost
- A 股 T+1 规则：当日买入次日才能卖出，回测时需注意
- 策略内置 fallback，即使不安装 xgboost 也可运行（退化为规则策略）
```

---

## 问题与发现

| 项目 | 状态 | 说明 |
|------|------|------|
| 策略生成 | ✅ 正常 | 411 行脚本，6 个模板全部可用 |
| v2+ API | ✅ 正确 | 使用 `enter_long` / `exit_long` |
| XGBoost 依赖 | ⚠️ 可选 | 未安装时自动 fallback，不崩溃 |
| ta-lib 依赖 | ✅ 无依赖 | ML 模板 RSI/MACD 用 pandas 手动计算 |
| 训练时序泄露 | ✅ 已防范 | `shift(-1)` 预测次日，split 按时序 |
