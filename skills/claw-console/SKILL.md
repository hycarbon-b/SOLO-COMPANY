---
name: claw_console
description: Claw 控制台交互工具 — 提供标准化脚本让 agent 与 Claw 自定义控制台交互。支持两种方式：(1) 通过 HTTP POST 在应用内打开 web tab 展示 URL 或本地文件；(2) 通过 HTTP POST 向指定会话注入独立 HTML div 块。触发词：打开页面、显示报告、注入卡片、发送到控制台、展示到 Claw。
user-invocable: true
---

# Claw 控制台交互

你可以通过两种标准化方式将内容推送到 Claw 自定义控制台：

| 交互类型 | 用途 | 脚本文件 | 目标端口 |
|----------|------|---------|---------|
| **A. 打开 Web Tab** | 在内嵌 webview 中渲染 URL 或本地 HTML 文件 | `scripts/open_tab.py` | `17899`（`OPEN_URL_HTTP_PORT`） |
| **B. 注入 HTML Div** | 将独立 div 块插入到指定会话的对话界面 | `scripts/inject_html.py` | `17900`（`INJECT_HTML_HTTP_PORT`） |

两个脚本均**零外部依赖**，仅使用 Python 标准库。

---

## 交互 A — 打开 Web Tab

**脚本**：[`scripts/open_tab.py`](scripts/open_tab.py)

向本机 HTTP 服务发送 `POST` 请求，Claw 立即打开新 web tab，在内嵌 webview 中渲染目标页面。

### URL 自动补全规则

| 输入 | 最终 URL |
|------|---------|
| `http://example.com` | `http://example.com`（原样） |
| `127.0.0.1:8080` | `http://127.0.0.1:8080` |
| `D:\reports\result.html` | `file:///D:/reports/result.html` |
| `D:/reports/result.html` | `file:///D:/reports/result.html` |
| `/home/chen/reports/x.html` | `file:////wsl.localhost/Ubuntu-22.04/home/chen/reports/x.html` |

> **WSL 路径说明**：当 agent 在 WSL 中运行、HTML 文件也在 WSL 内时，传入 Linux 绝对路径即可。脚本自动从 `/etc/os-release` 读取发行版名（也可通过 `WSL_DISTRO_NAME` 环境变量或 `--wsl-distro` 参数手动指定），转换为 Windows 可访问的 `file:////wsl.localhost/` UNC 文件 URL。默认发行版为 `Ubuntu-22.04`。

### 模块调用

```python
from scripts.open_tab import open_in_claw

# 打开本地回测报告（Windows 路径）
open_in_claw(r"D:\reports\backtest_result.html")

# 打开 WSL 内的 HTML 报告（Linux 路径自动转换）
open_in_claw("/home/chen/.openclaw/workspace/reports/report_600519.html")

# 指定 WSL 发行版（非默认 Ubuntu-22.04 时使用）
open_in_claw("/home/chen/report.html", wsl_distro="Debian")

# 打开已启动的本地服务
open_in_claw("127.0.0.1:8080/dashboard")

# 打开远程 URL
open_in_claw("https://example.com/report")
```

### CLI 调用

```bash
# 打开 WSL 内的 HTML 报告（发行版自动检测为 Ubuntu-22.04）
python scripts/open_tab.py /home/chen/.openclaw/workspace/reports/report_600519.html

# 指定 WSL 发行版
python scripts/open_tab.py /home/chen/report.html --wsl-distro Ubuntu-22.04

# 打开本地服务
python scripts/open_tab.py 127.0.0.1:8080

# 打开本地 HTML 文件（Windows 路径）
python scripts/open_tab.py "D:\reports\result.html"

# 打开远程页面
python scripts/open_tab.py https://example.com
```

### curl（调试用）

```bash
# 纯文本（最简单）
curl -X POST http://127.0.0.1:17899 \
     -H "Content-Type: text/plain" \
     -d "127.0.0.1:8080"

# JSON
curl -X POST http://127.0.0.1:17899 \
     -H "Content-Type: application/json" \
     -d '{"url": "http://localhost:8080/report"}'

# Form 表单
curl -X POST http://127.0.0.1:17899 \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "url=http%3A%2F%2Flocalhost%3A8080"
```

### 响应格式

```json
{ "ok": true,  "url": "http://127.0.0.1:8080" }
{ "ok": false, "error": "missing url" }
```

---

## 交互 B — 注入 HTML Div 块

**脚本**：[`scripts/inject_html.py`](scripts/inject_html.py)

