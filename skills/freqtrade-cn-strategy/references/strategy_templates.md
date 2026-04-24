# 策略模板详解

本文档包含各类策略的详细模板和说明。

## 目录

1. [CTA趋势策略](#cta趋势策略)
2. [机器学习策略](#机器学习策略)
3. [多因子策略](#多因子策略)
4. [高频策略](#高频策略)

---

## CTA趋势策略

### 1. 双均线交叉策略 (MA_Cross)

最经典的趋势跟踪策略，适合中长线趋势行情。

**原理**：
- 快速均线（如5日）上穿慢速均线（如20日）时买入
- 快速均线下穿慢速均线时卖出

**参数**：
- `fast_period`: 快速均线周期，默认5
- `slow_period`: 慢速均线周期，默认20
- `timeframe`: 时间周期，默认1d

**优化建议**：
- 在震荡市中容易频繁止损，建议配合ADX判断趋势强度
- 可加入止损止盈策略，如吊灯止损

### 2. 突破策略 (Breakout)

捕捉价格突破信号，适合趋势启动阶段。

**原理**：
- 价格突破N日最高价时买入
- 价格跌破N日最低价时卖出

**参数**：
- `channel_period`: 通道周期，默认20
- ` breakout_threshold`: 突破阈值，默认0（严格突破）

**优化建议**：
- 突破后可能回撤，建议确认突破后再入场
- 可配合成交量放大确认

### 3. 动量策略 (Momentum)

基于价格动量信号，适合捕捉短期趋势。

**原理**：
- 动量指标大于阈值时买入
- 动量指标小于阈值时卖出

**参数**：
- `momentum_period`: 动量计算周期，默认10
- `buy_threshold`: 买入阈值，默认0.02
- `sell_threshold`: 卖出阈值，默认-0.02

---

## 机器学习策略

### 1. XGBoost策略

使用XGBoost预测价格方向。

**特征工程**：
- 收益率特征：近N日收益率
- 波动率特征：收益率标准差
- 技术指标：RSI、MACD、KDJ
- 价格特征：均线、通道位置

**模型训练**：
```python
# 特征数据
X = dataframe[features].values

# 标签（次日涨跌）
y = (dataframe['close'].shift(-1) > dataframe['close']).astype(int)

# 训练
model = xgb.XGBClassifier()
model.fit(X_train, y_train)

# 预测
predictions = model.predict_proba(X)[:, 1]
```

**优化建议**：
- 注意避免数据泄漏（使用历史数据预测未来）
- 定期重新训练模型适应市场变化
- 特征选择很重要，避免过多噪声特征

### 2. LSTM策略

使用LSTM网络预测价格序列。

**网络结构**：
- 输入层：时间序列数据
- LSTM层：捕捉时序依赖
- 全连接层：输出预测

**注意事项**：
- LSTM需要GPU训练，CPU速度较慢
- 数据预处理很重要（标准化）
- 防止过拟合（Dropout、Early Stopping）

---

## 多因子策略

### 1. 因子类型

**价值因子**：
- PE（市盈率）
- PB（市净率）
- PS（市销率）

**动量因子**：
- 近1月收益率
- 近3月收益率
- 近6月收益率

**质量因子**：
- ROE（净资产收益率）
- ROA（总资产收益率）
- 净利润率

**波动率因子**：
- 收益率标准差
- ATR（平均真实波动幅度）

### 2. 因子组合方法

**等权组合**：
```python
score = 0.25 * value_score + 0.25 * momentum_score + 0.25 * quality_score + 0.25 * volatility_score
```

**回归加权**：
```python
# 使用历史数据训练因子权重
from sklearn.linear_model import LinearRegression
model = LinearRegression()
model.fit(factor_data, returns)
weights = model.coef_
```

**IC加权**：
```python
# 根据因子IC值加权
ic_values = calculate_ic(factors, returns)
weights = ic_values / ic_values.sum()
```

---

## 高频策略

### 1. 做市策略

提供买卖双边报价赚取价差。

**核心要素**：
- 报价宽度（spread）
- 库存风险管理
- 价格调整频率

### 2. 剥头皮策略

捕捉微小价格变动。

**注意**：
- 需要极低延迟
- 交易所手续费影响很大
- 需要高成交量市场
