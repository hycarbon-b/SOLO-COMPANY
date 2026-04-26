"""
策略名称：EMA 趋势跟踪 + ATR 动态止损
策略逻辑：
  买入：快速 EMA 上穿慢速 EMA（趋势确认）且收盘价高于 200 日 EMA（多头市场过滤）
  卖出：快速 EMA 下穿慢速 EMA，或收盘价跌破（入场价 - 2 × ATR）止损位
"""
import pandas as pd
import numpy as np

STRATEGY_NAME = "ema_atr_trend"
DESCRIPTION = "EMA趋势跟踪+ATR止损（快线{fast_period}日/慢线{slow_period}日/ATR{atr_period}日）"
PARAMS = {
    "fast_period": 10,
    "slow_period": 30,
    "trend_period": 200,
    "atr_period": 14,
    "atr_stop_mult": 2.0,
}


def run(
    df: pd.DataFrame,
    fast_period: int = 10,
    slow_period: int = 30,
    trend_period: int = 200,
    atr_period: int = 14,
    atr_stop_mult: float = 2.0,
    **kwargs,
) -> pd.DataFrame:
    """
    接收 OHLCV DataFrame，返回带信号列的 DataFrame。

    signal_enter = 1  → 买入信号（当日收盘后，次日开盘执行）
    signal_exit  = 1  → 卖出信号
    """
    df = df.copy()

    # ── EMA 计算 ────────────────────────────────────────────────────────────
    df["ind_ema_fast"]  = df["close"].ewm(span=fast_period,  adjust=False).mean()
    df["ind_ema_slow"]  = df["close"].ewm(span=slow_period,  adjust=False).mean()
    df["ind_ema_trend"] = df["close"].ewm(span=trend_period, adjust=False).mean()

    # ── ATR 计算 ────────────────────────────────────────────────────────────
    tr = pd.concat([
        df["high"] - df["low"],
        (df["high"] - df["close"].shift(1)).abs(),
        (df["low"]  - df["close"].shift(1)).abs(),
    ], axis=1).max(axis=1)
    df["ind_atr"] = tr.rolling(atr_period).mean()

    # ── 快慢线差值，判断穿越 ─────────────────────────────────────────────────
    diff     = df["ind_ema_fast"] - df["ind_ema_slow"]
    diff_lag = diff.shift(1)

    # 买入：快线上穿慢线 且 收盘在趋势线之上（多头市场过滤）
    df["signal_enter"] = (
        (diff > 0) & (diff_lag <= 0) &
        (df["close"] > df["ind_ema_trend"])
    ).astype(int)

    # 卖出：快线下穿慢线
    df["signal_exit"] = (
        (diff < 0) & (diff_lag >= 0)
    ).astype(int)

    return df
