"""
Stock Card Generator - 股票卡片 HTML 生成器

将股票 JSON 数据转换为 TradingView 风格的 HTML 卡片展示。

Usage:
    python card_script.py -i stock_data.json -o stock_report.html
"""

import json
import argparse
import sys
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import List, Union

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import jsonschema
    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False


@dataclass
class StatItem:
    label: str
    value: str


@dataclass
class Stock:
    name: str
    code: str
    price: str
    changeVal: str
    changePct: str
    trend: str
    tag: str
    stats: List[StatItem]


@dataclass
class Stocks:
    stocks: List[Stock] = field(default_factory=list)


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
    if isinstance(stocks_data, Stocks):
        stocks_list = [
            {**asdict(stock), "stats": [asdict(stat) for stat in stock.stats]}
            for stock in stocks_data.stocks
        ]
    else:
        data = json.loads(stocks_data)
        stocks_list = data["stocks"]
    
    cards_html = ""
    for stock in stocks_list:
        stats_html = ""
        for stat in stock["stats"]:
            stats_html += f'''
                <div class="stat-item">
                    <span class="label">{stat["label"]}</span>
                    <span class="value">{stat["value"]}</span>
                </div>'''
        
        cards_html += f'''
        <div class="tv-card-container">
            <div class="tv-header">
                <div class="symbol-section">
                    <span class="symbol">{stock["name"]}</span>
                    <span class="exchange">{stock["code"]}</span>
                </div>
                <div class="sector-tag">{stock["tag"]}</div>
            </div>
            <div class="tv-price-row">
                <span class="current-price">{stock["price"]}</span>
                <div class="change-wrapper {stock["trend"]}">
                    <span>{stock["changeVal"]}</span>
                    <span>({stock["changePct"]}%)</span>
                </div>
            </div>
            <hr class="tv-divider" />
            <div class="tv-stats-grid">{stats_html}
            </div>
        </div>'''
    
    return f'''
    <style>
        :root {{
            --bg-color: #ffffff;
            --text-main: #131722;
            --text-sub: #707584;
            --bull-color: #f23645;
            --bear-color: #089981;
            --border-color: #f0f3fa;
        }}
        .stocks-container {{
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            max-width: 1200px;
        }}
        .tv-card-container {{
            font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
            width: 180px;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
            color: var(--text-main);
        }}
        .tv-card-container:hover {{ transform: translateY(-3px); transition: transform 0.2s; }}
        .tv-header {{ display: flex; justify-content: space-between; margin-bottom: 4px; }}
        .symbol-section {{ display: flex; align-items: center; gap: 3px; }}
        .symbol {{ font-size: 14px; font-weight: 700; }}
        .exchange {{ font-size: 10px; color: var(--text-sub); }}
        .sector-tag {{ font-size: 10px; background: var(--border-color); padding: 1px 6px; border-radius: 3px; color: var(--text-sub); }}
        .tv-price-row {{ display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }}
        .current-price {{ font-size: 20px; font-weight: 600; }}
        .change-wrapper {{ font-size: 12px; font-weight: 500; display: flex; gap: 2px; }}
        .change-wrapper.bull {{ color: var(--bull-color); }}
        .change-wrapper.bear {{ color: var(--bear-color); }}
        .tv-divider {{ border: 0; border-top: 1px solid var(--border-color); margin: 6px 0; }}
        .tv-stats-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
        .stat-item {{ display: flex; flex-direction: column; }}
        .stat-item .label {{ font-size: 10px; color: var(--text-sub); margin-bottom: 1px; }}
        .stat-item .value {{ font-size: 11px; font-weight: 500; }}
    </style>
    <div class="stocks-container">{cards_html}
    </div>'''


def main():
    parser = argparse.ArgumentParser(description="将股票JSON数据转换为HTML卡片")
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
        
        print(f"[OK] HTML卡片已生成: {output_path.absolute()}")
        return True
        
    except json.JSONDecodeError as e:
        print(f"错误: JSON格式错误 - {e}")
        return False
    except Exception as e:
        print(f"错误: {e}")
        return False


if __name__ == "__main__":
    exit(0 if main() else 1)
