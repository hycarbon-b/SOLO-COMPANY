#!/usr/bin/env python3
"""
随机选股脚本
从沪深300成分股中随机选择
"""
import random

# 沪深300成分股（2024年数据，部分示例）
HS300_SYMBOLS = [
    # 金融
    "600519.SH",  # 贵州茅台
    "000858.SZ",  # 五粮液
    "601318.SH",  # 中国平安
    "000001.SZ",  # 平安银行
    "600036.SH",  # 招商银行
    "601166.SH",  # 兴业银行
    "601398.SH",  # 工商银行
    "601288.SH",  # 农业银行
    "600030.SH",  # 中信证券
    "601211.SH",  #国泰君安
    
    # 科技
    "000333.SZ",  # 美的集团
    "000651.SZ",  # 格力电器
    "002415.SZ",  # 海康威视
    "000725.SZ",  # 京东方A
    "002230.SZ",  # 科大讯飞
    "600900.SH",  # 长江电力
    "601888.SH",  # 中国中免
    
    # 医药
    "600276.SH",  # 恒瑞医药
    "000538.SZ",  # 云南白药
    "002007.SZ",  # 华兰生物
    "300015.SZ",  # 爱尔眼科
    "002044.SZ",  # 美年健康
    
    # 消费
    "600887.SH",  # 伊利股份
    "000002.SZ",  # 万科A
    "600048.SH",  # 保利发展
    "002304.SZ",  # 洋河股份
    "000568.SZ",  # 泸州老窖
    
    # 工业
    "600031.SH",  # 三一重工
    "601766.SH",  # 中国中车
    "600585.SH",  # 海螺水泥
    "000063.SZ",  # 中兴通讯
    "002475.SZ",  # 立讯精密
    
    # 能源
    "601857.SH",  # 中国石油
    "601088.SH",  # 中国神华
    "600028.SH",  # 中国石化
    "601225.SH",  # 陕西煤业
    "000708.SZ",  # 中信特钢
]

def get_random_symbols(n: int = 1) -> list:
    """随机选择n只股票"""
    if n > len(HS300_SYMBOLS):
        print(f"警告: 请求{n}只，但只有{len(HS300_SYMBOLS)}只可选")
        n = len(HS300_SYMBOLS)
    
    selected = random.sample(HS300_SYMBOLS, n)
    print(f"随机选择的标的: {selected}")
    return selected

def get_symbol_name(symbol: str) -> str:
    """获取股票名称"""
    names = {
        "600519.SH": "贵州茅台",
        "000858.SZ": "五粮液",
        "601318.SH": "中国平安",
        "000001.SZ": "平安银行",
        "600036.SH": "招商银行",
        "000333.SZ": "美的集团",
        "600276.SH": "恒瑞医药",
        "600887.SH": "伊利股份",
        "601398.SH": "工商银行",
        "601288.SH": "农业银行",
        "002415.SZ": "海康威视",
        "000651.SZ": "格力电器",
        "600030.SH": "中信证券",
        "600900.SH": "长江电力",
        "601888.SH": "中国中免",
    }
    return names.get(symbol, symbol)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="随机选股")
    parser.add_argument("-n", type=int, default=1, help="选择数量")
    parser.add_argument("--show-name", action="store_true", help="显示股票名称")
    args = parser.parse_args()
    
    symbols = get_random_symbols(args.n)
    
    if args.show_name:
        for s in symbols:
            print(f"{s}: {get_symbol_name(s)}")
