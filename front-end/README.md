# front-end

基于 **React + Vite + Electron** 构建的量化交易桌面客户端。

---

## 代码结构

```
front-end/
├── electron/
│   ├── main.cjs        # Electron 主进程：窗口管理、IPC、HTTP 控制服务
│   └── preload.cjs     # 预加载脚本：向渲染进程暴露 electronAPI
├── src/
│   ├── main.tsx        # React 入口
│   ├── app/
│   │   ├── App.tsx                 # 根组件：Tab 状态管理、全宽 TabBar
│   │   ├── fakeChatData.ts         # 开发用假数据
│   │   ├── components/             # 页面与功能组件
│   │   │   ├── MainContent.tsx     # 内容区路由（根据 activeTab 渲染对应页面）
│   │   │   ├── Sidebar.tsx         # 左侧导航栏
│   │   │   ├── ChatPanel.tsx       # 聊天消息面板
│   │   │   ├── RightPanelContainer.tsx  # 右侧 Agent 监控面板
│   │   │   ├── AgentPage.tsx       # Agent 列表与发起对话
│   │   │   ├── MarketPage.tsx      # 行情页
│   │   │   ├── TradingPage.tsx     # 交易管理页
│   │   │   ├── FilesPage.tsx       # 文件库页
│   │   │   ├── SchedulePage.tsx    # 定时任务页
│   │   │   ├── UsagePage.tsx       # 用量统计页
│   │   │   └── ui/                 # shadcn/ui 基础组件
│   │   ├── config/
│   │   │   ├── agentsConfig.ts     # Agent 角色配置（名称、systemPrompt）
│   │   │   ├── chatConfig.json     # 默认 systemPrompt 等聊天配置
│   │   │   └── workerConfig.ts     # Worker 配置
│   │   └── workers/
│   │       └── information.json    # Worker 信息定义
│   ├── services/
│   │   └── openclawGateway.ts      # WebSocket 连接 OpenClaw Gateway（聊天核心）
│   ├── types/
│   │   ├── discussion.ts           # DiscussionThread 类型
│   │   └── electron.d.ts           # electronAPI 类型声明
│   └── styles/                     # 全局样式
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 部署方式

### 开发模式（Vite + Electron 同步启动）

```bash
cd front-end
npm install
npm run electron:dev
```

等价于同时运行 `vite`（端口 5173）和 `electron .`。

### 仅浏览器预览

```bash
npm run dev
# 访问 http://localhost:5173
```

### 打包为桌面安装包

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# 全平台
npm run electron:build:all
```

产物输出到 `dist/`（前端静态文件）和 `release/`（Electron 安装包）。

---

## 通过 HTTP POST 在应用内打开网页 Tab

Electron 主进程启动时会在本机监听一个 HTTP 服务，默认端口 **17899**（可通过环境变量 `OPEN_URL_HTTP_PORT` 覆盖）。

任何本地程序（脚本、策略回测工具、另一个进程等）向该端口发送 `POST` 请求，即可让应用立即打开一个新的 **web tab** 并在内嵌 `webview` 中渲染目标网页。

### 请求格式

支持三种 `Content-Type`：

#### 1. 纯文本（最简单）

```bash
curl -X POST http://127.0.0.1:17899 \
     -H "Content-Type: text/plain" \
     -d "127.0.0.1:8080"
```

请求体直接写 URL 或 `host:port`，会自动补全 `http://` 前缀。

#### 2. JSON

```bash
curl -X POST http://127.0.0.1:17899 \
     -H "Content-Type: application/json" \
     -d '{"url": "http://localhost:8080/report"}'
```

JSON 中支持 `url`、`target`、`address` 三个字段名。

#### 3. Form 表单

```bash
curl -X POST http://127.0.0.1:17899 \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "url=http%3A%2F%2Flocalhost%3A8080"
```

### URL 自动补全规则

| 输入                          | 最终 URL                         |
|-------------------------------|----------------------------------|
| `http://example.com`          | `http://example.com`（原样）     |
| `127.0.0.1:8080`              | `http://127.0.0.1:8080`          |
| `127.0.0.1:8080/dashboard`    | `http://127.0.0.1:8080/dashboard`|
| `example.com`                 | `http://example.com`             |

### 响应

```json
{ "ok": true, "url": "http://127.0.0.1:8080" }
```

失败时：

```json
{ "ok": false, "error": "missing url" }
```

