# 模拟 OpenClaw 执行记录 — stock-quant-report 回测报告生成

**日期**：2026-04-26  
**Skill**：`stock-quant-report`  
**场景**：用户请求生成股票量化策略回测报告

---

## OpenClaw 基本功能速记

根据 PyPI 与 CMDOP 文档，OpenClaw 的定位是一个 **Python 侧的 agent orchestration / plugin framework**，主要能力包括：

- 以 pipeline 方式串联多步任务，并在步骤间传递上下文
- 通过插件机制扩展 agent 的工具能力
- 接入 CMDOP 的终端、文件、浏览器、AI Agent 等服务
- 适合把“识别需求 → 选择 skill → 执行脚本 → 汇报结果”这类流程做成可复用自动化

对这个仓库里的 `SKILL.md` 来说，可以把 OpenClaw 理解为：

1. 先根据用户请求匹配 skill
2. 再读取 skill 元数据与操作说明
3. 组装命令
4. 执行脚本
5. 整理结果回给用户

---

## 用户输入

> 帮我回测一下贵州茅台的双均线策略，报告输出到 `D:/quant_reports`

---

## OpenClaw 处理过程

### Step 1 · 匹配 Skill

OpenClaw 识别到关键词「回测」「策略」「报告」，匹配到 `stock-quant-report` skill。

读取到的关键元数据：

- emoji: `📊`
- 运行依赖：`python3` 或 `python`
- 主入口：`scripts/run_pipeline.py`

---

### Step 2 · 解析用户意图

从请求中解析出：

- 标的：`600519.SH`（贵州茅台）
- 策略：`ma_cross`
- 开始日期：默认 `2020-01-01`
- 结束日期：默认当天 `2026-04-26`
- 输出目录：`D:/quant_reports`

映射依据：

- 股票名称“贵州茅台”映射为 `600519.SH`
- “双均线策略”映射为 `ma_cross`
- 用户已明确指定输出目录，因此不走默认 `./reports`

---

### Step 3 · 组装执行命令

```bash
python {baseDir}/scripts/run_pipeline.py \
  --symbol 600519.SH \
  --strategy ma_cross \
  --start 2020-01-01 \
  --end 2026-04-26 \
  --output D:/quant_reports
```

---

### Step 4 · 预期执行链路

OpenClaw 按 `run_pipeline.py` 的实现，预期会依次完成：

1. `fetch_data.py` 拉取行情数据
2. `strategies.py` 计算 `ma_cross` 信号
3. `backtest_engine.py` 运行向量化回测
4. `report_generator.py` 生成自包含 HTML 报告

其中数据源优先级为：

```text
baostock -> akshare -> yfinance
```

---

### Step 5 · 模拟终端输出

以下是按当前 skill 设计推演出的 **模拟输出**：

```text
============================================================
标的: 600519.SH  策略: ma_cross  2020-01-01 ~ 2026-04-26
============================================================

[fetch] 拉取 600519.SH (2020-01-01 ~ 2026-04-26)
  [baostock] 登录...
  [baostock] 拉取 sh.600519 2020-01-01 ~ 2026-04-26 ...
  [baostock] 成功: 1512 条记录

[strategy] 双均线交叉（5日/20日）
[strategy] 买入信号 21 次 / 卖出信号 20 次

[backtest] 开始回测...
[backtest] 总收益: +38.42%  买入持有: +76.15%  超额: -37.73%
[backtest] 最大回撤: 14.87%  夏普: 0.79  交易数: 20  胜率: 55.0%

============================================================
完成！共生成 1 份报告：
  📄 D:/quant_reports/report_600519_SH_ma_cross_20260426_142300.html
============================================================
```

说明：以上数值为 **模拟回放样例**，用于展示 OpenClaw 会如何组织调用与汇报，不代表当前环境实测绩效。

---

### Step 6 · OpenClaw 面向用户的最终回复

