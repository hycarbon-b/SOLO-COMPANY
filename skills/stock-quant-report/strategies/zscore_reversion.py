"""
策略名称：Z-Score 均值回归策略 v2
优化要点：
  1. 去掉过零穿越出场（cross_zero_down）——该信号过于频繁（295次！）
  2. 出场改为：Z 从极低区回升至 z_exit（获利离场），或 Z > +z_sell（高位卖出）
  3. 加入 100 日均线趋势过滤（只在多头市场执行均值回归）
  4. z_buy 收紧至 2.0，只抄真正极端低估的机会
"""
import pandas as pd
import numpy as np

STRATEGY_NAME = "zscore_reversion"
DESCRIPTION = "Z-Score均值回归 v2（窗口{window}日，买入Z<-{z_buy}/离场回升至{z_exit}）"
PARAMS = {
    "window": 30,
    "trend_period": 100,
    "z_buy": 2.0,
    "z_sell": 2.0,
    "z_exit": -0.5,
}


def run(df, window=30, trend_period=100, z_buy=2.0, z_sell=2.0, z_exit=-0.5, **kwargs):
    df = df.copy()

    roll_mean = df["close"].rolling(window).mean()
    roll_std  = df["close"].rolling(window).std()
    df["ind_trend_ma"]  = df["close"].rolling(trend_period).mean()
    df["ind_zscore"]    = (df["close"] - roll_mean) / (roll_std + 1e-10)
    df["ind_roll_mean"] = roll_mean

    z = df["ind_zscore"]

    # 买入：Z 从 -z_buy 以下向上穿越（穿越事件）且处于趋势均线上方
    df["signal_enter"] = (
        (z > -z_buy) & (z.shift(1) <= -z_buy) &
        (df["close"] > df["ind_trend_ma"])
    ).astype(int)

    # 卖出：Z 回升至 z_exit（穿越事件，获利离场）或 Z 超过 +z_sell（穿越事件）
    exit_recover = (z > z_exit) & (z.shift(1) <= z_exit)
    exit_overbuy = (z > z_sell) & (z.shift(1) <= z_sell)
    df["signal_exit"] = (exit_recover | exit_overbuy).astype(int)

    return df
