"""
策略名称：KDJ 随机指标策略
策略逻辑：
  买入：%K 从下方穿越 %D（金叉）且 %J < 20（超卖确认）
  卖出：%K 从上方穿越 %D（死叉）且 %J > 80（超买确认）
"""
import pandas as pd
import numpy as np

STRATEGY_NAME = "kdj"
DESCRIPTION = "KDJ随机指标（RSV周期{rsv_period}日，超卖{oversold}/超买{overbought}）"
PARAMS = {
    "rsv_period": 9,
    "k_smooth": 3,
    "d_smooth": 3,
    "oversold": 20,
    "overbought": 80,
}


def run(
    df: pd.DataFrame,
    rsv_period: int = 9,
    k_smooth: int = 3,
    d_smooth: int = 3,
    oversold: int = 20,
    overbought: int = 80,
    **kwargs,
) -> pd.DataFrame:
    """
    接收 OHLCV DataFrame，返回带信号列的 DataFrame。

    signal_enter = 1  → 买入信号（当日收盘后，次日开盘执行）
    signal_exit  = 1  → 卖出信号
    """
    df = df.copy()

    # ── RSV（Raw Stochastic Value）────────────────────────────────────────────
    low_min  = df["low"].rolling(rsv_period).min()
    high_max = df["high"].rolling(rsv_period).max()
    rsv = (df["close"] - low_min) / (high_max - low_min + 1e-10) * 100

    # ── K、D、J 计算（指数平滑）───────────────────────────────────────────────
    # K = EMA(RSV, k_smooth)；D = EMA(K, d_smooth)；J = 3K - 2D
    df["ind_k"] = rsv.ewm(alpha=1 / k_smooth, adjust=False).mean()
    df["ind_d"] = df["ind_k"].ewm(alpha=1 / d_smooth, adjust=False).mean()
    df["ind_j"] = 3 * df["ind_k"] - 2 * df["ind_d"]

    # ── 信号生成 ─────────────────────────────────────────────────────────────
    kd_cross_up   = (df["ind_k"] > df["ind_d"]) & (df["ind_k"].shift(1) <= df["ind_d"].shift(1))
    kd_cross_down = (df["ind_k"] < df["ind_d"]) & (df["ind_k"].shift(1) >= df["ind_d"].shift(1))

    # 买入：K 上穿 D 且 J 处于超卖区（< oversold）
    df["signal_enter"] = (kd_cross_up & (df["ind_j"] < oversold)).astype(int)

    # 卖出：K 下穿 D 且 J 处于超买区（> overbought）
    df["signal_exit"]  = (kd_cross_down & (df["ind_j"] > overbought)).astype(int)

    return df