```text
✅ 回测完成

标的: 600519.SH（贵州茅台）
策略: 双均线交叉（5日/20日）
回测区间: 2020-01-01 ~ 2026-04-26

核心指标：
  总收益:    +38.42%
  买入持有:  +76.15%
  超额收益:  -37.73%
  最大回撤:  -14.87%
  夏普比率:  0.79
  胜率:      55.0%

📄 报告已保存: D:/quant_reports/report_600519_SH_ma_cross_20260426_142300.html
```

---

## 当前环境下的真实验证结果

本地已执行过一个最小验证命令：

```bash
python d:/Worksapce_tradingbase/SOLO-COMPANY/skills/stock-quant-report/scripts/run_pipeline.py --list-strategies
```

真实结果：

```text
ModuleNotFoundError: No module named 'pandas'
```

这说明当前工作区环境里，`stock-quant-report` 的真实执行前提尚未满足。至少需要先安装：

```bash
pip install pandas numpy
```

若要实际拉取并回测 A 股，通常还需要至少一个数据源依赖：

```bash
pip install baostock
```

可选依赖：

```bash
pip install akshare yfinance
```

---

## 结论

如果由 OpenClaw 调用这个 skill，它的动作模型可以概括为：

1. 用意图匹配挑出 `stock-quant-report`
2. 从 `SKILL.md` 解析参数规则与主入口
3. 生成 `run_pipeline.py` 命令
4. 执行数据拉取、策略生成、回测和 HTML 报告输出
5. 将绩效摘要和报告路径回传给用户

在当前机器上，模拟链路成立，但真实运行前需要先补齐 Python 依赖。

---

## 本次真实执行记录

本次按 OpenClaw 的执行思路，实际完成了以下步骤：

1. 读取 `SKILL.md`，确认主入口为 `scripts/run_pipeline.py`
2. 采用默认映射执行一轮真实调用：
   - 标的：`600519.SH`
   - 策略：`ma_cross`
   - 区间：`2020-01-01 ~ 2026-04-26`
   - 输出目录：`debug/reports`
3. 安装最小依赖：`pandas`、`numpy`、`baostock`
4. 先执行 `--list-strategies` 验证入口
5. 再执行完整回测命令

### 实际执行命令

```bash
python d:/Worksapce_tradingbase/SOLO-COMPANY/skills/stock-quant-report/scripts/run_pipeline.py --list-strategies

python d:/Worksapce_tradingbase/SOLO-COMPANY/skills/stock-quant-report/scripts/run_pipeline.py \
  --symbol 600519.SH \
  --strategy ma_cross \
  --start 2020-01-01 \
  --end 2026-04-26 \
  --output d:/Worksapce_tradingbase/SOLO-COMPANY/skills/stock-quant-report/debug/reports
```

### 实际运行结果

```text
============================================================
标的: 600519.SH  策略: ma_cross  2020-01-01 ~ 2026-04-26
============================================================

[fetch] 拉取 600519.SH (2020-01-01 ~ 2026-04-26)
  [baostock] 登录...
login success!
  [baostock] 拉取 sh.600519 2020-01-01 ~ 2026-04-26 ...
logout success!
  [baostock] 成功: 1528 条记录

[strategy] 双均线交叉（5日/20日）
[strategy] 买入信号 48 次 / 卖出信号 48 次

[backtest] 开始回测...
[backtest] 总收益: -28.20%  买入持有: +48.97%  超额: -77.17%
[backtest] 最大回撤: -61.82%  夏普: -0.20  交易数: 48  胜率: 29.2%

[report] HTML 报告已生成: d:\Worksapce_tradingbase\SOLO-COMPANY\skills\stock-quant-report\debug\reports\report_600519_SH_ma_cross_20260426_003309.html
```

### 结论更新

`stock-quant-report` 已经在当前环境中真实跑通，不再只是模拟。

本次 OpenClaw 风格执行链路的真实结果是：

- 入口可用
- baostock 数据拉取成功
- 策略信号生成成功
- 回测执行成功
- HTML 报告生成成功

生成报告文件：

`d:\Worksapce_tradingbase\SOLO-COMPANY\skills\stock-quant-report\debug\reports\report_600519_SH_ma_cross_20260426_003309.html`