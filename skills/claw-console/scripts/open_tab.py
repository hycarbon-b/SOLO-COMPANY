"""
open_tab.py — 在 Claw 应用内打开新 Web Tab

用法：
    python open_tab.py <url_or_path>
    python open_tab.py http://localhost:8080/report
    python open_tab.py 127.0.0.1:8080
    python open_tab.py "D:\\reports\\backtest_result.html"

环境变量：
    OPEN_URL_HTTP_PORT  — Claw HTTP 服务端口，默认 17899
"""

from __future__ import annotations

import os
import sys
import json
import urllib.request
import urllib.error


# ── 配置 ──────────────────────────────────────────────────────────────────────

CLAW_HOST = "127.0.0.1"
CLAW_PORT = int(os.environ.get("OPEN_URL_HTTP_PORT", 17899))
TIMEOUT_SEC = 5


# ── URL 规范化 ────────────────────────────────────────────────────────────────

def normalize_url(raw: str) -> str:
    """将各种输入形式统一为合法 URL。

    规则：
        - 已有 http:// / https:// / file:/// → 原样返回
        - Windows 绝对路径 (C:\\... 或 C:/...)  → file:///C:/...
        - 其余（host:port、domain）             → 加 http:// 前缀
    """
    raw = raw.strip()
    if not raw:
        raise ValueError("url 不能为空")

    # 已有协议头
    if raw.startswith(("http://", "https://", "file:///")):
        return raw

    # Windows 绝对路径：单字母盘符 + 冒号
    if len(raw) >= 2 and raw[1] == ":" and raw[0].isalpha():
        posix = raw.replace("\\", "/")
        return f"file:///{posix}"

    # 其余一律加 http://
    return f"http://{raw}"


# ── HTTP 请求 ─────────────────────────────────────────────────────────────────

def open_in_claw(url_or_path: str) -> dict:
    """向 Claw 发送 POST 请求，在应用内打开新 web tab。

    Args:
        url_or_path: HTTP/HTTPS URL、host:port、或本地文件绝对路径

    Returns:
        Claw 返回的 JSON 响应字典，如 {"ok": true, "url": "..."}

    Raises:
        ValueError: url_or_path 为空
        urllib.error.URLError: 网络连接失败（Claw 未启动）
        RuntimeError: Claw 返回 ok=false
    """
    final_url = normalize_url(url_or_path)

    payload = json.dumps({"url": final_url}).encode("utf-8")
    endpoint = f"http://{CLAW_HOST}:{CLAW_PORT}"

    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.URLError as e:
        raise urllib.error.URLError(
            f"无法连接到 Claw（{endpoint}）: {e.reason}\n"
            "请确认 Claw 正在运行，且端口与 OPEN_URL_HTTP_PORT 一致。"
        ) from e

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise RuntimeError(f"Claw 响应不是合法 JSON: {body!r}")

    if not data.get("ok"):
        raise RuntimeError(f"Claw 拒绝请求: {data.get('error', '未知错误')}")

    return data


# ── CLI 入口 ──────────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        print("错误: 必须提供 url 或文件路径。", file=sys.stderr)
        sys.exit(1)

    raw = " ".join(sys.argv[1:])  # 支持路径中含空格（但建议用引号）

    try:
        result = open_in_claw(raw)
        print(f"[Claw] 已打开: {result.get('url')}")
    except (ValueError, RuntimeError) as e:
        print(f"[Claw] 错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[Claw] 连接失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
