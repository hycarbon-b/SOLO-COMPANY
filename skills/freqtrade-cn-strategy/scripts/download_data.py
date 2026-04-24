#!/usr/bin/env python3
"""
中国市场数据下载脚本
支持多种数据源：akshare、baostock、tushare
"""
import os
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import json

# 沪深300成分股（部分示例）
HS300_SAMPLE = [
    "600519.SH",  # 贵州茅台
    "000858.SZ",  # 五粮液
    "601318.SH",  # 中国平安
    "000001.SZ",  # 平安银行
    "600036.SH",  # 招商银行
    "601166.SH",  # 兴业银行
    "600276.SH",  # 恒瑞医药
    "000333.SZ",  # 美的集团
    "600887.SH",  # 伊利股份
    "601398.SH",  # 工商银行
]

def download_from_akshare(symbol: str, start: str, end: str, output_path: Path):
    """使用akshare下载数据"""
    try:
        import akshare as ak
        print(f"[akshare] 下载 {symbol} 数据...")
        
        # 转换股票代码格式
        code = symbol.split('.')[0]
        
        # 下载数据
        df = ak.stock_zh_a_hist(
            symbol=code,
            period="daily",
            start_date=start.replace('-', ''),
            end_date=end.replace('-', ''),
            adjust="qfq"  # 前复权
        )
        
        if df is not None and len(df) > 0:
            # akshare 返回中文列名，按名称映射（兼容不同版本列数）
            col_map = {
                '日期': 'date', '开盘': 'open', '收盘': 'close',
                '最高': 'high', '最低': 'low', '成交量': 'volume',
                '成交额': 'turnover', '振幅': 'amplitude',
                '涨跌幅': 'pct_change', '涨跌额': 'change', '换手率': 'turnover_rate',
            }
            df = df.rename(columns=col_map)
            # 只保留需要的标准列
            keep = [c for c in ['date', 'open', 'high', 'low', 'close', 'volume'] if c in df.columns]
            df = df[keep]
            df['date'] = df['date'].astype(str)
            
            # 保存
            output_file = output_path / f"{symbol.replace('.', '_')}_akshare.csv"
            df.to_csv(output_file, index=False)
            print(f"数据已保存: {output_file} ({len(df)} 条)")
            return True
        return False
    except Exception as e:
        print(f"[akshare] 下载失败: {e}")
        return False

def download_from_baostock(symbol: str, start: str, end: str, output_path: Path):
    """使用baostock下载数据"""
    try:
        import baostock as bs
        print(f"[baostock] 下载 {symbol} 数据...")
        
        # 登录
        lg = bs.login()
        if lg.error_code != '0':
            print(f"登录失败: {lg.error_msg}")
            return False
        
        # 转换代码格式（baostock 需要 sh.600519 格式）
        code, exchange = symbol.split('.')
        bs_code = f"sh.{code}" if exchange.upper() == "SH" else f"sz.{code}"
        
        # 下载数据
        rs = bs.query_history_k_data_plus(
            bs_code,
            "date,code,open,high,low,close,volume,amount,turn,pctChg",
            start_date=start,
            end_date=end,
            frequency="d",
            adjustflag="2"  # 前复权
        )
        
        if rs.error_code == '0':
            import pandas as pd
            data_list = []
            while (rs.error_code == '0') & rs.next():
                data_list.append(rs.get_row_data())
            
            df = pd.DataFrame(data_list, columns=rs.fields)
            
            # 保存
            output_file = output_path / f"{symbol.replace('.', '_')}_baostock.csv"
            df.to_csv(output_file, index=False)
            print(f"数据已保存: {output_file} ({len(df)} 条)")
            return True
        else:
            print(f"查询失败: {rs.error_msg}")
            return False
    except Exception as e:
        print(f"[baostock] 下载失败: {e}")
        return False
    finally:
        try:
            bs.logout()
        except:
            pass