### Python 示例

```python
import requests

requests.post(
    "http://127.0.0.1:17899",
    json={"url": "http://127.0.0.1:8888/lab"}  # 打开 Jupyter Lab
)
```

### 工作流程

```
外部程序
  └─ POST http://127.0.0.1:17899  { "url": "..." }
        │
        ▼
  Electron 主进程 (main.cjs)
  解析 URL → mainWindow.webContents.send('open-web-tab', { url })
        │
        ▼
  preload.cjs  (IPC bridge)
  ipcRenderer.on('open-web-tab') → callback({ url })
        │
        ▼
  App.tsx  handleOpenTab('web', title, undefined, url)
        │
        ▼
  新 Tab 渲染 <webview src={url} />
```

---

## 通过 HTTP POST 向消息流注入 HTML 卡片

Electron 主进程启动时会在本机监听另一个 HTTP 服务，默认端口 **17900**（可通过环境变量 `INJECT_HTML_HTTP_PORT` 覆盖）。

任何本地程序（选股工具、数据分析脚本、策略报告等）可以向该端口发送 `POST` 请求，将生成的 HTML 卡片直接注入到应用内指定会话的消息流中。

### 使用场景

- 选股报告卡片（使用 `stock-card-output2` 生成）
- 数据分析可视化（图表、表格）
- 策略回测报告
- 实时行情快照
- 任何自定义 HTML 展示内容

### 请求格式

支持 JSON 和 Form 两种格式：

#### 1. JSON（推荐）

```bash
curl -X POST http://127.0.0.1:17900 \
     -H "Content-Type: application/json" \
     -d '{
       "html": "<div style=\"padding:20px; background:#f5f5f5; border-radius:8px;\">选股结果卡片</div>",
       "conversation_id": "conv_12345"
     }'
```

#### 2. Form 表单

```bash
curl -X POST http://127.0.0.1:17900 \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "html=...&conversation_id=conv_12345"
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `html` | string | ✓ | HTML 内容（会清理 script 标签以防XSS） |
| `conversation_id` | string | ✓ | 目标会话 ID，消息会被插入该会话的消息流 |

### 响应

成功：

```json
{
  "ok": true,
  "conversation_id": "conv_12345"
}
```

失败：

```json
{
  "ok": false,
  "error": "missing html or conversation_id"
}
```

### Python 示例

```python
import requests

# 生成选股 HTML 卡片
from pathlib import Path
html_content = Path('stock-card-output2/output/report.html').read_text()

# 注入到指定会话
requests.post(
    'http://127.0.0.1:17900',
    json={
        'html': html_content,
        'conversation_id': 'conv_abc123'
    }
)
```

### 与 stock-card-output2 配合使用

```bash
# 1. 生成选股报告 HTML
cd skills/stock-card-output2
python card_script.py -i stock_data.json -o output/report.html

# 2. Python 脚本读取并注入
import requests
from pathlib import Path

html = Path('output/report.html').read_text()
requests.post(
    'http://127.0.0.1:17900',
    json={'html': html, 'conversation_id': 'conv_stock_pick_001'}
)
```

### 安全性说明

- 所有注入的 HTML 会自动清理 `<script>` 标签，防止任意代码执行
- 只允许从 `127.0.0.1` 访问（本机），不支持跨网络请求
- 后期可通过环境变量 `INJECT_HTML_HTTP_PORT` 修改端口

### 工作流程

```
外部程序（Agent / 选股工具）
  └─ 生成 HTML（选股卡片 / 分析报告）
        │
        ├─ POST http://127.0.0.1:17900
        └─ { "html": "...", "conversation_id": "..." }
             │
             ▼
  Electron 主进程 (main.cjs)
  清理 HTML（移除 script 标签）
             │
             ├─ mainWindow.webContents.send('inject-html', { html, conversationId })
             │
             ▼
  preload.cjs  (IPC bridge)
  ipcRenderer.on('inject-html') → callback({ html, conversationId })
             │
             ▼
  MainContent.tsx  监听事件
  创建 Message { type: 'html', content, role: 'assistant', ... }
  添加到 messagesMap[conversationId]
             │
             ▼
  ChatPanel.tsx  渲染消息
  message.type === 'html'
  <div dangerouslySetInnerHTML={{ __html: content }} />
             │
             ▼
  消息流中显示 HTML 卡片
```
