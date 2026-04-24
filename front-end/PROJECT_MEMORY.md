# Front-end 项目记忆文档

> 本文档为 AI Code Agent 提供项目上下文，帮助快速理解和修改代码。
> 最后更新：2026-04-24

---

## 📋 项目概述

### 基本信息

| 项目属性 | 值 |
|---------|-----|
| **项目名称** | Trading Application |
| **技术栈** | React 18 + TypeScript + Vite + Electron |
| **UI 框架** | shadcn/ui (Radix UI) + Tailwind CSS 4 |
| **状态管理** | React useState/useEffect (无全局状态库) |
| **路由** | react-router 7.13.0 |
| **桌面框架** | Electron 41.3.0 |

### 项目结构

```
front-end/
├── electron/           # Electron 主进程
│   ├── main.cjs        # 主进程入口，窗口管理 + IPC handlers
│   └── preload.cjs     # 预加载脚本，暴露安全 API
├── src/
│   ├── main.tsx        # React 应用入口
│   ├── app/
│   │   ├── App.tsx     # 根组件，布局和任务状态管理
│   │   ├── fakeChatData.ts  # 模拟数据
│   │   └── components/ # 页面和组件
│   │       ├── ui/     # shadcn/ui 基础组件
│   │       └── figma/  # Figma 相关组件
│   ├── services/       # 服务层 (API 调用)
│   │   └── openclawGateway.ts  # OpenClaw Gateway WebSocket 连接
│   ├── styles/         # 样式文件
│   │   ├── index.css   # 主样式入口
│   │   ├── tailwind.css
│   │   ├── theme.css   # CSS 变量主题
│   │   └── fonts.css
│   ├── types/          # TypeScript 类型定义
│   │   ├── discussion.ts
│   │   └── electron.d.ts
│   └── imports/        # 静态资源 (图片)
├── docs/
│   └── PAGES_COMPONENTS.md  # 页面组件说明
├── index.html          # HTML 入口
├── vite.config.ts      # Vite 配置
├── postcss.config.mjs  # PostCSS 配置
└── package.json        # 依赖配置
```

---

## 🚀 启动命令

```bash
# 开发模式 (Web)
npm run dev

# 开发模式 (Electron)
npm run electron:dev

# 构建 Web
npm run build

# 构建 Electron (Windows)
npm run electron:build:win

# 构建 Electron (Mac)
npm run electron:build:mac

# 构建 Electron (Linux)
npm run electron:build:linux
```

---

## 🏗️ 核心架构

### 1. 布局结构

```
App.tsx
└── PanelGroup (react-resizable-panels)
    ├── Panel (15%) → Sidebar.tsx (左侧导航)
    ├── PanelResizeHandle
    └── Panel (85%) → MainContent.tsx (主内容区)
        ├── Header.tsx
        └── 内容区域 (根据路由/状态切换)
            ├── ChatPanel.tsx (聊天)
            ├── AgentPage.tsx (Agent 列表)
            ├── FilesPage.tsx (文件库)
            ├── TradingPage.tsx (交易)
            ├── MarketPage.tsx (市场)
            ├── SchedulePage.tsx (定时任务)
            ├── UsagePage.tsx (用量统计)
            └── AboutPage.tsx (系统信息)
```

### 2. 状态管理

**App.tsx 中的核心状态：**

```typescript
// 任务列表状态
const [tasks, setTasks] = useState<Task[]>([]);

// 当前选中任务 ID
const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

// 左侧菜单选中项
const [selectedMenu, setSelectedMenu] = useState<string>('new-work');
```

**Task 类型定义：**

```typescript
interface Task {
  id: string;
  title: string;
  time: string;
  pinned?: boolean;
  status?: 'idle' | 'working' | 'completed' | 'error';
  hasUnread?: boolean;
}
```

### 3. Electron IPC 通信

**主进程暴露的 API：**

```typescript
// preload.cjs 暴露的 API
window.electronAPI = {
  getDiscussions: () => Promise<DiscussionEntry[]>,
  // 可扩展更多 IPC 方法
};
```

**IPC 通道：**

| 通道名 | 方向 | 功能 |
|--------|------|------|
| `discussion:list` | renderer → main | 获取 discussion 列表 |

### 4. 数据流

```
外部数据源
    ↓
Electron Main Process (IPC Handler)
    ↓
Preload Script (electronAPI)
    ↓
React Component (window.electronAPI.xxx())
    ↓
UI 渲染
```

**Discussion 数据流：**

```
d:\code\temp\discussion\  (JSON 文件)
    ↓
main.cjs (读取 + 配对 start/end JSON)
    ↓
IPC: discussion:list
    ↓
AgentPage.tsx / RightPanelContainer.tsx
    ↓
DiscussionCard.tsx (渲染)
```

---

## 📦 依赖说明

### UI 组件库

| 库 | 用途 |
|----|------|
| `@radix-ui/*` | shadcn/ui 的基础组件 |
| `lucide-react` | 图标库 |
| `recharts` | 图表库 |
| `react-resizable-panels` | 可调整大小的面板 |
| `sonner` | Toast 通知 |
| `motion` | 动画库 |
| `cmdk` | Command Palette |

### 工具库