def download_from_tushare(symbol: str, start: str, end: str, output_path: Path, token: str = None):
    """使用tushare下载数据"""
    try:
        import tushare as ts
        
        if token:
            ts.set_token(token)
        
        print(f"[tushare] 下载 {symbol} 数据...")
        
        pro = ts.pro_api()
        
        # 下载数据
        code, exchange = symbol.split('.')
        ts_code = f"{code}.{exchange}"
        
        df = pro.daily(
            ts_code=ts_code,
            start_date=start.replace('-', ''),
            end_date=end.replace('-', '')
        )
        
        if df is not None and len(df) > 0:
            # 保存
            output_file = output_path / f"{symbol.replace('.', '_')}_tushare.csv"
            df.to_csv(output_file, index=False)
            print(f"数据已保存: {output_file} ({len(df)} 条)")
            return True
        return False
    except Exception as e:
        print(f"[tushare] 下载失败: {e}")
        return False

def download_crypto_data(symbol: str, start: str, end: str, output_path: Path):
    """下载加密货币数据"""
    try:
        import ccxt
        print(f"[ccxt] 下载 {symbol} 数据...")
        
        exchange = ccxt.binance()
        
        # 转换时间
        since = int(datetime.strptime(start, '%Y-%m-%d').timestamp() * 1000)
        
        # 下载数据
        ohlcv = exchange.fetch_ohlcv(symbol, '1d', since=since)
        
        import pandas as pd
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        # 保存
        output_file = output_path / f"{symbol.replace('/', '_')}_crypto.csv"
        df.to_csv(output_file, index=False)
        print(f"数据已保存: {output_file} ({len(df)} 条)")
        return True
    except Exception as e:
        print(f"[ccxt] 下载失败: {e}")
        return False

def get_random_symbol(n: int = 1):
    """随机选择标的"""
    import random
    return random.sample(HS300_SAMPLE, min(n, len(HS300_SAMPLE)))

def main():
    parser = argparse.ArgumentParser(description="下载市场数据")
    parser.add_argument("--symbol", type=str, help="股票代码（如 600519.SH），不指定则随机选择")
    parser.add_argument("--symbols", type=str, help="多个股票代码，逗号分隔")
    parser.add_argument("--start", type=str, default=(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'),
                       help="开始日期")
    parser.add_argument("--end", type=str, default=datetime.now().strftime('%Y-%m-%d'),
                       help="结束日期")
    parser.add_argument("--source", type=str, default="baostock",
                       choices=['akshare', 'baostock', 'tushare', 'ccxt'],
                       help="数据源（默认 baostock，akshare 因 TLS 问题不可用）")
    parser.add_argument("--output", type=str, default="./freqtrade-cn/data",
                       help="输出目录")
    parser.add_argument("--tushare-token", type=str, help="tushare token")
    parser.add_argument("--random", type=int, help="随机选择n只股票")
    
    args = parser.parse_args()
    
    # 确定标的列表
    if args.random:
        symbols = get_random_symbol(args.random)
    elif args.symbols:
        symbols = [s.strip() for s in args.symbols.split(',')]
    elif args.symbol:
        symbols = [args.symbol]
    else:
        print("未指定标的，随机选择1只")
        symbols = get_random_symbol(1)
    
    print(f"标的: {symbols}")
    print(f"时间范围: {args.start} ~ {args.end}")
    print(f"数据源: {args.source}")
    
    # 创建输出目录
    output_path = Path(args.output)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 下载数据
    for symbol in symbols:
        success = False
        
        if args.source == 'akshare':
            success = download_from_akshare(symbol, args.start, args.end, output_path)
        elif args.source == 'baostock':
            success = download_from_baostock(symbol, args.start, args.end, output_path)
        elif args.source == 'tushare':
            success = download_from_tushare(symbol, args.start, args.end, output_path, args.tushare_token)
        elif args.source == 'ccxt':
            success = download_crypto_data(symbol, args.start, args.end, output_path)
        
        # 如果失败，尝试其他数据源
        if not success and args.source != 'akshare':
            print(f"尝试使用 akshare 作为备选...")
            success = download_from_akshare(symbol, args.start, args.end, output_path)
        
        if not success:
            print(f"警告: {symbol} 数据下载失败")

if __name__ == "__main__":
    main()
