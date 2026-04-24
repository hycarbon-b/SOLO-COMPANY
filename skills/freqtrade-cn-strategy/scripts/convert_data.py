#!/usr/bin/env python3
"""
数据格式转换：CSV → freqtrade JSON

将 akshare / baostock 下载的 CSV 转换为 freqtrade backtesting 所需格式。
freqtrade 数据格式：[[timestamp_ms, open, high, low, close, volume], ...]
文件路径：<datadir>/<exchange>/<BASE>_<QUOTE>_<timeframe>.json

A 股示例：
  600519.SH CSV → user_data/data/binance/600519_CNY_1d.json
  对应 pair：600519/CNY
"""
import argparse
import json
from pathlib import Path


def csv_to_freqtrade_json(
    csv_file: Path,
    output_dir: Path,
    exchange: str = "binance",
    quote: str = "CNY",
    timeframe: str = "1d",
) -> tuple[Path, str]:
    """
    转换单个 CSV 文件为 freqtrade JSON 格式。
    返回 (输出文件路径, pair名称)
    """
    import pandas as pd

    df = pd.read_csv(csv_file)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # 确保有必要列；akshare CSV 已由 download_data.py 重命名为标准列名
    required = ["date", "open", "high", "low", "close", "volume"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"CSV 缺少必要列: {missing}（实际列: {list(df.columns)}）\n"
            "请用 download_data.py 下载数据，它会自动重命名列。"
        )

    # 转换为 freqtrade OHLCV 格式: [timestamp_ms, open, high, low, close, volume]
    records = []
    for _, row in df.iterrows():
        ts_ms = int(row["date"].timestamp() * 1000)
        records.append([
            ts_ms,
            float(row["open"]),
            float(row["high"]),
            float(row["low"]),
            float(row["close"]),
            float(row["volume"]),
        ])

    # 从文件名提取股票代码（格式: 600519_SH_akshare.csv）
    stem = csv_file.stem
    code = stem.split("_")[0]
    pair_name = f"{code}_{quote}"      # e.g. 600519_CNY
    pair = f"{code}/{quote}"           # e.g. 600519/CNY
    filename = f"{pair_name}-{timeframe}.json"  # freqtrade 命名惯例：BASE_QUOTE-timeframe

    out_path = output_dir / exchange / filename
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records), encoding="utf-8")

    print(f"[OK] {csv_file.name} → {out_path}")
    print(f"     记录数: {len(records)}")
    if len(df) > 0:
        print(f"     时间范围: {df['date'].iloc[0].date()} ~ {df['date'].iloc[-1].date()}")
    print(f"     Pair: {pair}")

    return out_path, pair


def update_config_pairs(config_path: Path, pairs: list[str]) -> None:
    """将转换后的 pair 列表写入 config.json 的 exchange.pair_whitelist"""
    if not config_path.exists():
        return
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
        if "exchange" not in config:
            config["exchange"] = {}
        config["exchange"]["pair_whitelist"] = pairs
        config_path.write_text(
            json.dumps(config, indent=4, ensure_ascii=False), encoding="utf-8"
        )
        print(f"\n已自动更新 {config_path} 中的 pair_whitelist: {pairs}")
    except Exception as e:
        print(f"更新 config.json 失败（可手动编辑）: {e}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="将 akshare/baostock CSV 转换为 freqtrade JSON 格式",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例:
  # 转换单个文件
  python scripts/convert_data.py --input ./data/600519_SH_akshare.csv --output ./freqtrade-cn/user_data/data

  # 转换整个目录
  python scripts/convert_data.py --input ./data/ --output ./freqtrade-cn/user_data/data

  # 指定 exchange 和计价货币（要与 config.json 中 exchange.name 一致）
  python scripts/convert_data.py --input ./data/ --output ./freqtrade-cn/user_data/data --exchange binance --quote CNY
""",
    )
    parser.add_argument("--input", required=True, help="输入 CSV 文件路径，或包含多个 CSV 的目录")
    parser.add_argument(
        "--output", default="./freqtrade-cn/user_data/data",
        help="freqtrade 数据根目录（默认 ./freqtrade-cn/user_data/data）",
    )
    parser.add_argument(
        "--exchange", default="binance",
        help="交易所名称，必须与 config.json 中 exchange.name 一致（默认 binance）",
    )
    parser.add_argument("--quote", default="CNY", help="计价货币（默认 CNY）")
    parser.add_argument("--timeframe", default="1d", help="时间周期（默认 1d）")
    parser.add_argument(
        "--config", default=None,
        help="config.json 路径，指定后自动更新 pair_whitelist（可选）",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if input_path.is_dir():
        csv_files = sorted(input_path.glob("*.csv"))
        if not csv_files:
            print(f"错误: {input_path} 目录中没有 CSV 文件")
            return
        print(f"找到 {len(csv_files)} 个 CSV 文件\n")
    elif input_path.suffix.lower() == ".csv":
        csv_files = [input_path]
    else:
        print(f"错误: 不支持的输入格式 {args.input}（需要 .csv 文件或目录）")
        return

    pairs = []
    errors = []

    for csv_file in csv_files:
        try:
            _, pair = csv_to_freqtrade_json(
                csv_file=csv_file,
                output_dir=output_path,
                exchange=args.exchange,
                quote=args.quote,
                timeframe=args.timeframe,
            )
            pairs.append(pair)
            print()
        except Exception as e:
            errors.append((csv_file.name, str(e)))
            print(f"[FAIL] {csv_file.name}: {e}\n")

    print("=" * 60)
    print(f"转换完成: {len(pairs)} 成功 / {len(errors)} 失败")

    if pairs:
        print(f"\n在 config.json 的 exchange 节点中配置以下 pair_whitelist：")
        print(f'  "pair_whitelist": {json.dumps(pairs)}')

        if args.config:
            update_config_pairs(Path(args.config), pairs)
        else:
            # 尝试自动发现 config.json
            guessed = output_path.parent.parent / "config" / "config.json"
            if guessed.exists():
                update_config_pairs(guessed, pairs)
                print(f"（已自动检测并更新: {guessed}）")

    if errors:
        print(f"\n失败列表:")
        for fname, err in errors:
            print(f"  {fname}: {err}")


if __name__ == "__main__":
    main()
