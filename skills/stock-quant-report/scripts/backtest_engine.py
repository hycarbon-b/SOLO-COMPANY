#!/usr/bin/env python3
"""
向量化回测引擎 - 纯 pandas/numpy 实现

规则：
  - 信号当日收盘确认，次日开盘执行（无未来函数）
  - 每次只持有一个仓位（满仓操作）
  - 支持手续费（买卖双向）
  - 支持止损和止盈
  - 不允许同日买卖

输出：
  BacktestResult 包含：
    - trades        : List[Trade]  每笔交易记录
    - equity_curve  : pd.Series   净值曲线（从1开始）
    - metrics       : dict         绩效指标
    - daily_returns : pd.Series   日度收益率
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class Trade:
    entry_date:  datetime
    exit_date:   Optional[datetime]
    entry_price: float
    exit_price:  Optional[float]
    side:        str  # "long"
    pnl_pct:     float = 0.0
    pnl_abs:     float = 0.0
    bars_held:   int = 0
    exit_reason: str = "signal"  # signal / stoploss / takeprofit / end


@dataclass
class BacktestResult:
    trades:       list[Trade]
    equity_curve: pd.Series
    daily_returns: pd.Series
    metrics:      dict
    df:           pd.DataFrame  # 含信号与指标的原始数据


def run_backtest(
    df: pd.DataFrame,
    initial_capital: float = 100_000.0,
    commission: float = 0.001,   # 单边手续费 0.1%
    stoploss: float = -0.08,     # 最大亏损 -8% 止损（0 表示不启用）
    takeprofit: float = 0.0,     # 止盈 0 表示不启用
    slippage: float = 0.001,     # 滑点 0.1%
) -> BacktestResult:
    """
    执行向量化回测。

    df 必须包含以下列（由 strategies.py 生成）：
      date, open, high, low, close, volume
      signal_enter  (1 = 买入信号)
      signal_exit   (1 = 卖出信号)
    """
    required = ["date", "open", "high", "low", "close", "signal_enter", "signal_exit"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"DataFrame 缺少列: {col}")

    df = df.copy().reset_index(drop=True)
    n = len(df)

    # 状态
    in_position    = False
    entry_price    = 0.0
    entry_date     = None
    entry_idx      = 0
    cash           = initial_capital
    shares         = 0.0
    portfolio_val  = initial_capital

    trades: list[Trade] = []
    equity_vals = np.zeros(n)
    equity_vals[0] = initial_capital

    for i in range(1, n):
        row     = df.iloc[i]
        prev    = df.iloc[i - 1]
        exec_price = row["open"] * (1 + slippage)  # 次日开盘含滑点

        if in_position:
            # 更新当前市值
            portfolio_val = shares * row["close"]

            # 计算当前持仓盈亏
            pnl_pct = (row["close"] - entry_price) / entry_price

            # 止损检查（使用当日低点模拟最坏情况）
            if stoploss < 0:
                low_pnl = (row["low"] - entry_price) / entry_price
                if low_pnl <= stoploss:
                    # 以止损价成交
                    stop_price = entry_price * (1 + stoploss)
                    stop_price = max(stop_price, row["low"])
                    net_exit = stop_price * (1 - commission - slippage)
                    pnl_abs = shares * (net_exit - entry_price * (1 + commission))
                    t = Trade(
                        entry_date=entry_date, exit_date=row["date"],
                        entry_price=entry_price, exit_price=stop_price,
                        side="long",
                        pnl_pct=(net_exit - entry_price) / entry_price,
                        pnl_abs=pnl_abs,
                        bars_held=i - entry_idx,
                        exit_reason="stoploss",
                    )
                    trades.append(t)
                    cash = shares * net_exit
                    shares = 0.0
                    portfolio_val = cash
                    in_position = False
                    equity_vals[i] = portfolio_val
                    continue

            # 止盈检查
            if takeprofit > 0 and pnl_pct >= takeprofit:
                net_exit = exec_price * (1 - commission - slippage)
                pnl_abs = shares * (net_exit - entry_price * (1 + commission))
                t = Trade(
                    entry_date=entry_date, exit_date=row["date"],
                    entry_price=entry_price, exit_price=exec_price,
                    side="long",
                    pnl_pct=(net_exit - entry_price) / entry_price,
                    pnl_abs=pnl_abs,
                    bars_held=i - entry_idx,
                    exit_reason="takeprofit",
                )
                trades.append(t)
                cash = shares * net_exit
                shares = 0.0
                portfolio_val = cash
                in_position = False
                equity_vals[i] = portfolio_val
                continue

            # 信号卖出
            if prev["signal_exit"] == 1:
                net_exit = exec_price * (1 - commission - slippage)
                pnl_abs = shares * (net_exit - entry_price * (1 + commission))
                t = Trade(
                    entry_date=entry_date, exit_date=row["date"],
                    entry_price=entry_price, exit_price=exec_price,
                    side="long",
                    pnl_pct=(net_exit - entry_price) / entry_price,
                    pnl_abs=pnl_abs,
                    bars_held=i - entry_idx,
                    exit_reason="signal",
                )
                trades.append(t)
                cash = shares * net_exit
                shares = 0.0
                portfolio_val = cash
                in_position = False

        else:
            portfolio_val = cash

            # 信号买入
            if prev["signal_enter"] == 1:
                net_entry = exec_price * (1 + commission)
                shares = cash / net_entry
                entry_price = exec_price
                entry_date  = row["date"]
                entry_idx   = i
                cash = 0.0
                portfolio_val = shares * row["close"]
                in_position = True

        equity_vals[i] = portfolio_val

    # 强制平仓（最后一根K线）
    if in_position:
        last = df.iloc[-1]
        net_exit = last["close"] * (1 - commission - slippage)
        pnl_abs = shares * (net_exit - entry_price * (1 + commission))
        t = Trade(
            entry_date=entry_date, exit_date=last["date"],
            entry_price=entry_price, exit_price=last["close"],
            side="long",
            pnl_pct=(net_exit - entry_price) / entry_price,
            pnl_abs=pnl_abs,
            bars_held=len(df) - 1 - entry_idx,
            exit_reason="end",
        )
        trades.append(t)
        equity_vals[-1] = shares * net_exit

    # ─── 绩效指标计算 ──────────────────────────────────────────────────────

    equity = pd.Series(equity_vals, index=df["date"])
    equity_norm = equity / initial_capital  # 净值（从1开始）

    daily_ret = equity.pct_change().fillna(0)

    final_capital = float(equity.iloc[-1])
    total_return  = (final_capital - initial_capital) / initial_capital

    # 年化收益率（以252交易日）
    n_days  = (df["date"].iloc[-1] - df["date"].iloc[0]).days
    n_years = max(n_days / 365.25, 1 / 365.25)
    cagr    = (1 + total_return) ** (1 / n_years) - 1

    # 最大回撤
    roll_max  = equity.cummax()
    drawdown  = (equity - roll_max) / roll_max
    max_dd    = float(drawdown.min())

    # 夏普比率（日度，年化）
    ret_std = daily_ret.std()
    sharpe  = (daily_ret.mean() / ret_std * np.sqrt(252)) if ret_std > 0 else 0.0

    # Sortino
    downside = daily_ret[daily_ret < 0].std()
    sortino  = (daily_ret.mean() / downside * np.sqrt(252)) if downside > 0 else 0.0

    # Calmar
    calmar = cagr / abs(max_dd) if max_dd != 0 else 0.0

    # 交易统计
    n_trades  = len(trades)
    win_trades = [t for t in trades if t.pnl_pct > 0]
    win_rate   = len(win_trades) / n_trades if n_trades > 0 else 0.0

    avg_win  = np.mean([t.pnl_pct for t in win_trades]) if win_trades else 0.0
    loss_trades = [t for t in trades if t.pnl_pct <= 0]
    avg_loss = np.mean([t.pnl_pct for t in loss_trades]) if loss_trades else 0.0

    profit_factor = (
        abs(sum(t.pnl_abs for t in win_trades) /
            sum(t.pnl_abs for t in loss_trades))
        if loss_trades and sum(t.pnl_abs for t in loss_trades) != 0 else float("inf")
    )

    avg_bars = np.mean([t.bars_held for t in trades]) if trades else 0.0

    # 买入持有基准
    bh_return = (
        (float(df["close"].iloc[-1]) - float(df["close"].iloc[0])) /
        float(df["close"].iloc[0])
    )

    metrics = {
        "total_return":    total_return,
        "cagr":            cagr,
        "max_drawdown":    max_dd,
        "sharpe_ratio":    sharpe,
        "sortino_ratio":   sortino,
        "calmar_ratio":    calmar,
        "win_rate":        win_rate,
        "profit_factor":   profit_factor,
        "avg_win":         avg_win,
        "avg_loss":        avg_loss,
        "n_trades":        n_trades,
        "avg_bars_held":   avg_bars,
        "final_capital":   final_capital,
        "initial_capital": initial_capital,
        "bh_return":       bh_return,
        "start_date":      str(df["date"].iloc[0].date()),
        "end_date":        str(df["date"].iloc[-1].date()),
    }

    return BacktestResult(
        trades=trades,
        equity_curve=equity_norm,
        daily_returns=daily_ret / initial_capital,
        metrics=metrics,
        df=df,
    )


def compute_monthly_returns(equity_norm: pd.Series) -> pd.DataFrame:
    """计算月度收益率，返回 pivot 表（行=年，列=月）"""
    monthly = equity_norm.resample("ME").last().pct_change().fillna(0)
    monthly.index = pd.to_datetime(monthly.index)
    df = pd.DataFrame({
        "year":  monthly.index.year,
        "month": monthly.index.month,
        "ret":   monthly.values,
    })
    pivot = df.pivot(index="year", columns="month", values="ret")
    # 填充缺失月份
    for m in range(1, 13):
        if m not in pivot.columns:
            pivot[m] = np.nan
    pivot = pivot[sorted(pivot.columns)]
    return pivot
