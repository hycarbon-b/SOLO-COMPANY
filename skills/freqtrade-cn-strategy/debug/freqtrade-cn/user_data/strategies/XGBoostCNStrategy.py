"""
XGBoost 预测策略 (freqtrade v2+ API)
基于特征工程 + XGBoost 预测次日涨跌方向
"""
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import numpy as np
import logging

logger = logging.getLogger(__name__)


class XGBoostCNStrategy(IStrategy):
    """XGBoost 二分类：预测概率 > 0.6 买入，< 0.4 卖出"""

    timeframe = "1d"
    minimal_roi = {"0": 0.08}
    stoploss = -0.05

    _model = None
    _model_trained = False

    FEATURES = ["returns", "volatility", "momentum", "rsi", "macd", "bb_width"]

    def bot_start(self, **kwargs) -> None:
        """
        注入 A 股假市场数据，让 freqtrade 不因为非标准交易对而报错。
        A 股不在 Binance 市场列表，需要手动添加最小字段。
        """
        if self.dp and hasattr(self.dp, '_exchange'):
            exchange = self.dp._exchange
            for pair in (self.dp.current_whitelist() or []):
                if pair not in exchange.markets:
                    base, quote = pair.split('/')
                    exchange.markets[pair] = {
                        'id': pair.replace('/', ''),
                        'symbol': pair,
                        'base': base,
                        'quote': quote,
                        'active': True,
                        'spot': True,
                        'limits': {
                            'amount': {'min': 1, 'max': 10_000_000},
                            'cost': {'min': 1, 'max': None},
                            'price': {'min': 0.01, 'max': None},
                        },
                        # Binance 使用 TICK_SIZE 精度模式：值为步长，不能为 0
                        'precision': {'amount': 1, 'price': 0.01},
                        'taker': 0.001,
                        'maker': 0.001,
                        'info': {},
                    }
                    logger.info(f"[bot_start] 已注入 A 股市场数据: {pair}")

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
                eval_metric="logloss",
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
