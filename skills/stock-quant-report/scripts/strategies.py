#!/usr/bin/env python3
"""
量化策略库 - 纯 pandas/numpy 实现，无需 ta-lib

每个策略函数接收 OHLCV DataFrame，返回添加了信号列的 DataFrame：
  signal_enter = 1  → 买入信号（当日收盘后，次日开盘执行）
  signal_exit  = 1  → 卖出信号

支持策略：
  ma_cross    双均线交叉
  rsi         RSI超买超卖
  breakout    唐奇安通道突破
  macd        MACD柱状线穿越零轴
  boll        布林带反转
  momentum    价格动量
"""

from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Any


# ─── 技术指标计算（纯pandas实现）────────────────────────────────────────────────

def _sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(period).mean()


def _ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / (loss + 1e-10)
    return 100 - 100 / (1 + rs)


def _atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    tr = pd.concat([
        high - low,
        (high - close.shift(1)).abs(),
        (low - close.shift(1)).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()


def _macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = _ema(series, fast)
    ema_slow = _ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = _ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def _bollinger(series: pd.Series, period: int = 20, std: float = 2.0):
    mid = _sma(series, period)
    band = series.rolling(period).std()
    upper = mid + std * band
    lower = mid - std * band
    return upper, mid, lower


# ─── 策略实现 ───────────────────────────────────────────────────────────────

def strategy_ma_cross(
    df: pd.DataFrame,
    fast_period: int = 5,
    slow_period: int = 20,
    **kwargs,
) -> pd.DataFrame:
    """
    双均线交叉策略
    买入：快线上穿慢线
    卖出：快线下穿慢线
    """
    df = df.copy()
    df["_fast"] = _sma(df["close"], fast_period)
    df["_slow"] = _sma(df["close"], slow_period)
    df["_diff"] = df["_fast"] - df["_slow"]

    df["signal_enter"] = (
        (df["_diff"] > 0) & (df["_diff"].shift(1) <= 0)
    ).astype(int)
    df["signal_exit"] = (
        (df["_diff"] < 0) & (df["_diff"].shift(1) >= 0)
    ).astype(int)

    # 保留指标列供报告展示
    df["ind_fast_ma"] = df["_fast"]
    df["ind_slow_ma"] = df["_slow"]
    df.drop(columns=["_fast", "_slow", "_diff"], inplace=True)
    return df


def strategy_rsi(
    df: pd.DataFrame,
    period: int = 14,
    oversold: int = 30,
    overbought: int = 70,
    **kwargs,
) -> pd.DataFrame:
    """
    RSI 超买超卖策略
    买入：RSI 从超卖区向上穿越 oversold
    卖出：RSI 从超买区向下穿越 overbought
    """
    df = df.copy()
    df["ind_rsi"] = _rsi(df["close"], period)

    df["signal_enter"] = (
        (df["ind_rsi"] > oversold) & (df["ind_rsi"].shift(1) <= oversold)
    ).astype(int)
    df["signal_exit"] = (
        (df["ind_rsi"] < overbought) & (df["ind_rsi"].shift(1) >= overbought)
    ).astype(int)
    return df


def strategy_breakout(
    df: pd.DataFrame,
    period: int = 20,
    atr_stop_mult: float = 2.0,
    **kwargs,
) -> pd.DataFrame:
    """
    唐奇安通道突破策略
    买入：收盘价突破 N 日最高价（昨日）
    卖出：收盘价跌破 N 日最低价（昨日）
    """
    df = df.copy()
    df["ind_upper"] = df["high"].rolling(period).max().shift(1)
    df["ind_lower"] = df["low"].rolling(period).min().shift(1)
    df["ind_atr"]   = _atr(df["high"], df["low"], df["close"])

    df["signal_enter"] = (
        (df["close"] > df["ind_upper"]) & (df["volume"] > 0)
    ).astype(int)
    df["signal_exit"] = (
        df["close"] < df["ind_lower"]
    ).astype(int)
    return df


def strategy_macd(
    df: pd.DataFrame,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
    **kwargs,
) -> pd.DataFrame:
    """
    MACD 策略
    买入：MACD 柱状线由负转正（金叉）
    卖出：MACD 柱状线由正转负（死叉）
    """
    df = df.copy()
    macd_line, sig_line, hist = _macd(df["close"], fast, slow, signal)
    df["ind_macd"]    = macd_line
    df["ind_signal"]  = sig_line
    df["ind_hist"]    = hist

    df["signal_enter"] = (
        (df["ind_hist"] > 0) & (df["ind_hist"].shift(1) <= 0)
    ).astype(int)
    df["signal_exit"] = (
        (df["ind_hist"] < 0) & (df["ind_hist"].shift(1) >= 0)
    ).astype(int)
    return df


def strategy_boll(
    df: pd.DataFrame,
    period: int = 20,
    std_mult: float = 2.0,
    **kwargs,
) -> pd.DataFrame:
    """
    布林带均值回归策略
    买入：收盘价从下方穿越下轨
    卖出：收盘价从上方穿越上轨 或 穿越中轨
    """
    df = df.copy()
    upper, mid, lower = _bollinger(df["close"], period, std_mult)
    df["ind_boll_upper"] = upper
    df["ind_boll_mid"]   = mid
    df["ind_boll_lower"] = lower

    df["signal_enter"] = (
        (df["close"] > df["ind_boll_lower"]) &
        (df["close"].shift(1) <= df["ind_boll_lower"].shift(1))
    ).astype(int)
    df["signal_exit"] = (
        (df["close"] > df["ind_boll_upper"]) |
        ((df["close"] < df["ind_boll_mid"]) &
         (df["close"].shift(1) >= df["ind_boll_mid"].shift(1)))
    ).astype(int)
    return df


def strategy_momentum(
    df: pd.DataFrame,
    period: int = 10,
    threshold: float = 0.02,
    **kwargs,
) -> pd.DataFrame:
    """
    价格动量策略
    买入：N日涨幅 > threshold
    卖出：N日涨幅 < -threshold 或持有超过 period 天
    """
    df = df.copy()
    df["ind_momentum"] = df["close"].pct_change(period)

    df["signal_enter"] = (
        df["ind_momentum"] > threshold
    ).astype(int)
    df["signal_exit"] = (
        df["ind_momentum"] < -threshold
    ).astype(int)
    return df


# ─── 策略注册表 ────────────────────────────────────────────────────────────

STRATEGIES: dict[str, Any] = {
    "ma_cross":  strategy_ma_cross,
    "rsi":       strategy_rsi,
    "breakout":  strategy_breakout,
    "macd":      strategy_macd,
    "boll":      strategy_boll,
    "momentum":  strategy_momentum,
}

STRATEGY_DESCRIPTIONS: dict[str, str] = {
    "ma_cross": "双均线交叉（{fast_period}日/{slow_period}日）",
    "rsi":      "RSI超买超卖（周期{period}，超卖{oversold}/超买{overbought}）",
    "breakout": "唐奇安通道突破（{period}日）",
    "macd":     "MACD金叉死叉（{fast}/{slow}/{signal}）",
    "boll":     "布林带均值回归（{period}日，{std_mult}倍标准差）",
    "momentum": "价格动量（{period}日，阈值{threshold:.1%}）",
}

STRATEGY_DEFAULT_PARAMS: dict[str, dict] = {
    "ma_cross": {"fast_period": 5, "slow_period": 20},
    "rsi":      {"period": 14, "oversold": 30, "overbought": 70},
    "breakout": {"period": 20, "atr_stop_mult": 2.0},
    "macd":     {"fast": 12, "slow": 26, "signal": 9},
    "boll":     {"period": 20, "std_mult": 2.0},
    "momentum": {"period": 10, "threshold": 0.02},
}


def get_strategy(name: str) -> Any:
    if name not in STRATEGIES:
        raise ValueError(
            f"未知策略: {name}\n可用策略: {', '.join(STRATEGIES)}"
        )
    return STRATEGIES[name]


def get_strategy_label(name: str, params: dict) -> str:
    tpl = STRATEGY_DESCRIPTIONS.get(name, name)
    merged = {**STRATEGY_DEFAULT_PARAMS.get(name, {}), **params}
    try:
        return tpl.format(**merged)
    except Exception:
        return name
