"""
策略名称：RSI + 布林带组合策略
策略逻辑：RSI 超卖（<35）且价格触及布林带下轨时买入；RSI 超买（>65）时卖出
"""
import pandas as pd
import numpy as np

STRATEGY_NAME = "rsi_boll"
DESCRIPTION = "RSI+布林带组合策略（rsi_period={rsi_period}, boll_period={boll_period}）"
PARAMS = {
    "rsi_period": 14,
    "boll_period": 20,
    "oversold": 35,
    "overbought": 65,
}


def run(df: pd.DataFrame, rsi_period=14, boll_period=20, oversold=35, overbought=65, **kwargs) -> pd.DataFrame:
    """
    接收 OHLCV DataFrame，返回带信号列的 DataFrame。

    必须添加：
      signal_enter = 1  → 买入信号（当日收盘后，次日开盘执行）
      signal_exit  = 1  → 卖出信号
    """
    df = df.copy()

    # ── RSI 计算 ────────────────────────────────────────────────────────────
    delta = df["close"].diff()
    gain = delta.clip(lower=0).rolling(rsi_period).mean()
    loss = (-delta.clip(upper=0)).rolling(rsi_period).mean()
    df["ind_rsi"] = 100 - 100 / (1 + gain / (loss + 1e-10))

    # ── 布林带计算 ───────────────────────────────────────────────────────────
    mid = df["close"].rolling(boll_period).mean()
    std = df["close"].rolling(boll_period).std()
    df["ind_boll_upper"] = mid + 2 * std
    df["ind_boll_mid"]   = mid
    df["ind_boll_lower"] = mid - 2 * std

    # ── 信号生成 ─────────────────────────────────────────────────────────────
    # 买入：RSI 超卖 且 价格触及布林带下轨（双重确认）
    df["signal_enter"] = (
        (df["ind_rsi"] < oversold) &
        (df["close"] <= df["ind_boll_lower"])
    ).astype(int)

    # 卖出：RSI 超买 或 价格触及布林带上轨
    df["signal_exit"] = (
        (df["ind_rsi"] > overbought) |
        (df["close"] >= df["ind_boll_upper"])
    ).astype(int)

    return df
