#!/usr/bin/env python3
"""
量化策略回测一键运行脚本

完整闭环流程：
  1. 拉取真实行情数据（baostock / akshare / yfinance 自动选择）
  2. 加载策略文件并计算信号（通过 --strategy-file 指定 .py 文件）
  3. 向量化回测（含手续费、滑点、止损）
  4. 生成自包含 HTML 报告（净值曲线、月度热力图、交易明细）

用法：
  python run_pipeline.py --symbol 600519.SH --strategy-file strategies/my_strategy.py --output ./reports

  python run_pipeline.py --symbol 0700.HK --strategy-file strategies/rsi_boll.py --start 2021-01-01 --output /tmp

  python run_pipeline.py --random 2 --strategy-file strategies/ema_atr_trend.py --output ./reports
"""

from __future__ import annotations
import sys
import argparse
from pathlib import Path
from datetime import datetime

# 确保脚本目录在 sys.path（支持从任何目录调用）
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from fetch_data import fetch_data, get_random_symbols
from strategies import (
    STRATEGIES, STRATEGY_DEFAULT_PARAMS, get_strategy, get_strategy_label,
    load_strategy_file,
)
from backtest_engine import run_backtest
from report_generator import generate_report


def parse_args():
    ap = argparse.ArgumentParser(
        description="股票量化策略回测报告生成器",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s --symbol 600519.SH --strategy-file strategies/my_strategy.py --output ./reports
  %(prog)s --symbol 0700.HK --strategy-file strategies/rsi_boll.py --start 2021-01-01 --end 2024-12-31
  %(prog)s --random 2 --strategy-file strategies/ema_atr_trend.py --output /tmp/reports
        """
    )

    # 标的
    grp = ap.add_mutually_exclusive_group()
    grp.add_argument("--symbol",  nargs="+", help="股票代码，支持多个（600519.SH / 0700.HK / AAPL）")
    grp.add_argument("--random",  type=int,  metavar="N", help="从沪深300随机抽 N 只股票")

    # 时间范围
    ap.add_argument("--start", default="2020-01-01", help="开始日期 YYYY-MM-DD（默认 2020-01-01）")
    ap.add_argument("--end",   default=datetime.today().strftime("%Y-%m-%d"), help="结束日期（默认今天）")

    # 策略
    ap.add_argument("--strategy-file", required=True, metavar="FILE",
                    help="策略 Python 文件路径（详见 SKILL.md '自定义策略' 节）")
    ap.add_argument("--params",    type=str, default=None,
                    help='覆盖策略默认参数，JSON 格式，如 \'{"fast_period":5}\'')

    # 回测参数
    ap.add_argument("--capital",    type=float, default=100_000.0, help="初始资金（默认 100000）")
    ap.add_argument("--commission", type=float, default=0.001,     help="单边手续费（默认 0.001）")
    ap.add_argument("--stoploss",   type=float, default=-0.08,     help="止损比例（默认 -0.08）")
    ap.add_argument("--slippage",   type=float, default=0.001,     help="滑点（默认 0.001）")

    # 输出
    ap.add_argument("--output", default="./reports",
                    help="HTML 报告输出目录（默认 ./reports）")
    ap.add_argument("--cache",  default=None,
                    help="数据缓存目录（可选，跳过重复下载）")
    ap.add_argument("--open",   action="store_true",
                    help="生成后自动在浏览器打开报告")

    return ap.parse_args()


def run_single(
    symbol: str,
    start: str,
    end: str,
    strategy_name: str,
    params: dict,
    capital: float,
    commission: float,
    stoploss: float,
    slippage: float,
    output_dir: Path,
    cache_dir: Path | None,
) -> Path:
    """对单个标的完整执行拉数据 → 策略 → 回测 → 报告，返回 HTML 路径"""

    print(f"\n{'='*60}")
    print(f"标的: {symbol}  策略: {strategy_name}  {start} ~ {end}")
    print(f"{'='*60}")

    # 1. 拉数据
    df = fetch_data(symbol, start, end, cache_dir=cache_dir)

    if len(df) < 30:
        raise RuntimeError(f"{symbol} 有效数据不足 30 条（实际 {len(df)} 条），请扩大时间范围")

    # 2. 策略信号
    strategy_fn = get_strategy(strategy_name)
    merged_params = {**STRATEGY_DEFAULT_PARAMS.get(strategy_name, {}), **params}
    df = strategy_fn(df, **merged_params)

    strategy_label = get_strategy_label(strategy_name, merged_params)
    print(f"\n[strategy] {strategy_label}")
    enter_cnt = int(df["signal_enter"].sum())
    exit_cnt  = int(df["signal_exit"].sum())
    print(f"[strategy] 买入信号 {enter_cnt} 次 / 卖出信号 {exit_cnt} 次")

    # 3. 回测
    print("\n[backtest] 开始回测...")
    result = run_backtest(
        df,
        initial_capital=capital,
        commission=commission,
        stoploss=stoploss,
        slippage=slippage,
    )

    m = result.metrics
    print(f"[backtest] 总收益: {m['total_return']*100:+.2f}%  "
          f"买入持有: {m['bh_return']*100:+.2f}%  "
          f"超额: {(m['total_return']-m['bh_return'])*100:+.2f}%")
    print(f"[backtest] 最大回撤: {m['max_drawdown']*100:.2f}%  "
          f"夏普: {m['sharpe_ratio']:.2f}  "
          f"交易数: {m['n_trades']}  胜率: {m['win_rate']*100:.1f}%")

    # 4. 生成报告
    safe_sym = symbol.replace(".", "_").replace("/", "_")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = output_dir / f"report_{safe_sym}_{strategy_name}_{ts}.html"

    generate_report(
        result=result,
        symbol=symbol,
        strategy_name=strategy_name,
        strategy_label=strategy_label,
        strategy_params=merged_params,
        output_path=out_file,
        commission=commission,
        stoploss=stoploss,
    )

    return out_file


def main():
    args = parse_args()

    # 加载策略文件
    try:
        strategy_name, _, _, _ = load_strategy_file(args.strategy_file)
    except (FileNotFoundError, ValueError, ImportError) as e:
        print(f"[error] 加载策略文件失败: {e}")
        sys.exit(1)
    print(f"[strategy] 已加载: {strategy_name}  来源: {args.strategy_file}")

    # 解析自定义参数
    if args.params:
        import json as _json
        try:
            custom_params = _json.loads(args.params)
        except ValueError as e:
            print(f"[error] --params 解析失败: {e}")
            sys.exit(1)
    else:
        custom_params = {}

    # 确定标的列表
    if args.random:
        symbols = get_random_symbols(args.random)
        print(f"[random] 随机选股 {args.random} 只: {', '.join(symbols)}")
    elif args.symbol:
        symbols = args.symbol
    else:
        # 默认茅台
        symbols = ["600519.SH"]
        print("[default] 未指定标的，使用默认: 600519.SH")

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    cache_dir = Path(args.cache) if args.cache else None

    generated: list[Path] = []
    errors: list[tuple[str, str]] = []

    for symbol in symbols:
        try:
            html_path = run_single(
                symbol=symbol,
                start=args.start,
                end=args.end,
                strategy_name=strategy_name,
                params=custom_params,
                capital=args.capital,
                commission=args.commission,
                stoploss=args.stoploss,
                slippage=args.slippage,
                output_dir=output_dir,
                cache_dir=cache_dir,
            )
            generated.append(html_path)
        except Exception as e:
            print(f"\n[error] {symbol} 处理失败: {e}")
            errors.append((symbol, str(e)))

    # 汇总
    print(f"\n{'='*60}")
    print(f"完成！共生成 {len(generated)} 份报告：")
    for p in generated:
        print(f"  📄 {p}")
    if errors:
        print(f"\n失败 {len(errors)} 个：")
        for sym, err in errors:
            print(f"  ✗ {sym}: {err}")
    print(f"{'='*60}\n")

    # 自动打开
    if args.open and generated:
        import webbrowser
        for p in generated:
            webbrowser.open(p.as_uri())

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
