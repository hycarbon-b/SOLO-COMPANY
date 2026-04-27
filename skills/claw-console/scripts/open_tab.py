"""
open_tab.py — 在 Claw 应用内打开新 Web Tab

用法：
    python open_tab.py <url_or_path>
    python open_tab.py http://localhost:8080/report
    python open_tab.py 127.0.0.1:8080
    python open_tab.py "D:\\reports\\backtest_result.html"
    python open_tab.py /home/chen/.openclaw/reports/report.html
    python open_tab.py /home/chen/.openclaw/reports/report.html --wsl-distro Ubuntu-22.04

WSL 路径转换说明：
    当传入 Linux 绝对路径（如 /home/...）时，脚本自动转换为 Windows 可访问的
    WSL UNC 文件 URL（file:////wsl.localhost/Ubuntu-22.04/home/...）。
    WSL 发行版名称默认从 /etc/os-release 读取；若无法读取则默认为 "Ubuntu-22.04"。
    可用 --wsl-distro <名称> 参数手动指定发行版。

环境变量：
    OPEN_URL_HTTP_PORT  — Claw HTTP 服务端口，默认 17899
    WSL_DISTRO_NAME     — WSL 发行版名称，可覆盖自动检测结果
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


# ── WSL 发行版检测 ─────────────────────────────────────────────────────────────

def _detect_wsl_distro() -> str:
    """从环境变量或 /etc/os-release 读取 WSL 发行版名，默认 'Ubuntu-22.04'。"""
    env_val = os.environ.get("WSL_DISTRO_NAME", "").strip()
    if env_val:
        return env_val
    try:
        with open("/etc/os-release", encoding="utf-8") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    # 尝试从 PRETTY_NAME 提取版本，如 Ubuntu 22.04
                    name = line.split("=", 1)[1].strip().strip('"')
                    if "ubuntu" in name.lower() and "22.04" in name:
                        return "Ubuntu-22.04"
                elif line.startswith("NAME="):
                    name = line.split("=", 1)[1].strip().strip('"')
                    if "ubuntu" in name.lower():
                        return "Ubuntu-22.04"  # 默认返回 Ubuntu-22.04
    except OSError:
        pass
    return "Ubuntu-22.04"


# ── URL 规范化 ────────────────────────────────────────────────────────────────

def normalize_url(raw: str, wsl_distro: str | None = None) -> str:
    """将各种输入形式统一为合法 URL。

    规则：
        - 已有 http:// / https:// / file:// → 原样返回
        - Windows 绝对路径 (C:\\... 或 C:/...)  → file:///C:/...
        - Linux/WSL 绝对路径 (/home/...)        → file:////wsl.localhost/<distro>/...
        - 其余（host:port、domain）             → 加 http:// 前缀
    """
    raw = raw.strip()
    if not raw:
        raise ValueError("url 不能为空")

    # 已有协议头
    if raw.startswith(("http://", "https://", "file://")):
        return raw

    # Windows 绝对路径：单字母盘符 + 冒号
    if len(raw) >= 2 and raw[1] == ":" and raw[0].isalpha():
        posix = raw.replace("\\", "/")
        return f"file:///{posix}"

    # Linux/WSL 绝对路径 → Windows UNC file URL
    # e.g. /home/chen/reports/x.html → file:////wsl.localhost/Ubuntu-22.04/home/chen/reports/x.html
    if raw.startswith("/"):
        distro = wsl_distro or _detect_wsl_distro()
        return f"file:////wsl.localhost/{distro}{raw}"

    # 其余一律加 http://
    return f"http://{raw}"



# ── HTTP 请求 ─────────────────────────────────────────────────────────────────

def open_in_claw(url_or_path: str, wsl_distro: str | None = None) -> dict:
    """向 Claw 发送 POST 请求，在应用内打开新 web tab。

    Args:
        url_or_path: HTTP/HTTPS URL、host:port、Windows 文件路径、或 WSL Linux 路径
        wsl_distro:  WSL 发行版名称（如 "Ubuntu"），仅在传入 Linux 路径时使用。
                     None 时自动从 /etc/os-release 或 WSL_DISTRO_NAME 环境变量检测。

    Returns:
        Claw 返回的 JSON 响应字典，如 {"ok": true, "url": "..."}

    Raises:
        ValueError: url_or_path 为空
        urllib.error.URLError: 网络连接失败（Claw 未启动）
        RuntimeError: Claw 返回 ok=false
    """
    final_url = normalize_url(url_or_path, wsl_distro=wsl_distro)

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
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        print("错误: 必须提供 url 或文件路径。", file=sys.stderr)
        sys.exit(1)

    # 解析可选 --wsl-distro <name>
    wsl_distro: str | None = None
    if "--wsl-distro" in args:
        idx = args.index("--wsl-distro")
        if idx + 1 >= len(args):
            print("错误: --wsl-distro 需要提供发行版名称。", file=sys.stderr)
            sys.exit(1)
        wsl_distro = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    raw = " ".join(args)

    try:
        result = open_in_claw(raw, wsl_distro=wsl_distro)
        print(f"[Claw] 已打开: {result.get('url')}")
    except (ValueError, RuntimeError) as e:
        print(f"[Claw] 错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[Claw] 连接失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
