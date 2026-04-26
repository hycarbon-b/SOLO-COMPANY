"""
Stock Table Generator - 股票表格 HTML 生成器（StockPickerTable 风格）

将股票 JSON 数据转换为类 StockPickerTable 风格的 HTML 表格展示。
样式参考 front-end/src/app/components/StockPickerTable.tsx

Usage:
    python card_script.py -i stock_data.json -o stock_report.html
"""

import json
import argparse
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Union

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import jsonschema
    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False


@dataclass
class Stock:
    name: str
    code: str
    price: str
    change: str      # 含符号，如 +23.50 / -2.10
    changePct: str   # 含符号不含%，如 +1.29 / -1.23
    reason: str


@dataclass
class Stocks:
    stocks: List[Stock] = field(default_factory=list)
    title: str = "智能选股推荐"
    subtitle: str = "基于多因子模型综合评分，筛选出当前市场优质标的"


# TrendingUp SVG (涨)
ICON_UP = '''<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
  <polyline points="17 6 23 6 23 12"></polyline>
</svg>'''

# TrendingDown SVG (跌)
ICON_DOWN = '''<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
  <polyline points="17 18 23 18 23 12"></polyline>
</svg>'''


def _is_positive(val: str) -> bool:
    """判断是否为正数（涨），A 股涨红跌绿"""
    return val.startswith('+') or (not val.startswith('-') and float(val) >= 0)


def validate_json_schema(data: dict, schema_path: Path) -> bool:
    if not JSONSCHEMA_AVAILABLE:
        return True
    if not schema_path.exists():
        return True
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
        jsonschema.validate(instance=data, schema=schema)
        return True
    except jsonschema.ValidationError as e:
        print(f"验证错误: {e.message}")
        return False
    except Exception:
        return False


def generate_stocks_html(stocks_data: Union[Stocks, str]) -> str:
    """生成 StockPickerTable 风格的 HTML 表格"""
    if isinstance(stocks_data, Stocks):
        stocks_list = [
            {
                "name": s.name,
                "code": s.code,
                "price": s.price,
                "change": s.change,
                "changePct": s.changePct,
                "reason": s.reason,
            }
            for s in stocks_data.stocks
        ]
        title = stocks_data.title
        subtitle = stocks_data.subtitle
    else:
        data = json.loads(stocks_data)
        stocks_list = data["stocks"]
        title = data.get("title", "智能选股推荐")
        subtitle = data.get("subtitle", "基于多因子模型综合评分，筛选出当前市场优质标的")

    rows_html = ""
    for stock in stocks_list:
        is_up = _is_positive(stock["changePct"])
        pct_color = "color-up" if is_up else "color-down"
        icon = ICON_UP if is_up else ICON_DOWN
        pct_display = stock["changePct"] if stock["changePct"].startswith(('+', '-')) else '+' + stock["changePct"]
        change_display = stock["change"] if stock["change"].startswith(('+', '-')) else '+' + stock["change"]

        rows_html += f'''
            <tr class="table-row">
              <td class="td td-name">
                <span class="stock-name">{stock["name"]}</span>
              </td>
              <td class="td td-code">
                <span class="stock-code">{stock["code"]}</span>
              </td>
              <td class="td td-right">
                <span class="price">¥{stock["price"]}</span>
              </td>
              <td class="td td-right">
                <div class="change-pct {pct_color}">
                  {icon}
                  <span>{pct_display}%</span>
                </div>
                <div class="change-val {pct_color}">{change_display}</div>
              </td>
              <td class="td td-reason">
                <span class="reason">{stock["reason"]}</span>
              </td>
            </tr>'''

    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f1f5f9;
    padding: 24px;
    min-height: 100vh;
  }}
  .wrapper {{
    max-width: 960px;
    margin: 0 auto;
  }}
  /* 卡片容器 */
  .card {{
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }}
  /* 标题区 */
  .card-header {{
    background: linear-gradient(to right, #eff6ff, #eef2ff);
    padding: 12px 16px;
  }}
  .card-title {{
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }}
  .card-subtitle {{
    font-size: 0.875rem;
    color: #4b5563;
    margin-top: 4px;
  }}
  /* 表格滚动容器 */
  .table-scroll {{
    overflow-x: auto;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
  }}
  /* 表头 */
  thead {{
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }}
  th {{
    padding: 12px 16px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }}
  th.th-left  {{ text-align: left; }}
  th.th-right {{ text-align: right; }}
  /* 表体 */
  tbody tr {{ border-bottom: 1px solid #f3f4f6; }}
  tbody tr:last-child {{ border-bottom: none; }}
  .table-row {{ transition: background-color 0.15s; }}
  .table-row:hover {{ background: #f9fafb; }}
  .td {{ padding: 12px 16px; vertical-align: middle; }}
  .td-right {{ text-align: right; }}
  /* 股票名称 */
  .stock-name {{
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
  }}
  /* 股票代码 */
  .stock-code {{
    font-size: 0.875rem;
    color: #4b5563;
    font-family: "Courier New", Courier, monospace;
  }}
  /* 价格 */
  .price {{
    font-size: 0.875rem;
    color: #111827;
  }}
  /* 涨跌幅（A股：涨红跌绿） */
  .color-up   {{ color: #dc2626; }}
  .color-down {{ color: #16a34a; }}
  .change-pct {{
    font-size: 0.875rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }}
  .change-pct svg {{ flex-shrink: 0; }}
  .change-val {{
    font-size: 0.75rem;
    margin-top: 2px;
  }}
  .color-up  .change-val {{ color: #ef4444; }}
  .color-down .change-val {{ color: #22c55e; }}
  /* 选股依据 */
  .reason {{
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.5;
  }}
  /* 底部免责声明 */
  .card-footer {{
    padding: 10px 16px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }}
  .disclaimer {{
    font-size: 0.75rem;
    color: #9ca3af;
  }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="card-header">
      <div class="card-title">{title}</div>
      <div class="card-subtitle">{subtitle}</div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th class="th-left">股票名称</th>
            <th class="th-left">代码</th>
            <th class="th-right">现价</th>
            <th class="th-right">涨跌幅</th>
            <th class="th-left">选股依据</th>
          </tr>
        </thead>
        <tbody>{rows_html}
        </tbody>
      </table>
    </div>
    <div class="card-footer">
      <p class="disclaimer">* 以上数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。</p>
    </div>
  </div>
</div>
</body>
</html>'''


def main():
    parser = argparse.ArgumentParser(description="将股票JSON数据转换为 StockPickerTable 风格 HTML 表格")
    parser.add_argument("-i", "--input", default="stock_data.json", help="输入JSON文件路径")
    parser.add_argument("-o", "--output", default="stock_report.html", help="输出HTML文件路径")
    parser.add_argument("--skip-validate", action="store_true", help="跳过数据验证")

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误: 输入文件不存在: {args.input}")
        return False

    try:
        with open(input_path, "r", encoding="utf-8") as f:
            json_data = json.load(f)

        if not args.skip_validate:
            schema_path = input_path.parent / "schema.json"
            if not validate_json_schema(json_data, schema_path):
                print("错误: 数据验证失败")
                return False

        html = generate_stocks_html(json.dumps(json_data, ensure_ascii=False))

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"[OK] HTML 表格已生成: {output_path.absolute()}")
        return True

    except json.JSONDecodeError as e:
        print(f"错误: JSON格式错误 - {e}")
        return False
    except Exception as e:
        print(f"错误: {e}")
        return False


if __name__ == "__main__":
    exit(0 if main() else 1)
