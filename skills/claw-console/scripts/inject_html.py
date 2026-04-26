"""
inject_html.py — 向 Claw 指定会话注入独立 HTML div 块

用法（模块调用，agent 主要以此方式使用）：
    from inject_html import inject_html_to_claw
    inject_html_to_claw(html=div_string, conversation_id=CONV_ID)

用法（CLI 调试）：
    python inject_html.py <conversation_id> <html_string>
    python inject_html.py <conversation_id> --file <path_to_html_file>

    示例：
        python inject_html.py conv_abc123 "<div style='padding:8px'><b>测试</b></div>"
        python inject_html.py conv_abc123 --file card.html

环境变量：
    INJECT_HTML_HTTP_PORT   — Claw HTTP 服务端口，默认 17900
    CLAW_CONVERSATION_ID    — 可选，未在 CLI 指定时从此环境变量读取
"""

from __future__ import annotations

import os
import sys
import json
import urllib.request
import urllib.error


# ── 配置 ──────────────────────────────────────────────────────────────────────

CLAW_HOST = "127.0.0.1"
INJECT_PORT = int(os.environ.get("INJECT_HTML_HTTP_PORT", 17900))
TIMEOUT_SEC = 5
MAX_HTML_BYTES = 50 * 1024  # 50 KB 上限


# ── 核心函数 ──────────────────────────────────────────────────────────────────

def inject_html_to_claw(html: str, conversation_id: str) -> dict:
    """向 Claw 指定会话注入一个独立的 HTML div 块。

    Args:
        html:            完整独立的 <div>...</div> 字符串，使用内联 CSS。
                         不得包含 <script>、外部 CSS 引用或多个根节点。
        conversation_id: 当前会话 ID，必须从 Claw 启动提示词中读取，
                         格式如 "CLAW_CONVERSATION_ID: <id>"，
                         不可自行生成或猜测。

    Returns:
        Claw 返回的 JSON 响应字典，如 {"ok": true, "conversation_id": "..."}

    Raises:
        ValueError:            html 或 conversation_id 为空，或 html 超过 50 KB
        urllib.error.URLError: 网络连接失败（Claw 未启动）
        RuntimeError:          Claw 返回 ok=false
    """
    if not html or not html.strip():
        raise ValueError("html 不能为空")
    if not conversation_id or not conversation_id.strip():
        raise ValueError(
            "conversation_id 不能为空。\n"
            "请从 Claw 启动提示词中读取 'CLAW_CONVERSATION_ID: <id>'，"
            "不可自行生成。"
        )

    html_bytes = html.encode("utf-8")
    if len(html_bytes) > MAX_HTML_BYTES:
        raise ValueError(
            f"HTML 内容超过 {MAX_HTML_BYTES // 1024} KB 上限 "
            f"（当前 {len(html_bytes) // 1024} KB），请精简后再注入。"
        )

    payload = json.dumps(
        {"html": html, "conversation_id": conversation_id.strip()},
        ensure_ascii=False,
    ).encode("utf-8")

    endpoint = f"http://{CLAW_HOST}:{INJECT_PORT}"

    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.URLError as e:
        raise urllib.error.URLError(
            f"无法连接到 Claw（{endpoint}）: {e.reason}\n"
            "请确认 Claw 正在运行，且端口与 INJECT_HTML_HTTP_PORT 一致。"
        ) from e

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise RuntimeError(f"Claw 响应不是合法 JSON: {body!r}")

    if not data.get("ok"):
        raise RuntimeError(f"Claw 拒绝请求: {data.get('error', '未知错误')}")

    return data


# ── 便捷构建函数 ───────────────────────────────────────────────────────────────

def build_info_card(
    title: str,
    rows: list[tuple[str, str]],
    *,
    accent_color: str = "#3b82f6",
    footer: str = "",
) -> str:
    """构建一个标准信息卡片 div。

    Args:
        title:        卡片标题
        rows:         [(label, value), ...] 键值对列表
        accent_color: 标题左侧色条颜色（默认蓝色）
        footer:       可选底部文字

    Returns:
        完整的 <div> 字符串，可直接传入 inject_html_to_claw()

    示例：
        html = build_info_card(
            "贵州茅台 · 600519.SH",
            [("收盘价", "1,650.00"), ("涨跌幅", "+2.35%"), ("成交量", "1.2万手")],
            accent_color="#10b981",
        )
    """
    rows_html = "".join(
        f"""<div style="display:flex;justify-content:space-between;
                        padding:6px 0;border-bottom:1px solid #f3f4f6;">
              <span style="color:#6b7280;font-size:13px;">{label}</span>
              <span style="color:#111827;font-size:13px;font-weight:500;">{value}</span>
            </div>"""
        for label, value in rows
    )

    footer_html = (
        f'<p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">{footer}</p>'
        if footer
        else ""
    )

    return f"""<div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;
                           font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                           max-width:560px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,.08);">
  <h3 style="margin:0 0 12px;padding-left:10px;border-left:4px solid {accent_color};
             color:#1f2937;font-size:15px;font-weight:600;">{title}</h3>
  {rows_html}
  {footer_html}
</div>"""


def build_alert_card(
    message: str,
    *,
    level: str = "info",
) -> str:
    """构建一个简单的提示卡片 div。

    Args:
        message: 提示内容（支持 HTML 片段）
        level:   "info" | "success" | "warning" | "error"

    Returns:
        完整的 <div> 字符串
    """
    palette = {
        "info":    ("#eff6ff", "#3b82f6", "#1d4ed8"),
        "success": ("#f0fdf4", "#22c55e", "#15803d"),
        "warning": ("#fffbeb", "#f59e0b", "#b45309"),
        "error":   ("#fef2f2", "#ef4444", "#b91c1c"),
    }
    bg, border, text = palette.get(level, palette["info"])

    return f"""<div style="border:1px solid {border};border-radius:8px;padding:12px 16px;
                           background:{bg};font-family:-apple-system,BlinkMacSystemFont,
                           'Segoe UI',sans-serif;max-width:560px;">
  <p style="margin:0;color:{text};font-size:14px;">{message}</p>
</div>"""


# ── CLI 入口 ──────────────────────────────────────────────────────────────────

def main() -> None:
    args = sys.argv[1:]

    if not args:
        print(__doc__)
        print("错误: 请提供 conversation_id 参数。", file=sys.stderr)
        sys.exit(1)

    conversation_id = args[0]

    # 支持从环境变量读取 conversation_id
    if conversation_id == "--env":
        conversation_id = os.environ.get("CLAW_CONVERSATION_ID", "")
        if not conversation_id:
            print(
                "错误: 环境变量 CLAW_CONVERSATION_ID 未设置。",
                file=sys.stderr,
            )
            sys.exit(1)
        args = args[1:]
    else:
        args = args[1:]

    # 从文件读取 HTML
    if args and args[0] == "--file":
        if len(args) < 2:
            print("错误: --file 后需要提供文件路径。", file=sys.stderr)
            sys.exit(1)
        try:
            with open(args[1], encoding="utf-8") as f:
                html = f.read()
        except OSError as e:
            print(f"错误: 无法读取文件 {args[1]}: {e}", file=sys.stderr)
            sys.exit(1)
    elif args:
        html = " ".join(args)
    else:
        print("错误: 请提供 HTML 字符串或 --file <path>。", file=sys.stderr)
        sys.exit(1)

    try:
        result = inject_html_to_claw(html, conversation_id)
        print(f"[Claw] HTML 已注入到会话: {result.get('conversation_id')}")
    except (ValueError, RuntimeError) as e:
        print(f"[Claw] 错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[Claw] 连接失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
