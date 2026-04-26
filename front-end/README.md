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