| 库 | 用途 |
|----|------|
| `clsx` + `tailwind-merge` | 类名合并 |
| `class-variance-authority` | 组件变体管理 |
| `date-fns` | 日期处理 |
| `react-hook-form` | 表单管理 |

### Electron 相关

| 库 | 用途 |
|----|------|
| `electron` | 桌面应用框架 |
| `electron-builder` | 打包工具 |

---

## 🎨 样式系统

### Tailwind CSS 配置

- 使用 Tailwind CSS 4.x
- 配置文件：`vite.config.ts` 中集成 `@tailwindcss/vite`

### CSS 变量主题

```css
/* theme.css 中定义 */
--background
--foreground
--primary
--secondary
--muted
--accent
--destructive
--border
--ring
/* 等 shadcn/ui 标准变量 */
```

### 暗色模式

- 使用 `next-themes` 进行主题切换
- 在根元素添加 `class="dark"` 启用暗色模式

---

## 📄 页面组件说明

### 页面列表

| 组件 | 路由/条件 | 功能 |
|------|-----------|------|
| `AboutPage` | selectedMenu === 'about' | 系统信息 (OS, 硬件, 设备码) |
| `AgentPage` | selectedMenu === 'agent' | Agent/Discussion 列表 |
| `FilesPage` | selectedMenu === 'files' | 文件库 (文档/表格/图片/视频/策略) |
| `TradingPage` | selectedMenu === 'trading' | 交易记录 (模拟盘/实盘) |
| `MarketPage` | selectedMenu === 'market' | 市场行情图表 |
| `SchedulePage` | selectedMenu === 'schedule' | 定时任务管理 |
| `UsagePage` | selectedMenu === 'usage' | Token 消耗统计 |
| `ChatPanel` | currentTaskId !== null | 聊天界面 |

### 核心组件

| 组件 | 功能 |
|------|------|
| `Sidebar` | 左侧导航菜单，显示任务列表和菜单项 |
| `MainContent` | 主内容区，根据状态渲染不同页面 |
| `Header` | 顶部标题栏 |
| `RightPanelContainer` | 右侧面板，文件列表 + Agent 状态 |
| `GatewayStatusPanel` | Gateway 连接状态显示 |
| `DiscussionCard` | Discussion 记录卡片 |

---

## 🔧 开发规范

### 组件开发

1. **使用 TypeScript**：所有组件使用 `.tsx` 扩展名
2. **函数组件**：使用函数组件 + hooks
3. **类型导出**：在组件文件中导出相关类型
4. **shadcn/ui**：优先使用 `components/ui/` 中的组件

### 样式规范

1. **Tailwind 优先**：使用 Tailwind 类名，避免内联样式
2. **CSS 变量**：使用 CSS 变量管理主题颜色
3. **响应式**：使用 Tailwind 响应式前缀 (sm:, md:, lg:)
4. **类名合并**：使用 `cn()` 函数合并类名

### 状态管理

1. **本地状态**：使用 `useState` 管理组件内状态
2. **提升状态**：需要跨组件共享时提升到共同父组件
3. **派生状态**：避免重复状态，使用计算值

### Electron IPC

1. **安全通信**：通过 `preload.cjs` 暴露 API，不直接使用 `ipcRenderer`
2. **类型定义**：在 `types/electron.d.ts` 中定义 API 类型
3. **错误处理**：IPC 调用需要 try-catch 处理

---

## 🐛 常见问题

### 1. Electron 启动失败

```bash
# 检查端口占用
netstat -ano | findstr :5173

# 杀死占用进程
taskkill /PID <pid> /F
```

### 2. 依赖安装问题

```bash
# 清除缓存重新安装
rm -rf node_modules
npm install
```

### 3. 类型错误

- 检查 `tsconfig.json` 配置
- 确保类型定义文件被正确引用

### 4. 样式不生效

- 检查 Tailwind 类名是否正确
- 确保 `@tailwindcss/vite` 插件已配置

---

## 📝 AI Agent 行为规范

### 修改代码时

1. **保持项目可运行**：修改后确保 `npm run dev` 能正常启动
2. **最小改动原则**：只修改必要的代码
3. **类型安全**：保持 TypeScript 类型完整
4. **样式一致**：遵循现有样式规范

### 错误处理

1. **自动修复**：遇到错误自动尝试修复
2. **不要求用户调试**：用简单语言告知用户正在修复
3. **循环修复**：修复后重启 dev server，直到成功

### 添加新功能时

1. **组件位置**：页面组件放 `components/`，基础组件放 `components/ui/`
2. **类型定义**：在 `types/` 目录添加类型
3. **服务层**：API 调用放 `services/` 目录
4. **IPC 通道**：需要 Electron 功能时在 `main.cjs` 和 `preload.cjs` 添加

---

## 🔗 相关文档

- [页面组件说明](./docs/PAGES_COMPONENTS.md)
- [环境变量示例](./.env.example)
- [Vite 配置](./vite.config.ts)

---

## 📊 项目统计

| 指标 | 数量 |
|------|------|
| 页面组件 | 7 |
| UI 组件 | 40+ |
| 服务层文件 | 1 |
| 类型定义文件 | 2 |
| Electron 进程 | 2 |

---

*本文档由 AI 自动生成，如有更新请同步修改。*
