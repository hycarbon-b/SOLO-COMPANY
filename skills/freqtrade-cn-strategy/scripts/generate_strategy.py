#!/usr/bin/env python3
"""
策略生成脚本 - freqtrade v2+ API (enter_long / exit_long)
支持 CTA、ML、Factor 三种策略类型
"""
import argparse
from pathlib import Path

# ─── CTA 策略模板 ─────────────────────────────────────────────────────────────

CTA_MA_CROSS = '''\
"""
双均线交叉策略 (freqtrade v2+ API)
适用于中长线趋势行情
"""
from freqtrade.strategy import IStrategy, IntParameter
from pandas import DataFrame
import talib.abstract as ta


class {CLASS_NAME}(IStrategy):
    """双均线交叉：快线上穿买入，快线下穿卖出"""

    timeframe = "1d"
    minimal_roi = {"0": 0.10}
    stoploss = -0.05
    trailing_stop = False

    fast_period = IntParameter(3, 15, default=5, space="buy")
    slow_period = IntParameter(15, 60, default=20, space="buy")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["fast_ma"] = ta.SMA(dataframe, timeperiod=self.fast_period.value)
        dataframe["slow_ma"] = ta.SMA(dataframe, timeperiod=self.slow_period.value)
        dataframe["ma_diff"] = dataframe["fast_ma"] - dataframe["slow_ma"]
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["ma_diff"] > 0) &
            (dataframe["ma_diff"].shift(1) <= 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["ma_diff"] < 0) &
            (dataframe["ma_diff"].shift(1) >= 0),
            "exit_long",
        ] = 1
        return dataframe
'''

CTA_BREAKOUT = '''\
"""
唐奇安通道突破策略 (freqtrade v2+ API)
价格突破 N 日最高价买入
"""
from freqtrade.strategy import IStrategy, IntParameter
from pandas import DataFrame


class {CLASS_NAME}(IStrategy):
    """唐奇安通道：突破上轨买入，跌破下轨卖出"""

    timeframe = "1d"
    minimal_roi = {"0": 0.15}
    stoploss = -0.08
    trailing_stop = True
    trailing_stop_positive = 0.05

    channel_period = IntParameter(10, 40, default=20, space="buy")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        p = self.channel_period.value
        dataframe["upper"] = dataframe["high"].rolling(p).max()
        dataframe["lower"] = dataframe["low"].rolling(p).min()
        dataframe["mid"] = (dataframe["upper"] + dataframe["lower"]) / 2
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] > dataframe["upper"].shift(1)) &
            (dataframe["volume"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] < dataframe["lower"].shift(1)),
            "exit_long",
        ] = 1
        return dataframe
'''

CTA_MOMENTUM = '''\
"""
动量策略 (freqtrade v2+ API)
基于 N 日价格变化率捕捉短期趋势
"""
from freqtrade.strategy import IStrategy, IntParameter, DecimalParameter
from pandas import DataFrame
import talib.abstract as ta


class {CLASS_NAME}(IStrategy):
    """N 日动量超过阈值买入，跌破下阈值卖出"""

    timeframe = "1d"
    minimal_roi = {"0": 0.10}
    stoploss = -0.06

    momentum_period = IntParameter(5, 30, default=10, space="buy")
    buy_threshold = DecimalParameter(0.01, 0.10, default=0.02, space="buy")
    sell_threshold = DecimalParameter(-0.10, -0.01, default=-0.02, space="sell")
    rsi_period = IntParameter(10, 20, default=14, space="buy")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        p = self.momentum_period.value
        dataframe["momentum"] = dataframe["close"] / dataframe["close"].shift(p) - 1
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=self.rsi_period.value)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["momentum"] > self.buy_threshold.value) &
            (dataframe["rsi"] < 70),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["momentum"] < self.sell_threshold.value) |
            (dataframe["rsi"] > 80),
            "exit_long",
        ] = 1
        return dataframe
'''

