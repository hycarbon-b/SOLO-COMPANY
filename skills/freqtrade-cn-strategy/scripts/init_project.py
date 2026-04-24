#!/usr/bin/env python3
"""
Freqtrade中国市场项目初始化脚本
创建完整的项目结构和配置文件
"""
import os
import argparse
from pathlib import Path

def create_project_structure(target_dir: str):
    """创建freqtrade项目目录结构"""
    base = Path(target_dir) / "freqtrade-cn"
    
    # 目录结构
    dirs = [
        "strategies/cta",
        "strategies/ml",
        "strategies/factor",
        "backtest/configs",
        "backtest/results",
        "logs",
        "data",
        "notebooks",
        "user_data/strategies",
        "user_data/data/binance",
        "user_data/backtest_results",
        "user_data/logs",
        "user_data/plot",
        "scripts",
        "config"
    ]
    
    for d in dirs:
        (base / d).mkdir(parents=True, exist_ok=True)
    
    # 创建__init__.py
    for d in ["strategies", "strategies/cta", "strategies/ml", "strategies/factor"]:
        (base / d / "__init__.py").touch()
    
    print(f"项目结构已创建: {base}")
    return base

def create_requirements(base: Path):
    """创建requirements.txt"""
    content = """# freqtrade核心
freqtrade>=2024.1

# 数据源
akshare>=1.12.0
baostock>=0.8.9
tushare>=1.4.0
ccxt>=4.0.0

# 机器学习
scikit-learn>=1.3.0
xgboost>=2.0.0
lightgbm>=4.0.0
tensorflow>=2.15.0
torch>=2.0.0

# 数据处理
pandas>=2.0.0
numpy>=1.24.0
ta-lib>=0.4.28

# 可视化
matplotlib>=3.7.0
seaborn>=0.12.0
plotly>=5.15.0

# 工具
jupyter>=1.0.0
pyyaml>=6.0
requests>=2.31.0
"""
    (base / "requirements.txt").write_text(content, encoding="utf-8")

def create_config(base: Path):
    """创建freqtrade配置文件（v2+ 兼容格式）"""
    config = """
{
    "max_open_trades": 3,
    "stake_currency": "USDT",
    "stake_amount": "unlimited",
    "tradable_balance_ratio": 0.99,
    "fiat_display_currency": "USD",
    "dry_run": true,
    "dry_run_wallet": 100000,
    "cancel_open_orders_on_exit": false,

    "trading_mode": "spot",
    "margin_mode": "",
    "dataformat_ohlcv": "json",

    "fee": 0.001,

    "skip_pair_validation": true,

    "unfilledtimeout": {
        "entry": 10,
        "exit": 30,
        "exit_timeout_count": 0,
        "unit": "minutes"
    },

    "entry_pricing": {
        "price_side": "same",
        "use_order_book": true,
        "order_book_top": 1,
        "price_last_balance": 0.0,
        "check_depth_of_market": {
            "enabled": false,
            "bids_to_ask_delta": 1
        }
    },

    "exit_pricing": {
        "price_side": "same",
        "use_order_book": true,
        "order_book_top": 1
    },

    "exchange": {
        "name": "binance",
        "key": "",
        "secret": "",
        "ccxt_config": {},
        "ccxt_async_config": {
            "aiohttp_proxy": "http://127.0.0.1:7897"
        },
        "pair_whitelist": [],
        "pair_blacklist": []
    },

    "pairlists": [
        {
            "method": "StaticPairList",
            "allow_inactive": true
        }
    ],

    "telegram": {
        "enabled": false,
        "token": "",
        "chat_id": ""
    },

    "api_server": {
        "enabled": false,
        "listen_ip_address": "127.0.0.1",
        "listen_port": 8080,
        "verbosity": "error",
        "jwt_secret_key": "somethingrandom",
        "ws_token": "somethingrandom",
        "CORS_origins": [],
        "username": "freqtrader",
        "password": "freqtrader"
    },

    "bot_name": "freqtrade-cn",
    "initial_state": "running",
    "force_entry_enable": false,
    "internals": {
        "process_throttle_secs": 5
    }
}
"""
    (base / "config" / "config.json").write_text(config, encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(description="初始化freqtrade中国市场项目")
    parser.add_argument("--target", type=str, default=".", help="目标目录")
    args = parser.parse_args()
    
    base = create_project_structure(args.target)
    create_requirements(base)
    create_config(base)
    
    print("\n项目初始化完成！")
    print(f"项目路径: {base}")
    print("\n下一步:")
    print("1. 安装依赖: pip install -r requirements.txt")
    print("2. 下载数据: python scripts/download_data.py --symbol 600519.SH --start 2020-01-01 --output <项目>/data")
    print("3. 转换格式: python scripts/convert_data.py --input <项目>/data --output <项目>/user_data/data")
    print("4. 生成策略: python scripts/generate_strategy.py --type cta --template ma_cross --name MyStrategy --output <项目>")
    print("5. 运行回测: python scripts/run_backtest.py --strategy MyStrategy --output <项目>")

if __name__ == "__main__":
    main()
