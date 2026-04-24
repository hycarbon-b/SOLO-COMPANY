#!/usr/bin/env python3
"""
真实股票数据拉取脚本
按顺序尝试多个数据源：baostock（首选，A股免费）→ akshare → yfinance（港股/美股）

返回标准 DataFrame：date(datetime), open, high, low, close, volume
"""

from __future__ import annotations
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd

logger = logging.getLogger(__name__)

# 沪深300代表性成分股（用于随机选股）
HS300_SYMBOLS = [
    "600519.SH", "000858.SZ", "601318.SH", "000001.SZ", "600036.SH",
    "601166.SH", "601398.SH", "600276.SH", "000333.SZ", "000651.SZ",
    "002415.SZ", "600887.SH", "600031.SH", "601766.SH", "000002.SZ",
    "600048.SH", "002304.SZ", "000568.SZ", "601857.SH", "601088.SH",
    "600028.SH", "600900.SH", "601888.SH", "000538.SZ", "300015.SZ",
    "600585.SH", "000063.SZ", "002475.SZ", "601225.SH", "600030.SH",
]


def get_random_symbols(n: int = 1) -> list[str]:
    import random
    return random.sample(HS300_SYMBOLS, min(n, len(HS300_SYMBOLS)))


# ─── baostock（A股首选，无TLS问题）─────────────────────────────────────────────

def _fetch_baostock(symbol: str, start: str, end: str) -> Optional[pd.DataFrame]:
    """baostock 拉取 A 股日线 OHLCV，前复权"""
    try:
        import baostock as bs
        print(f"  [baostock] 登录...")
        lg = bs.login()
        if lg.error_code != "0":
            print(f"  [baostock] 登录失败: {lg.error_msg}")
            return None

        code, exchange = symbol.upper().split(".")
        bs_code = f"sh.{code}" if exchange == "SH" else f"sz.{code}"
        print(f"  [baostock] 拉取 {bs_code} {start} ~ {end} ...")

        rs = bs.query_history_k_data_plus(
            bs_code,
            "date,open,high,low,close,volume",
            start_date=start,
            end_date=end,
            frequency="d",
            adjustflag="2",  # 前复权
        )
        bs.logout()

        if rs.error_code != "0":
            print(f"  [baostock] 查询失败: {rs.error_msg}")
            return None

        rows = []
        while rs.error_code == "0" and rs.next():
            rows.append(rs.get_row_data())

        if not rows:
            print(f"  [baostock] 无数据返回")
            return None

        df = pd.DataFrame(rows, columns=["date", "open", "high", "low", "close", "volume"])
        df = _clean_ohlcv(df)
        print(f"  [baostock] 成功: {len(df)} 条记录")
        return df

    except ImportError:
        print("  [baostock] 未安装，跳过（pip install baostock）")
        return None
    except Exception as e:
        print(f"  [baostock] 异常: {e}")
        return None


# ─── akshare（A股备选）───────────────────────────────────────────────────────

def _fetch_akshare(symbol: str, start: str, end: str) -> Optional[pd.DataFrame]:
    """akshare 拉取 A 股日线，前复权"""
    try:
        import akshare as ak
        code = symbol.split(".")[0]
        print(f"  [akshare] 拉取 {code} ...")

        df = ak.stock_zh_a_hist(
            symbol=code,
            period="daily",
            start_date=start.replace("-", ""),
            end_date=end.replace("-", ""),
            adjust="qfq",
        )
        if df is None or len(df) == 0:
            return None

        col_map = {
            "日期": "date", "开盘": "open", "收盘": "close",
            "最高": "high", "最低": "low", "成交量": "volume",
        }
        df = df.rename(columns=col_map)
        df = df[["date", "open", "high", "low", "close", "volume"]]
        df = _clean_ohlcv(df)
        print(f"  [akshare] 成功: {len(df)} 条记录")
        return df

    except ImportError:
        print("  [akshare] 未安装，跳过（pip install akshare）")
        return None
    except Exception as e:
        print(f"  [akshare] 异常: {e}")
        return None


# ─── yfinance（港股/美股）────────────────────────────────────────────────────

