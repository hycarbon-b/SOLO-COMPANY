# Stock Card Output Skill

将选股结果结构化输出为 HTML 卡片展示。

## 功能说明

本 skill 用于辅助选股 skill 的结果展示，将股票数据转换为美观的 TradingView 风格 HTML 卡片。

**核心流程：**
1. 接收股票数据（来自选股 skill 或手动输入）
2. 验证数据格式（基于 schema.json）
3. 生成 JSON 文件（符合 schema 定义）
4. 调用 card_script.py 转换为 HTML
5. 输出/展示 HTML 卡片

## 触发条件

- 用户需要展示选股结果
- 用户说 "生成股票卡片"、"输出股票报告"、"展示选股结果"
- 选股 skill 完成分析后需要可视化输出
- 用户提供了股票列表数据需要格式化展示

## 使用方法

### 方式一：从 JSON 文件生成

```bash
python card_script.py -i stock_data.json -o stock_report.html
```

### 方式二：在对话中直接使用

告诉 agent：
- "把这些股票生成卡片报告"
- "输出选股结果到 HTML"
- "生成股票卡片展示"

### 方式三：程序化调用

```python
from card_script import generate_stocks_html, Stocks, Stock, StatItem

# 构建数据
stocks = Stocks(stocks=[
    Stock(
        name="贵州茅台",
        code="600519.SH",
        price="1682.50",
        changeVal="+15.20",
        changePct="0.91",
        trend="bull",
        tag="价值白马",
        stats=[
            StatItem(label="市盈率", value="29.4"),
            StatItem(label="总市值", value="2.11万亿"),
        ]
    )
])

# 生成 HTML
html = generate_stocks_html(stocks)
```

## 数据结构

### schema.json 定义

每只股票包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✓ | 股票名称 |
| code | string | ✓ | 股票代码（格式：XXXXXX.SH/SZ） |
| price | string | ✓ | 当前价格 |
| changeVal | string | ✓ | 涨跌值（含符号，如 +15.20） |
| changePct | string | ✓ | 涨跌百分比（不含 %） |
| trend | string | ✓ | 趋势：bull（涨）/ bear（跌） |
| tag | string | ✓ | 标签/板块分类 |
| stats | array | ✓ | 统计信息列表（1-4项） |

### stats 统计项

| 字段 | 类型 | 说明 |
|------|------|------|
| label | string | 统计项标签（如"市盈率"） |
| value | string | 统计项数值 |

## 示例数据

参考 `stock_data.json`：

```json
{
  "stocks": [
    {
      "name": "贵州茅台",
      "code": "600519.SH",
      "price": "1682.50",
      "changeVal": "+15.20",
      "changePct": "0.91",
      "trend": "bull",
      "tag": "价值白马",
      "stats": [
        {"label": "市盈率", "value": "29.4"},
        {"label": "总市值", "value": "2.11万亿"},
        {"label": "换手", "value": "0.15%"},
        {"label": "成交额", "value": "25.8亿"}
      ]
    }
  ]
}
```

## 输出效果

生成的 HTML 卡片具有以下特点：

- **TradingView 风格**：专业金融数据展示风格
- **响应式布局**：自动适配不同屏幕宽度
- **涨跌配色**：红色（涨）/ 绿色（跌）
- **悬停效果**：卡片轻微上浮动画
- **统计网格**：2x2 布局展示关键指标

## 文件说明

```
stock-card-output/
├── SKILL.md          # 本说明文档
├── schema.json       # JSON Schema 数据结构定义
├── stock_data.json   # 示例数据
├── card_script.py    # HTML 生成脚本
└── output/           # 输出目录（自动创建）
    └── *.html        # 生成的 HTML 文件
```

## 依赖

- Python 3.8+
- Jinja2（模板渲染）
- jsonschema（可选，用于数据验证）

安装依赖：
```bash
pip install jinja2 jsonschema
```

## 与选股 Skill 集成

本 skill 设计为选股 skill 的下游输出组件：

1. **选股 skill** → 分析股票 → 输出结构化数据
2. **本 skill** → 接收数据 → 生成可视化 HTML

集成示例：
```python
# 选股 skill 输出
analysis_result = {
    "stocks": [...],
    "recommendation": "买入",
    "risk_level": "中"
}

# 调用本 skill 生成展示
html = generate_stocks_html(analysis_result)
```

## 注意事项

- 股票代码必须符合格式：6位数字 + .SH/.SZ
- 涨跌值必须包含正负号
- stats 最多 4 项，超出会被截断
- 生成的 HTML 为独立文件，可直接在浏览器打开
