"""
策略名称：双时间框架动量策略 v2
优化要点：
  1. 出场条件从"持续状态 roc_slow < 0"改为"穿越事件"——修复 803 次出场的核心 Bug
  2. 慢线周期从 20 延长至 60，确保捕捉的是中长期趋势
  3. 平滑系数从 3 提高至 5，过滤短期噪声
"""
import pandas as pd
import numpy as np

STRATEGY_NAME = "dual_momentum"
DESCRIPTION = "双时间框架动量 v2（快线ROC{fast_period}日/慢线ROC{slow_period}日）"
PARAMS = {
    "fast_period": 5,
    "slow_period": 60,
    "smooth": 5,
}


def run(df, fast_period=5, slow_period=60, smooth=5, **kwargs):
    df = df.copy()

    roc_fast = df["close"].pct_change(fast_period) * 100
    roc_slow = df["close"].pct_change(slow_period) * 100

    df["ind_roc_fast"] = roc_fast.rolling(smooth).mean()
    df["ind_roc_slow"] = roc_slow.rolling(smooth).mean()

    ff = df["ind_roc_fast"]
    sf = df["ind_roc_slow"]

    fast_cross_up   = (ff > 0) & (ff.shift(1) <= 0)
    fast_cross_down = (ff < 0) & (ff.shift(1) >= 0)
    slow_cross_down = (sf < 0) & (sf.shift(1) >= 0)  # 穿越事件，非持续状态

    # 买入：快线 ROC 上穿零轴 且 慢线 ROC > 0（大趋势向上）
    df["signal_enter"] = (fast_cross_up & (sf > 0)).astype(int)

    # 卖出：快线 ROC 下穿零轴 或 慢线 ROC 穿越负值（均为穿越事件）
    df["signal_exit"] = (fast_cross_down | slow_cross_down).astype(int)

    return df
