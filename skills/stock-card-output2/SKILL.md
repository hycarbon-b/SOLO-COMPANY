# Stock Card Output2 Skill

将选股结果以 **StockPickerTable 表格风格** 输出为 HTML 展示。

## 功能说明

本 skill 是 `stock-card-output` 的表格风格变体，将股票数据渲染为类似
`front-end/src/app/components/StockPickerTable.tsx` 的轻量表格样式：

- 白底圆角卡片容器
- 蓝紫渐变标题区
- 五列表格：股票名称 / 代码（等宽字体）/ 现价 / 涨跌幅 / 选股依据
- A 股配色：**涨红跌绿**（TrendingUp / TrendingDown 图标）
- hover 行高亮 + 底部免责声明

## 触发条件

- 用户需要以**表格**形式展示选股结果
- 用户说 "生成选股表格"、"输出股票推荐表"、"展示选股结果（表格版）"
- 选股 skill 完成后需要带「选股依据」的可视化输出

## 与 stock-card-output 的区别

| 特性 | stock-card-output | stock-card-output2 |
|------|-------------------|-------------------|
| 布局 | 卡片网格 | 表格行 |
| 风格 | TradingView 深色/浅色卡片 | StockPickerTable 简洁白卡 |
| 数据 | stats 统计项（市盈率等） | reason 文字选股依据 |
| 配色 | 可自定义主题色 | 蓝紫渐变头 + 涨红跌绿 |

## 使用方法

### 命令行

```bash
python card_script.py -i stock_data.json -o stock_report.html
```

### 程序化调用

```python
from card_script import generate_stocks_html, Stocks, Stock

stocks = Stocks(
    title="本周精选",
    subtitle="量化模型筛选结果",
    stocks=[
        Stock(
            name="贵州茅台",
            code="600519",
            price="1850.50",
            change="+23.50",
            changePct="+1.29",
            reason="业绩稳健增长，白酒行业龙头",
        )
    ]
)

html = generate_stocks_html(stocks)
```

## 数据结构

### schema.json 定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 标题（默认"智能选股推荐"） |
| subtitle | string | 否 | 副标题 |
| stocks | array | ✓ | 股票列表 |

每只股票字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✓ | 股票名称 |
| code | string | ✓ | 6位股票代码 |
| price | string | ✓ | 当前价格，如 `1850.50` |
| change | string | ✓ | 涨跌额（含符号），如 `+23.50` / `-2.10` |
| changePct | string | ✓ | 涨跌百分比（含符号，不含%），如 `+1.29` / `-1.23` |
| reason | string | ✓ | 选股依据说明文字 |

## 示例数据

参考 `stock_data.json`：

```json
{
  "title": "智能选股推荐",
  "subtitle": "基于多因子模型综合评分，筛选出当前市场优质标的",
  "stocks": [
    {
      "name": "贵州茅台",
      "code": "600519",
      "price": "1850.50",
      "change": "+23.50",
      "changePct": "+1.29",
      "reason": "业绩稳健增长，市盈率处于历史低位，白酒行业龙头地位稳固"
    }
  ]
}
```

## 文件结构

```
stock-card-output2/
├── SKILL.md          # 本文件
├── schema.json       # 数据结构定义
├── card_script.py    # HTML 生成脚本
├── stock_data.json   # 示例输入数据
└── output/
    └── report.html   # 示例输出
```
