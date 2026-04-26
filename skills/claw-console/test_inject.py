#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
快速测试脚本：向 Claw 注入测试 HTML
"""

import sys
sys.path.insert(0, r'd:\Worksapce_tradingbase\SOLO-COMPANY\skills\claw-console\scripts')

from inject_html import inject_html_to_claw, build_info_card

# 测试 conversation_id
CONV_ID = "14020fc9-a005-4f88-88ff-8c4b96d8210e"

# 方式 1：简单 div
simple_html = """<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px;
                      font-family:sans-serif;background:#f0f9ff;max-width:400px;">
  <h3 style="margin:0 0 12px;color:#1e40af;font-size:16px;">✅ 调度器测试成功</h3>
  <p style="margin:0;color:#1e3a8a;font-size:14px;">
    这条消息从 dispatcher 注入到 Claw 控制台。<br/>
    日期：2026-04-26
  </p>
</div>"""

print(f"[测试] 向 conversation_id {CONV_ID} 注入 HTML...")

try:
    result = inject_html_to_claw(simple_html, CONV_ID)
    print(f"[成功] Claw 响应: {result}")
except Exception as e:
    print(f"[失败] {e}")
    sys.exit(1)

# 方式 2：使用便捷函数构建卡片
print("\n[测试] 构建信息卡片...")
info_html = build_info_card(
    title="市场研究员 · 选股结果",
    rows=[
        ("选出股票", "3 只"),
        ("平均涨幅", "+2.15%"),
        ("主要板块", "科技 / 半导体"),
    ],
    accent_color="#2563eb",
    footer="数据来源：baostock · 2026-04-26"
)

try:
    result = inject_html_to_claw(info_html, CONV_ID)
    print(f"[成功] Claw 响应: {result}")
except Exception as e:
    print(f"[失败] {e}")
    sys.exit(1)

print("\n✅ 所有测试通过！")
