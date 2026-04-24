#!/usr/bin/env python3
"""
回测运行脚本 - 使用 freqtrade backtesting (v2+ API)

完整流程（按顺序执行）：
  1. python scripts/init_project.py --target ./myproject
  2. python scripts/download_data.py --symbol 600519.SH --start 2020-01-01 --output ./myproject/freqtrade-cn/data
  3. python scripts/convert_data.py --input ./myproject/freqtrade-cn/data --output ./myproject/freqtrade-cn/user_data/data
  4. python scripts/generate_strategy.py --type cta --name MyCTA --output ./myproject/freqtrade-cn
  5. python scripts/run_backtest.py --strategy MyCTA --output ./myproject/freqtrade-cn --timerange 20200101-20240101
"""
import argparse
import json
import subprocess
from pathlib import Path


def check_prerequisites(project: Path, strategy: str) -> bool:
    """检查回测前提条件，返回是否可以继续"""
    ok = True

    config_path = project / "config" / "config.json"
    if not config_path.exists():
        print(f"[ERROR] 配置文件不存在: {config_path}")
        print(f"  请先运行: python scripts/init_project.py --target {project.parent}")
        ok = False

    strategy_file = project / "user_data" / "strategies" / f"{strategy}.py"
    if not strategy_file.exists():
        print(f"[ERROR] 策略文件不存在: {strategy_file}")
        print(f"  请先运行: python scripts/generate_strategy.py --name {strategy} --output {project}")
        ok = False

    # 检查数据文件
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
        exchange = config.get("exchange", {}).get("name", "binance")
        data_dir = project / "user_data" / "data" / exchange
        json_files = list(data_dir.glob("*.json")) if data_dir.exists() else []
        if not json_files:
            print(f"[ERROR] freqtrade 数据目录为空: {data_dir}")
            print(f"  请先运行:")
            print(f"    python scripts/download_data.py --symbol 600519.SH --start 2020-01-01 --output {project}/data")
            print(f"    python scripts/convert_data.py --input {project}/data --output {project}/user_data/data")
            ok = False
        else:
            print(f"[OK] 找到 {len(json_files)} 个数据文件（exchange: {exchange}）")
    except Exception:
        pass  # config 不存在时已在上面报错

    return ok


def run_backtest(
    strategy: str,
    project_dir: str,
    timerange: str = None,
    export: bool = True,
) -> bool:
    project = Path(project_dir)
    config_path = project / "config" / "config.json"
    user_data_dir = project / "user_data"
    results_dir = project / "backtest" / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    if not check_prerequisites(project, strategy):
        return False

    cmd = [
        "freqtrade", "backtesting",
        "--config", str(config_path),
        "--strategy", strategy,
        "--userdir", str(user_data_dir),
        "--strategy-path", str(user_data_dir / "strategies"),
    ]
    if timerange:
        cmd.extend(["--timerange", timerange])
    if export:
        export_file = str(results_dir / f"{strategy}_backtest.json")
        cmd.extend([
            "--export", "trades",
            "--export-filename", export_file,
        ])

    print(f"\n运行 freqtrade 回测:")
    print(f"  {' '.join(cmd)}\n")

    try:
        result = subprocess.run(cmd, text=True, encoding="utf-8")
        if result.returncode == 0 and export:
            export_file = str(results_dir / f"{strategy}_backtest.json")
            print(f"\n[OK] 回测完成，结果: {export_file}")
            print(f"查看报告: freqtrade backtesting-show --export-filename {export_file}")
        return result.returncode == 0
    except FileNotFoundError:
        print("\n[ERROR] freqtrade 未安装")
        print("  安装命令: pip install freqtrade")
        print("  或完整安装: pip install 'freqtrade[all]'")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="使用 freqtrade backtesting 运行策略回测",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""完整流程示例:
  python scripts/init_project.py --target .
  python scripts/download_data.py --symbol 600519.SH --start 2020-01-01 --output ./freqtrade-cn/data
  python scripts/convert_data.py --input ./freqtrade-cn/data --output ./freqtrade-cn/user_data/data
  python scripts/generate_strategy.py --type ml --template xgboost --name MyXGB --output ./freqtrade-cn
  python scripts/run_backtest.py --strategy MyXGB --output ./freqtrade-cn --timerange 20200101-20240101
""",
    )
    parser.add_argument("--strategy", required=True, help="策略类名（如 XGBoostCNStrategy）")
    parser.add_argument("--output", default="./freqtrade-cn", help="freqtrade 项目根目录")
    parser.add_argument("--timerange", help="回测时间范围，格式 YYYYMMDD-YYYYMMDD（如 20200101-20240101）")
    parser.add_argument("--no-export", action="store_true", help="不导出交易记录到 JSON")
    args = parser.parse_args()

    run_backtest(
        strategy=args.strategy,
        project_dir=args.output,
        timerange=args.timerange,
        export=not args.no_export,
    )


if __name__ == "__main__":
    main()
