"""
策略名称：量价背离策略 v2
优化要点：
  1. 信号由"持续状态"改为"穿越事件"（只在条件首次成立时触发）
  2. 加入 MA60 趋势过滤（价格在均线上方才买入，避免接刺下跌趋势）
  3. 提高认定阈值至 8%，减少噪声信号
"""
import pandas as pd
import numpy as np

STRATEGY_NAME = "vol_price_divergence"
DESCRIPTION = "量价背离 v2（价格周期{price_period}日/成交量均线{vol_period}日）"
PARAMS = {
    "price_period": 10,
    "vol_period": 20,
    "trend_period": 60,
    "price_threshold": 0.08,
    "vol_ratio": 0.80,
}


def run(df, price_period=10, vol_period=20, trend_period=60,
        price_threshold=0.08, vol_ratio=0.80, **kwargs):
    df = df.copy()

    price_chg = df["close"].pct_change(price_period)
    df["ind_vol_ma"]    = df["volume"].rolling(vol_period).mean()
    df["ind_trend_ma"]  = df["close"].rolling(trend_period).mean()
    vol_weak = df["volume"] < df["ind_vol_ma"] * vol_ratio
    df["ind_price_chg"] = price_chg

    # 底背离条件：大跌+量缩+在趋势均线上方
    cond_buy  = (price_chg < -price_threshold) & vol_weak & (df["close"] > df["ind_trend_ma"])
    # 顶背离条件：大涨+量缩
    cond_sell = (price_chg > price_threshold) & vol_weak

    # 穿越事件：只在条件首次成立当日触发（前一日不成立）
    df["signal_enter"] = (cond_buy  & ~cond_buy.shift(1).fillna(False)).astype(int)
    df["signal_exit"]  = (cond_sell & ~cond_sell.shift(1).fillna(False)).astype(int)

    return df