CTA_TURTLE = '''\
"""
海龟交易策略 (freqtrade v2+ API)
经典海龟法则：20日突破入场，10日突破止损
"""
from freqtrade.strategy import IStrategy, IntParameter
from pandas import DataFrame


class {CLASS_NAME}(IStrategy):
    """海龟交易：20日高点突破买入，10日低点止损出场"""

    timeframe = "1d"
    minimal_roi = {"0": 0.20}
    stoploss = -0.10
    trailing_stop = True
    trailing_only_offset_is_reached = True
    trailing_stop_positive = 0.05
    trailing_stop_positive_offset = 0.10

    entry_period = IntParameter(15, 30, default=20, space="buy")
    exit_period = IntParameter(5, 15, default=10, space="sell")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        ep = self.entry_period.value
        xp = self.exit_period.value
        dataframe["entry_high"] = dataframe["high"].rolling(ep).max()
        dataframe["exit_low"] = dataframe["low"].rolling(xp).min()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] > dataframe["entry_high"].shift(1)) &
            (dataframe["volume"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] < dataframe["exit_low"].shift(1)),
            "exit_long",
        ] = 1
        return dataframe
'''

# ─── ML 策略模板 ─────────────────────────────────────────────────────────────

ML_XGBOOST = '''\
"""
XGBoost 预测策略 (freqtrade v2+ API)
基于特征工程 + XGBoost 预测次日涨跌方向
"""
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import numpy as np
import logging

logger = logging.getLogger(__name__)


class {CLASS_NAME}(IStrategy):
    """XGBoost 二分类：预测概率 > 0.6 买入，< 0.4 卖出"""

    timeframe = "1d"
    minimal_roi = {"0": 0.08}
    stoploss = -0.05

    _model = None
    _model_trained = False

    FEATURES = ["returns", "volatility", "momentum", "rsi", "macd", "bb_width"]

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["returns"] = dataframe["close"].pct_change()
        dataframe["volatility"] = dataframe["returns"].rolling(20).std()
        dataframe["momentum"] = dataframe["close"] / dataframe["close"].shift(10) - 1

        delta = dataframe["close"].diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        dataframe["rsi"] = 100 - (100 / (1 + gain / loss.replace(0, np.nan)))

        ema12 = dataframe["close"].ewm(span=12).mean()
        ema26 = dataframe["close"].ewm(span=26).mean()
        dataframe["macd"] = ema12 - ema26

        sma20 = dataframe["close"].rolling(20).mean()
        std20 = dataframe["close"].rolling(20).std()
        dataframe["bb_width"] = (std20 * 2) / sma20
        return dataframe

    def _train_model(self, dataframe: DataFrame):
        try:
            import xgboost as xgb
            df = dataframe.dropna(subset=self.FEATURES + ["returns"]).copy()
            if len(df) < 100:
                logger.warning("训练数据不足 100 条")
                return
            y = (df["returns"].shift(-1) > 0).astype(int).iloc[:-1]
            X = df[self.FEATURES].iloc[:-1]
            split = int(len(X) * 0.8)
            self._model = xgb.XGBClassifier(
                n_estimators=100, max_depth=4, learning_rate=0.1,
                eval_metric="logloss", use_label_encoder=False,
            )
            self._model.fit(X.iloc[:split], y.iloc[:split])
            self._model_trained = True
            logger.info(f"XGBoost 训练完成，样本数：{split}")
        except ImportError:
            logger.error("请安装 xgboost: pip install xgboost")
        except Exception as e:
            logger.error(f"模型训练失败: {e}")

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        if not self._model_trained:
            self._train_model(dataframe)
        if self._model is not None:
            X = dataframe[self.FEATURES].fillna(0)
            dataframe["prediction"] = self._model.predict_proba(X)[:, 1]
            dataframe.loc[dataframe["prediction"] > 0.6, "enter_long"] = 1
        else:
            dataframe.loc[
                (dataframe["momentum"] > 0) & (dataframe["rsi"] < 70),
                "enter_long",
            ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        if "prediction" in dataframe.columns:
            dataframe.loc[dataframe["prediction"] < 0.4, "exit_long"] = 1
        else:
            dataframe.loc[dataframe["rsi"] > 80, "exit_long"] = 1
        return dataframe
'''

# ─── 多因子策略模板 ───────────────────────────────────────────────────────────