def _fetch_yfinance(symbol: str, start: str, end: str) -> Optional[pd.DataFrame]:
    """
    yfinance 适用于港股（0700.HK）、美股（AAPL）、ETF（SPY）
    对 A 股代码自动转换：600519.SH → 600519.SS
    """
    try:
        import yfinance as yf

        # 转换 A 股代码到 Yahoo Finance 格式
        yf_symbol = _to_yf_symbol(symbol)
        print(f"  [yfinance] 拉取 {yf_symbol} ...")

        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(start=start, end=end, auto_adjust=True)

        if df is None or len(df) == 0:
            print(f"  [yfinance] 无数据")
            return None

        df = df.reset_index()
        df.columns = [c.lower() for c in df.columns]
        df = df.rename(columns={"stock splits": "splits", "capital gains": "cap_gains"})
        df = df[["date", "open", "high", "low", "close", "volume"]]
        df["date"] = pd.to_datetime(df["date"]).dt.tz_localize(None)
        df = _clean_ohlcv(df)
        print(f"  [yfinance] 成功: {len(df)} 条记录")
        return df

    except ImportError:
        print("  [yfinance] 未安装，跳过（pip install yfinance）")
        return None
    except Exception as e:
        print(f"  [yfinance] 异常: {e}")
        return None


def _to_yf_symbol(symbol: str) -> str:
    """将各种格式的股票代码转换为 Yahoo Finance 格式"""
    s = symbol.upper()
    if s.endswith(".SH"):
        return s.replace(".SH", ".SS")
    if s.endswith(".SZ"):
        return s.replace(".SZ", ".SZ")
    if s.endswith(".HK"):
        code = s.split(".")[0].zfill(4)
        return f"{code}.HK"
    return symbol


def _clean_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    """统一清洗：类型转换、排序、去重、去空"""
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["open", "high", "low", "close"])
    df = df.sort_values("date").drop_duplicates("date").reset_index(drop=True)
    # 过滤异常价格（0或负数）
    df = df[(df["close"] > 0) & (df["open"] > 0)]
    return df


# ─── 主入口 ──────────────────────────────────────────────────────────────────

def fetch_data(
    symbol: str,
    start: str,
    end: str,
    cache_dir: Optional[Path] = None,
) -> pd.DataFrame:
    """
    拉取真实行情数据，自动尝试多个数据源。
    symbol: 600519.SH / 0700.HK / AAPL
    start / end: YYYY-MM-DD
    cache_dir: 可选缓存目录，已有则跳过网络请求
    返回标准 DataFrame: date, open, high, low, close, volume
    """
    # 尝试读取缓存
    if cache_dir:
        cache_dir = Path(cache_dir)
        cache_file = cache_dir / f"{symbol.replace('.', '_')}_{start}_{end}.csv"
        if cache_file.exists():
            print(f"[cache] 使用缓存: {cache_file}")
            df = pd.read_csv(cache_file)
            df["date"] = pd.to_datetime(df["date"])
            return df

    print(f"\n[fetch] 拉取 {symbol} ({start} ~ {end})")

    # 判断市场类型选择数据源顺序
    sym_upper = symbol.upper()
    is_a_share = sym_upper.endswith(".SH") or sym_upper.endswith(".SZ")

    if is_a_share:
        sources = [_fetch_baostock, _fetch_akshare, _fetch_yfinance]
    else:
        sources = [_fetch_yfinance, _fetch_akshare]

    df = None
    for source_fn in sources:
        df = source_fn(symbol, start, end)
        if df is not None and len(df) >= 10:
            break

    if df is None or len(df) == 0:
        raise RuntimeError(
            f"所有数据源均无法获取 {symbol} 的数据。\n"
            "请检查：1) 股票代码格式  2) 网络连接  3) 是否已安装 baostock/akshare/yfinance"
        )

    # 写缓存
    if cache_dir:
        cache_dir.mkdir(parents=True, exist_ok=True)
        df.to_csv(cache_file, index=False)
        print(f"[cache] 已缓存到: {cache_file}")

    return df


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="拉取股票行情数据")
    ap.add_argument("--symbol", default="600519.SH", help="股票代码（如 600519.SH / 0700.HK）")
    ap.add_argument("--start",  default="2020-01-01", help="开始日期 YYYY-MM-DD")
    ap.add_argument("--end",    default=datetime.today().strftime("%Y-%m-%d"), help="结束日期")
    ap.add_argument("--output", default="./data", help="保存 CSV 目录")
    args = ap.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    df = fetch_data(args.symbol, args.start, args.end)
    out = output_dir / f"{args.symbol.replace('.', '_')}_{args.start}_{args.end}.csv"
    df.to_csv(out, index=False)
    print(f"\n已保存 {len(df)} 条记录 → {out}")
    print(df.tail(3).to_string())
