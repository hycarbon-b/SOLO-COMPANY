#!/usr/bin/env python3
"""
HTML 回测报告生成器

生成自包含的单文件 HTML 报告，包含：
  - 策略配置摘要
  - 核心绩效指标卡片
  - 净值曲线 vs 买入持有（Chart.js）
  - 月度收益热力图
  - 交易明细表
  - 回撤曲线

依赖：仅标准库 + Chart.js（CDN），无需额外 Python 包
"""

from __future__ import annotations
import json
import math
from pathlib import Path
from datetime import datetime
from typing import Optional
import pandas as pd
import numpy as np

from backtest_engine import BacktestResult, compute_monthly_returns


MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _pct(v: float) -> str:
    return f"{v * 100:+.2f}%"


def _pct_plain(v: float) -> str:
    return f"{v * 100:.2f}%"


def _color_pct(v: float) -> str:
    cls = "positive" if v > 0 else ("negative" if v < 0 else "neutral")
    return f'<span class="{cls}">{_pct(v)}</span>'


def _heatmap_color(v: float) -> str:
    """月度收益热力图颜色：TradingView 亮色风格"""
    if math.isnan(v):
        return "background:#f0f3fa;"
    if v > 0:
        intensity = min(int(v / 0.08 * 200), 200)
        alpha = 0.12 + intensity / 255
        return f"background:rgba(38,166,154,{alpha:.2f});"
    else:
        intensity = min(int(abs(v) / 0.06 * 200), 200)
        alpha = 0.12 + intensity / 255
        return f"background:rgba(239,83,80,{alpha:.2f});"


