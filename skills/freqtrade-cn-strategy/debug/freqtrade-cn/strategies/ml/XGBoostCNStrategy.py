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