向本机 HTTP 服务发送 `POST` 请求，将一段完整独立的 `<div>` 块插入到指定会话的对话界面。

`conversation_id` 由 Claw 在系统启动提示词中注入，格式为：
```
CLAW_CONVERSATION_ID: <id字符串>
```
agent 须从当前上下文中提取，**不可自行生成或猜测**。

### 模块调用

```python
from scripts.inject_html import inject_html_to_claw, build_info_card, build_alert_card

# conversation_id 从 Claw 启动提示词读取
CONV_ID = "<从上下文提取的 CLAW_CONVERSATION_ID>"

# 方式 1：直接传入 HTML 字符串
html = """<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;
               font-family:sans-serif;max-width:560px;background:#fff;">
  <h3 style="margin:0 0 8px;">600519.SH · 贵州茅台</h3>
  <p style="color:#10b981;font-weight:bold;">+2.35%</p>
</div>"""
inject_html_to_claw(html, CONV_ID)

# 方式 2：用便捷函数生成键值对信息卡片
html = build_info_card(
    title="贵州茅台 · 600519.SH",
    rows=[
        ("收盘价", "1,650.00"),
        ("涨跌幅", "+2.35%"),
        ("成交量", "1.2万手"),
    ],
    accent_color="#10b981",
    footer="数据来源：baostock · 2026-04-26",
)
inject_html_to_claw(html, CONV_ID)

# 方式 3：用便捷函数生成提示横幅
html = build_alert_card("回测完成，报告已生成到桌面。", level="success")
inject_html_to_claw(html, CONV_ID)
```

### CLI 调试

```powershell
# 传入 HTML 字符串
python scripts/inject_html.py conv_abc123 "<div style='padding:8px'><b>测试</b></div>"

# 从文件读取 HTML
python scripts/inject_html.py conv_abc123 --file card.html

# 从环境变量读取 conversation_id
$env:CLAW_CONVERSATION_ID = "conv_abc123"
python scripts/inject_html.py --env --file card.html
```

### 便捷构建函数速查

| 函数 | 用途 | 关键参数 |
|------|------|---------|
| `build_info_card(title, rows)` | 键值对信息卡片 | `accent_color`, `footer` |
| `build_alert_card(message)` | 提示/警报横幅 | `level`: `info`/`success`/`warning`/`error` |

### 请求字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `html` | string | ✅ | 完整独立的 `<div>` 块，内联 CSS，不依赖外部资源 |
| `conversation_id` | string | ✅ | Claw 启动提示词中注入的会话 ID，原样传递 |

### HTML div 规范

- **自包含**：所有样式使用 `style=""` 内联，不引用外部 CSS/JS
- **根节点唯一**：整个内容包裹在单个 `<div>` 内
- **无脚本**：不包含 `<script>` 标签
- **尺寸约束**：`max-width` 建议 `560px`，避免超出对话宽度
- **编码**：UTF-8，中文字符直接写入，无需转义
- **大小上限**：50 KB

### 响应格式

```json
{ "ok": true,  "conversation_id": "conv_abc123" }
{ "ok": false, "error": "missing html" }
{ "ok": false, "error": "missing conversation_id" }
```

---

## 环境变量速查

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OPEN_URL_HTTP_PORT` | `17899` | 交互 A：打开 web tab 的服务端口 |
| `INJECT_HTML_HTTP_PORT` | `17900` | 交互 B：注入 HTML div 的服务端口 |
| `CLAW_CONVERSATION_ID` | —— | 交互 B：可选，CLI 用 `--env` 读取 |

---

## Agent 使用指南

### 何时使用交互 A

- 回测报告、选股报告已生成为本地 HTML 文件 → 传绝对路径
- 已启动本地 HTTP 服务（Flask、FastAPI 等）→ 传 `host:port`
- 需要展示完整交互式页面时

### 何时使用交互 B

- 输出简洁的股票卡片、数据摘要、警报提示
- 不需要跳转页面，直接在对话中嵌入富文本结果
- 配合其他 skill（如 `stock-card-output`）将生成的 div 直接推送

---

## 注意事项

- 两个 HTTP 服务仅监听 `127.0.0.1`，不对外暴露，无需鉴权
- 请求超时固定为 **5 秒**，超时不重试（避免阻塞主流程）
- 交互 B 的 `conversation_id` 必须从 Claw 启动提示词中读取，**不可自行生成**
- 本地文件路径在 Windows 下自动转换（`open_tab.py` 已内置处理）