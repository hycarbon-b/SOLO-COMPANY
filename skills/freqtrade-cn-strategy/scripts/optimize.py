#!/usr/bin/env python3
"""
参数优化脚本 - 基于 freqtrade hyperopt
对策略参数进行网格搜索或贝叶斯优化
"""
import argparse
import subprocess
import json
from pathlib import Path
from datetime import datetime, timedelta


def run_hyperopt(
    strategy: str,
    config_path: str,
    data_dir: str,
    output_dir: str,
    epochs: int = 100,
    spaces: str = "buy sell",
    loss_func: str = "SharpeHyperOptLoss",
    timerange: str = None,
) -> bool:
    """使用 freqtrade hyperopt 进行参数优化"""

    cmd = [
        "freqtrade", "hyperopt",
        "--config", config_path,
        "--strategy", strategy,
        "--datadir", data_dir,
        "--hyperopt-loss", loss_func,
        "--epochs", str(epochs),
        "--spaces", *spaces.split(),
        "--export-filename", str(Path(output_dir) / f"{strategy}_hyperopt.json"),
    ]

    if timerange:
        cmd.extend(["--timerange", timerange])

    print(f"运行 hyperopt: {' '.join(cmd)}")
    print(f"策略: {strategy}, 迭代次数: {epochs}, 损失函数: {loss_func}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        print(result.stdout)
        if result.stderr:
            print(f"stderr: {result.stderr}")
        return result.returncode == 0
    except FileNotFoundError:
        print("freqtrade 未安装，请先运行: pip install freqtrade")
        return False


def simple_grid_search(
    strategy_file: str,
    data_file: str,
    output_dir: str,
    param_grid: dict,
) -> dict:
    """
    简单网格搜索（不依赖 freqtrade hyperopt）
    适用于 CTA 策略的参数扫描
    """
    import itertools
    import pandas as pd

    print(f"简单网格搜索 - 策略: {strategy_file}")
    print(f"参数空间: {param_grid}")

    try:
        df = pd.read_csv(data_file)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
    except Exception as e:
        print(f"数据加载失败: {e}")
        return {}

    if "close" not in df.columns:
        print("数据缺少 close 列")
        return {}

    # 生成参数组合
    keys = list(param_grid.keys())
    values = list(param_grid.values())
    combinations = list(itertools.product(*values))

    results = []
    best_sharpe = float("-inf")
    best_params = {}

    for combo in combinations:
        params = dict(zip(keys, combo))

        # 简单 MA 交叉回测
        if "fast_period" in params and "slow_period" in params:
            fast = params["fast_period"]
            slow = params["slow_period"]

            if fast >= slow:
                continue

            df["fast_ma"] = df["close"].rolling(fast).mean()
            df["slow_ma"] = df["close"].rolling(slow).mean()
            df["signal"] = (df["fast_ma"] > df["slow_ma"]).astype(int)
            df["signal_prev"] = df["signal"].shift(1)
            df["position"] = 0

            # 信号变化时交易
            df.loc[(df["signal"] == 1) & (df["signal_prev"] == 0), "position"] = 1
            df.loc[(df["signal"] == 0) & (df["signal_prev"] == 1), "position"] = -1

            # 持仓收益
            df["returns"] = df["close"].pct_change()
            df["strategy_returns"] = df["returns"] * df["signal"].shift(1)

            # 指标计算
            annual_ret = df["strategy_returns"].mean() * 252
            annual_vol = df["strategy_returns"].std() * (252 ** 0.5)
            sharpe = annual_ret / annual_vol if annual_vol > 0 else 0
            total_ret = (1 + df["strategy_returns"].fillna(0)).prod() - 1

            results.append({
                **params,
                "sharpe": round(sharpe, 4),
                "total_return": round(total_ret * 100, 2),
                "annual_return": round(annual_ret * 100, 2),
                "annual_vol": round(annual_vol * 100, 2),
            })

            if sharpe > best_sharpe:
                best_sharpe = sharpe
                best_params = params.copy()
                best_params["sharpe"] = sharpe
                best_params["total_return"] = total_ret

    if not results:
        print("无有效参数组合")
        return {}

    # 按夏普比率排序
    results_df = pd.DataFrame(results).sort_values("sharpe", ascending=False)
    print(f"\n前 10 参数组合:")
    print(results_df.head(10).to_string(index=False))
    print(f"\n最优参数: {best_params}")

    # 保存结果
    output_path = Path(output_dir) / "backtest" / "results"
    output_path.mkdir(parents=True, exist_ok=True)
    result_file = output_path / f"grid_search_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    results_df.to_csv(result_file, index=False)
    print(f"\n结果已保存: {result_file}")

    return best_params


def main() -> None:
    parser = argparse.ArgumentParser(description="freqtrade 策略参数优化")
    parser.add_argument("--strategy", required=True, help="策略名称")
    parser.add_argument("--output", default="./freqtrade-cn", help="项目目录")
    parser.add_argument("--data", type=str, help="数据文件路径（简单模式）")
    parser.add_argument(
        "--mode", choices=["hyperopt", "grid"], default="hyperopt",
        help="优化模式: hyperopt（需要 freqtrade）或 grid（简单网格搜索）",
    )
    # hyperopt 参数
    parser.add_argument("--epochs", type=int, default=100, help="hyperopt 迭代次数")
    parser.add_argument(
        "--spaces", default="buy sell",
        help="优化空间: buy sell roi stoploss trailing",
    )
    parser.add_argument(
        "--loss", default="SharpeHyperOptLoss",
        choices=[
            "SharpeHyperOptLoss", "WinDrawLoss", "OnlyProfitHyperOptLoss",
            "SortinoHyperOptLoss", "MaxDrawDownHyperOptLoss",
        ],
        help="损失函数",
    )
    parser.add_argument("--timerange", type=str, help="时间范围（如 20200101-20231231）")
    # 网格搜索参数
    parser.add_argument("--fast-min", type=int, default=3, help="快线最小周期")
    parser.add_argument("--fast-max", type=int, default=15, help="快线最大周期")
    parser.add_argument("--slow-min", type=int, default=15, help="慢线最小周期")
    parser.add_argument("--slow-max", type=int, default=60, help="慢线最大周期")

    args = parser.parse_args()

    output = Path(args.output)
    config = str(output / "config" / "config.json")
    data_dir = str(output / "data")

    if args.mode == "hyperopt":
        success = run_hyperopt(
            strategy=args.strategy,
            config_path=config,
            data_dir=data_dir,
            output_dir=str(output),
            epochs=args.epochs,
            spaces=args.spaces,
            loss_func=args.loss,
            timerange=args.timerange,
        )
        if not success:
            print("\n提示: 可使用 --mode grid 运行简单网格搜索（无需 freqtrade）")
    else:
        # 简单网格搜索
        data_file = args.data
        if not data_file:
            # 查找第一个可用的数据文件
            data_path = output / "data"
            csv_files = list(data_path.glob("*.csv")) if data_path.exists() else []
            if csv_files:
                data_file = str(csv_files[0])
                print(f"自动使用数据文件: {data_file}")
            else:
                print("请通过 --data 指定数据文件")
                return

        param_grid = {
            "fast_period": list(range(args.fast_min, args.fast_max + 1, 2)),
            "slow_period": list(range(args.slow_min, args.slow_max + 1, 5)),
        }

        best = simple_grid_search(
            strategy_file=args.strategy,
            data_file=data_file,
            output_dir=str(output),
            param_grid=param_grid,
        )

        if best:
            print(f"\n建议参数配置:")
            print(f"  fast_period = {best.get('fast_period', 'N/A')}")
            print(f"  slow_period = {best.get('slow_period', 'N/A')}")
            print(f"  夏普比率 = {best.get('sharpe', 'N/A'):.4f}")


if __name__ == "__main__":
    main()