def generate_report(
    result: BacktestResult,
    symbol: str,
    strategy_name: str,
    strategy_label: str,
    strategy_params: dict,
    output_path: Path,
    commission: float = 0.001,
    stoploss: float = -0.08,
) -> Path:
    """
    生成完整 HTML 报告并写入 output_path。
    返回写入的文件路径。
    """
    m = result.metrics
    equity = result.equity_curve
    trades = result.trades
    df_raw = result.df

    # ── 净值曲线数据 ─────────────────────────────────────────────────────────
    dates_str  = [str(d.date()) for d in equity.index]
    equity_arr = [round(float(v), 6) for v in equity.values]

    # 买入持有净值（从同一起点）
    first_close = float(df_raw["close"].iloc[0])
    bh_arr = [round(float(c) / first_close, 6) for c in df_raw["close"].values]
    bh_dates = [str(d.date()) for d in df_raw["date"]]

    # ── 回撤曲线 ──────────────────────────────────────────────────────────────
    roll_max   = equity.cummax()
    drawdown   = ((equity - roll_max) / roll_max).fillna(0)
    dd_arr     = [round(float(v) * 100, 4) for v in drawdown.values]

    # ── 月度收益热力图 ────────────────────────────────────────────────────────
    monthly_pivot = compute_monthly_returns(equity)

    # ── 交易表格 ─────────────────────────────────────────────────────────────
    trade_rows = ""
    for i, t in enumerate(sorted(trades, key=lambda x: x.entry_date, reverse=True), 1):
        cls = "win" if t.pnl_pct > 0 else "loss"
        ep = f"{t.entry_price:.3f}" if t.entry_price else "-"
        xp = f"{t.exit_price:.3f}" if t.exit_price else "-"
        ed = str(t.entry_date.date()) if t.entry_date else "-"
        xd = str(t.exit_date.date()) if t.exit_date else "持仓中"
        pnl_cls = "positive" if t.pnl_pct > 0 else "negative"
        trade_rows += f"""
        <tr class="{cls}">
            <td>{i}</td>
            <td>{ed}</td>
            <td>{xd}</td>
            <td>{ep}</td>
            <td>{xp}</td>
            <td class="{pnl_cls}">{_pct(t.pnl_pct)}</td>
            <td>{t.bars_held}</td>
            <td><span class="badge badge-{t.exit_reason}">{t.exit_reason}</span></td>
        </tr>"""

    # ── 月度热力图 HTML ───────────────────────────────────────────────────────
    heatmap_header = "".join(f"<th>{m}</th>" for m in MONTH_NAMES)
    heatmap_rows = ""
    for year, row in monthly_pivot.iterrows():
        annual = ((1 + row.fillna(0)).prod() - 1)
        ann_cls = "positive" if annual > 0 else "negative"
        cells = ""
        for m_num in range(1, 13):
            v = row.get(m_num, float("nan"))
            if math.isnan(v):
                cells += '<td class="hm-cell hm-na">-</td>'
            else:
                style = _heatmap_color(v)
                pnl_cls = "positive" if v > 0 else "negative"
                cells += f'<td class="hm-cell {pnl_cls}" style="{style}">{_pct(v)}</td>'
        heatmap_rows += f"""
        <tr>
            <td class="hm-year">{year}</td>
            {cells}
            <td class="hm-annual {ann_cls}">{_pct(annual)}</td>
        </tr>"""

    # ── 核心指标 ──────────────────────────────────────────────────────────────
    total_ret_cls  = "positive" if m["total_return"] > 0 else "negative"
    cagr_cls       = "positive" if m["cagr"] > 0 else "negative"
    vs_bh          = m["total_return"] - m["bh_return"]
    vs_bh_cls      = "positive" if vs_bh > 0 else "negative"

    sharpe_val   = f"{m['sharpe_ratio']:.2f}"
    sortino_val  = f"{m['sortino_ratio']:.2f}"
    calmar_val   = f"{m['calmar_ratio']:.2f}"
    pf_val       = f"{m['profit_factor']:.2f}" if m["profit_factor"] != float("inf") else "∞"

    # ── 参数字符串 ───────────────────────────────────────────────────────────
    param_str = " · ".join(f"{k}={v}" for k, v in strategy_params.items())

    # ── 策略代码/指标列表 ────────────────────────────────────────────────────
    ind_cols = [c for c in df_raw.columns if c.startswith("ind_")]

    # ── Chart.js 数据 ─────────────────────────────────────────────────────────
    equity_json = json.dumps(equity_arr)
    bh_json     = json.dumps(bh_arr)
    dates_json  = json.dumps(dates_str)
    dd_json     = json.dumps(dd_arr)

    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>回测报告 · {symbol} · {strategy_name}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  :root {{
    --bg:        #f0f3fa;
    --surface:   #ffffff;
    --surface2:  #f8f9fd;
    --border:    #e0e3eb;
    --border2:   #c8cbd6;
    --text:      #131722;
    --text2:     #2a2e39;
    --muted:     #787b86;
    --positive:  #26a69a;
    --negative:  #ef5350;
    --neutral:   #9598a1;
    --accent:    #2962ff;
    --accent2:   #00bcd4;
    --shadow:    0 1px 3px rgba(19,23,34,.07), 0 4px 12px rgba(19,23,34,.04);
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif; font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }}
  a {{ color: var(--accent); text-decoration: none; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 28px 20px; }}

  /* Header */
  .report-header {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px 28px; margin-bottom: 20px; box-shadow: var(--shadow); }}
  .report-header h1 {{ font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -.3px; }}
  .report-header .subtitle {{ color: var(--muted); font-size: 13px; margin-top: 5px; }}
  .badge-row {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }}
  .badge {{ display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; }}
  .badge-info {{ background: rgba(41,98,255,.08); color: var(--accent); border: 1px solid rgba(41,98,255,.2); }}
  .badge-signal {{ background: rgba(0,188,212,.08); color: #0097a7; border: 1px solid rgba(0,188,212,.25); }}
  .badge-param {{ background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }}

  /* Metric cards */
  .cards-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 10px; margin-bottom: 20px; }}
  .card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; box-shadow: var(--shadow); transition: box-shadow .15s; }}
  .card:hover {{ box-shadow: 0 2px 8px rgba(19,23,34,.1), 0 8px 24px rgba(19,23,34,.06); }}
  .card .label {{ font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; font-weight: 500; }}
  .card .value {{ font-size: 22px; font-weight: 700; letter-spacing: -.5px; color: var(--text); }}
  .card .sub {{ font-size: 11.5px; color: var(--muted); margin-top: 5px; }}
  .positive {{ color: var(--positive) !important; }}
  .negative {{ color: var(--negative) !important; }}
  .neutral  {{ color: var(--neutral); }}

  /* Section */
  .section {{ margin-bottom: 20px; }}
  .section-title {{ font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 10px; padding: 0 2px; }}

  /* Chart containers */
  .chart-wrap {{ background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px 20px 14px; box-shadow: var(--shadow); }}
  .chart-wrap canvas {{ max-height: 300px; }}

  /* Two-col layout */
  .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
  @media (max-width: 768px) {{ .two-col {{ grid-template-columns: 1fr; }} }}

  /* Monthly heatmap */
  .heatmap-wrap {{ overflow-x: auto; border-radius: 10px; box-shadow: var(--shadow); }}
  .hm-table {{ border-collapse: collapse; width: 100%; background: var(--surface); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }}
  .hm-table th {{ background: var(--surface2); color: var(--muted); font-size: 11px; padding: 9px 7px; text-align: center; font-weight: 600; letter-spacing: .04em; border-bottom: 1px solid var(--border); }}
  .hm-table td {{ padding: 8px 6px; text-align: center; font-size: 12px; border-bottom: 1px solid rgba(224,227,235,.5); font-weight: 500; }}
  .hm-year {{ color: var(--text2); font-size: 12px; font-weight: 700; background: var(--surface2) !important; border-right: 1px solid var(--border); }}
  .hm-annual {{ font-weight: 700; background: var(--surface2) !important; border-left: 1px solid var(--border); }}
  .hm-na {{ color: var(--border2); }}

  /* Trades table */
  .trades-wrap {{ overflow-x: auto; border-radius: 10px; box-shadow: var(--shadow); }}
  table.trades {{ border-collapse: collapse; width: 100%; background: var(--surface); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }}
  table.trades th {{ background: var(--surface2); color: var(--muted); font-size: 10.5px; padding: 11px 14px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; border-bottom: 1px solid var(--border); }}
  table.trades td {{ padding: 10px 14px; border-bottom: 1px solid rgba(224,227,235,.6); font-size: 13px; color: var(--text2); }}
  table.trades tr:last-child td {{ border-bottom: none; }}
  table.trades tr:hover td {{ background: rgba(41,98,255,.03); }}
  .badge-signal   {{ background: rgba(41,98,255,.08);   color: var(--accent);   border: 1px solid rgba(41,98,255,.2);  border-radius: 5px; padding: 2px 8px; font-size: 11px; }}
  .badge-stoploss {{ background: rgba(239,83,80,.08);   color: var(--negative); border: 1px solid rgba(239,83,80,.2);  border-radius: 5px; padding: 2px 8px; font-size: 11px; }}
  .badge-takeprofit {{ background: rgba(38,166,154,.08); color: var(--positive); border: 1px solid rgba(38,166,154,.2); border-radius: 5px; padding: 2px 8px; font-size: 11px; }}
  .badge-end      {{ background: var(--surface2); color: var(--muted); border: 1px solid var(--border); border-radius: 5px; padding: 2px 8px; font-size: 11px; }}

  /* Footer */
  .report-footer {{ margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; text-align: center; }}
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="report-header">
    <h1>📈 回测报告 · {symbol}</h1>
    <div class="subtitle">{strategy_label} · {m['start_date']} ~ {m['end_date']}</div>
    <div class="badge-row">
      <span class="badge badge-info">{strategy_name}</span>
      <span class="badge badge-signal">手续费 {commission*100:.2f}%（双向）</span>
      <span class="badge badge-signal">止损 {abs(stoploss)*100:.0f}%</span>
      <span class="badge badge-param">{param_str}</span>
    </div>
  </div>

  <!-- Metrics cards -->
  <div class="section">
    <div class="section-title">核心绩效</div>
    <div class="cards-grid">
      <div class="card">
        <div class="label">总收益</div>
        <div class="value {total_ret_cls}">{_pct(m['total_return'])}</div>
        <div class="sub">买入持有 {_pct(m['bh_return'])}</div>
      </div>
      <div class="card">
        <div class="label">超额收益</div>
        <div class="value {vs_bh_cls}">{_pct(vs_bh)}</div>
        <div class="sub">vs 买入持有</div>
      </div>
      <div class="card">
        <div class="label">年化收益 (CAGR)</div>
        <div class="value {cagr_cls}">{_pct(m['cagr'])}</div>
        <div class="sub">{m['start_date']} ~ {m['end_date']}</div>
      </div>
      <div class="card">
        <div class="label">最大回撤</div>
        <div class="value negative">{_pct(m['max_drawdown'])}</div>
        <div class="sub">Calmar {calmar_val}</div>
      </div>
      <div class="card">
        <div class="label">夏普比率</div>
        <div class="value">{sharpe_val}</div>
        <div class="sub">Sortino {sortino_val}</div>
      </div>
      <div class="card">
        <div class="label">胜率</div>
        <div class="value">{_pct_plain(m['win_rate'])}</div>
        <div class="sub">共 {m['n_trades']} 笔交易</div>
      </div>
      <div class="card">
        <div class="label">盈亏比</div>
        <div class="value">{pf_val}</div>
        <div class="sub">均盈 {_pct(m['avg_win'])} / 均亏 {_pct(m['avg_loss'])}</div>
      </div>
      <div class="card">
        <div class="label">平均持仓</div>
        <div class="value">{m['avg_bars_held']:.1f}</div>
        <div class="sub">交易日</div>
      </div>
    </div>
  </div>

  <!-- Equity curve -->
  <div class="section">
    <div class="section-title">净值曲线</div>
    <div class="chart-wrap">
      <canvas id="equityChart"></canvas>
    </div>
  </div>

  <!-- Drawdown chart -->
  <div class="section">
    <div class="section-title">回撤曲线</div>
    <div class="chart-wrap">
      <canvas id="ddChart"></canvas>
    </div>
  </div>

  <!-- Monthly heatmap -->
  <div class="section">
    <div class="section-title">月度收益热力图</div>
    <div class="heatmap-wrap">
      <table class="hm-table">
        <thead>
          <tr>
            <th>年份</th>
            {heatmap_header}
            <th>全年</th>
          </tr>
        </thead>
        <tbody>
          {heatmap_rows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Trade log -->
  <div class="section">
    <div class="section-title">交易明细（共 {m['n_trades']} 笔，最新在前）</div>
    <div class="trades-wrap">
      <table class="trades">
        <thead>
          <tr>
            <th>#</th>
            <th>买入日</th>
            <th>卖出日</th>
            <th>买入价</th>
            <th>卖出价</th>
            <th>收益率</th>
            <th>持仓（日）</th>
            <th>退出原因</th>
          </tr>
        </thead>
        <tbody>
          {trade_rows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="report-footer">
    生成时间: {now} · 本报告仅供学习研究，不构成投资建议
  </div>
</div>

<script>
const DATES  = {dates_json};
const EQUITY = {equity_json};
const BH     = {bh_json};
const DD     = {dd_json};
const BH_DATES = {json.dumps(bh_dates)};

// Chart defaults — TradingView light
Chart.defaults.color = '#787b86';
Chart.defaults.borderColor = '#e0e3eb';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif';
Chart.defaults.font.size = 12;

const GRID_COLOR  = 'rgba(224,227,235,0.8)';
const TICK_COLOR  = '#9598a1';

const tooltipPlugin = {{
  backgroundColor: '#ffffff',
  titleColor: '#131722',
  bodyColor: '#2a2e39',
  borderColor: '#e0e3eb',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  boxPadding: 4,
}};

// Equity chart
new Chart(document.getElementById('equityChart'), {{
  type: 'line',
  data: {{
    labels: DATES,
    datasets: [
      {{
        label: '策略净值',
        data: EQUITY,
        borderColor: '#2962ff',
        backgroundColor: 'rgba(41,98,255,0.06)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.1,
      }},
      {{
        label: '买入持有',
        data: BH,
        borderColor: '#9598a1',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        fill: false,
        tension: 0.1,
      }}
    ]
  }},
  options: {{
    responsive: true,
    interaction: {{ mode: 'index', intersect: false }},
    plugins: {{
      legend: {{ position: 'top', labels: {{ usePointStyle: true, pointStyleWidth: 14, boxHeight: 2, color: '#2a2e39' }} }},
      tooltip: {{ ...tooltipPlugin, callbacks: {{ label: ctx => ` ${{ctx.dataset.label}}: ${{(ctx.raw).toFixed(4)}}x` }} }}
    }},
    scales: {{
      x: {{ grid: {{ color: GRID_COLOR }}, ticks: {{ maxTicksLimit: 12, color: TICK_COLOR }} }},
      y: {{ grid: {{ color: GRID_COLOR }}, ticks: {{ color: TICK_COLOR, callback: v => v.toFixed(2) + 'x' }} }}
    }}
  }}
}});

// Drawdown chart
new Chart(document.getElementById('ddChart'), {{
  type: 'line',
  data: {{
    labels: DATES,
    datasets: [{{
      label: '回撤 %',
      data: DD,
      borderColor: '#ef5350',
      backgroundColor: 'rgba(239,83,80,0.07)',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      tension: 0.1,
    }}]
  }},
  options: {{
    responsive: true,
    interaction: {{ mode: 'index', intersect: false }},
    plugins: {{
      legend: {{ display: false }},
      tooltip: {{ ...tooltipPlugin, callbacks: {{ label: ctx => ` 回撤: ${{ctx.raw.toFixed(2)}}%` }} }}
    }},
    scales: {{
      x: {{ grid: {{ color: GRID_COLOR }}, ticks: {{ maxTicksLimit: 12, color: TICK_COLOR }} }},
      y: {{ grid: {{ color: GRID_COLOR }}, ticks: {{ color: TICK_COLOR, callback: v => v.toFixed(1) + '%' }}, max: 0 }}
    }}
  }}
}});
</script>
</body>
</html>"""

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    print(f"\n[report] HTML 报告已生成: {output_path}")
    return output_path