FACTOR_MULTI = '''\
"""
多因子策略 (freqtrade v2+ API)
结合动量因子、趋势因子、波动率因子
"""
from freqtrade.strategy import IStrategy, DecimalParameter
from pandas import DataFrame


class {CLASS_NAME}(IStrategy):
    """多因子综合评分：排名前 20% 买入，后 20% 卖出"""

    timeframe = "1d"
    minimal_roi = {"0": 0.12}
    stoploss = -0.06

    momentum_weight = DecimalParameter(0.1, 0.6, default=0.4, space="buy")
    quality_weight = DecimalParameter(0.1, 0.5, default=0.3, space="buy")
    trend_weight = DecimalParameter(0.1, 0.5, default=0.3, space="buy")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["momentum_1m"] = dataframe["close"] / dataframe["close"].shift(20) - 1
        dataframe["volatility"] = dataframe["close"].pct_change().rolling(20).std()
        dataframe["quality_factor"] = 1 / (dataframe["volatility"] + 1e-8)
        dataframe["trend"] = (
            dataframe["close"].rolling(20).mean() /
            dataframe["close"].rolling(60).mean() - 1
        )
        mw = self.momentum_weight.value
        qw = self.quality_weight.value
        tw = self.trend_weight.value
        total = mw + qw + tw
        dataframe["factor_score"] = (
            mw * dataframe["momentum_1m"].rank(pct=True) +
            qw * dataframe["quality_factor"].rank(pct=True) +
            tw * dataframe["trend"].rank(pct=True)
        ) / total
        dataframe["factor_rank"] = dataframe["factor_score"].rolling(60).apply(
            lambda x: (x[-1] > x[:-1]).mean(), raw=True
        )
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["factor_rank"] > 0.8) & (dataframe["momentum_1m"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["factor_rank"] < 0.2, "exit_long"] = 1
        return dataframe
'''

# ─── 模板注册表 ──────────────────────────────────────────────────────────────

STRATEGIES: dict = {
    "cta": {
        "ma_cross": CTA_MA_CROSS,
        "breakout": CTA_BREAKOUT,
        "momentum": CTA_MOMENTUM,
        "turtle": CTA_TURTLE,
    },
    "ml": {
        "xgboost": ML_XGBOOST,
    },
    "factor": {
        "multi": FACTOR_MULTI,
    },
}


def generate_strategy(
    strategy_type: str,
    template_name: str,
    class_name: str,
    output_dir: Path,
) -> None:
    """生成策略文件并写入项目目录"""
    if strategy_type not in STRATEGIES:
        raise ValueError(
            f"不支持的策略类型: {strategy_type}，可选: {list(STRATEGIES.keys())}"
        )
    templates = STRATEGIES[strategy_type]
    if template_name not in templates:
        raise ValueError(
            f"策略 '{strategy_type}' 不存在模板 '{template_name}'，可选: {list(templates.keys())}"
        )

    content = templates[template_name].replace("{CLASS_NAME}", class_name)

    strategy_path = output_dir / "strategies" / strategy_type / f"{class_name}.py"
    strategy_path.parent.mkdir(parents=True, exist_ok=True)
    strategy_path.write_text(content, encoding="utf-8")

    user_path = output_dir / "user_data" / "strategies" / f"{class_name}.py"
    user_path.parent.mkdir(parents=True, exist_ok=True)
    user_path.write_text(content, encoding="utf-8")

    print(f"策略已生成: {strategy_path}")
    print(f"  类名: {class_name}")
    print(f"  同步到: {user_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="生成 freqtrade v2+ 量化策略")
    parser.add_argument(
        "--type", required=True, choices=list(STRATEGIES.keys()),
        help="策略类型: cta / ml / factor",
    )
    parser.add_argument(
        "--template", type=str,
        help="模板名称（cta: ma_cross/breakout/momentum/turtle；ml: xgboost；factor: multi）",
    )
    parser.add_argument("--name", required=True, help="策略类名（如 MyMACross）")
    parser.add_argument("--output", default="./freqtrade-cn", help="输出目录")
    args = parser.parse_args()

    templates = STRATEGIES[args.type]
    template = args.template or list(templates.keys())[0]
    class_name = args.name[0].upper() + args.name[1:]

    generate_strategy(args.type, template, class_name, Path(args.output))

    print("\n下一步:")
    print(f"  回测: python scripts/run_backtest.py --strategy {class_name} --output ./freqtrade-cn --timerange 20200101-20240101")
    print(f"  优化: python scripts/optimize.py --strategy {class_name} --output ./freqtrade-cn")


if __name__ == "__main__":
    main()
