# OPUS-OPC 一人公司 Agent 工作台 — 开发进度

> **可中断恢复文档**：每完成一个里程碑后更新此文件，下次启动时从「下一步」继续。

---

## 1. 产品定位 (Product Positioning)

**目标**：为「一人公司」运营者提供 AI Agent 驱动的内容创作 → 分发 → 直播推流 一体化工作台。

**用户画像**：单兵作战的内容创作者 / 独立开发者 / 小型电商主理人 / 自媒体作者。

**对标产品**（同类 SaaS 调研）：

| 产品 | 核心能力 | 借鉴点 |
|------|---------|--------|
| Buffer / Hootsuite | 多平台社交媒体调度发布 | Distribution 模块 + 排程日历 |
| OpusClip / Castmagic | 长视频 AI 切片、字幕、文案生成 | Content Studio AI 工具 |
| Restream / Streamyard | 多平台同步直播推流 | Streaming 模块 / RTMP 转发 |
| Repurpose.io | 单一内容多平台改写分发 | Auto-Repurpose 流水线 |
| Notion AI / Jasper | AI 辅助文案创作 | Studio Editor + Agent 协作 |
| Linktree / Beacons | 个人品牌聚合页 | Brand Hub (后续阶段) |

---

## 2. RPD (Requirements & Product Document)

### 2.1 模块清单（MVP 范围）

| 模块 | 路径 | 功能要点 |
|------|------|----------|
| **Dashboard** | `/` | 总览：今日发布数 / 直播状态 / Agent 任务 / 关键 KPI / 跨平台粉丝增长曲线 |
| **Content Studio** | `/studio` | AI 辅助创作（文案/图文/短视频脚本），左侧 Brief 表单 + 中间 Markdown 编辑器 + 右侧 AI Agent 对话栏 |
| **Asset Library** | `/library` | 素材库（图片/视频/音频/模板），分类 + 标签 + 拖拽上传 |
| **Distribution Hub** | `/distribute` | 多平台分发草稿队列：微信公众号 / 小红书 / 抖音 / B站 / X / YouTube / LinkedIn，支持「一稿多投」预览 + 排程 |
| **Schedule** | `/schedule` | 内容日历（月/周视图）+ 拖拽改期 |
| **Live Streaming** | `/streaming` | RTMP 推流密钥管理 / 多平台同步开播 / 实时码率延迟监控 / 弹幕聚合面板 |
| **Analytics** | `/analytics` | 跨平台数据：阅读 / 互动 / 涨粉 / GMV，含 recharts 曲线 |
| **Agents** | `/agents` | Agent 列表 + 工作流 (例：选题→撰写→配图→发布)，支持启停 |
| **Settings** | `/settings` | 平台账号 OAuth 绑定 / API Key / 品牌资料 |

### 2.2 技术栈

- **框架**：React 18 + TypeScript + Vite 6
- **样式**：Tailwind CSS v4 + shadcn 风格 (Radix primitives)
- **路由**：react-router v7
- **图表**：recharts
- **图标**：lucide-react
- **布局**：react-resizable-panels
- **通知**：sonner
- **测试**：Playwright (e2e smoke)
- **端口**：5175 (避开 5174 被 front-end 占用)

### 2.3 设计原则

1. 复用 `front-end` 的 theme.css / index.css 语义化 token，保证视觉一致。
2. 所有页面共享 `AppShell`（左侧 Sidebar + 顶部 Header + 主内容区）。
3. 使用 mock 数据驱动 UI，后端集成留接口（`src/services/`）。
4. 不集成 Electron，纯 Web SPA（后续可叠加）。

---

## 3. 开发阶段 (Phases)

| 阶段 | 状态 | 产出 |
|------|------|------|
| P0 调研与文档 | ✅ Done | 本文档 + RPD |
| P1 项目脚手架 | ✅ Done | `package.json` / `vite.config.ts` / `tsconfig.json` / `index.html` |
| P2 主题与 Shell | ✅ Done | `styles/` + `AppShell` + 路由 (react-router v7) |
| P3 核心 5 页 mock UI | ✅ Done | Dashboard / Studio / Distribute / Streaming / Analytics |
| P4 次要 4 页 | ✅ Done | Library / Schedule / Agents / Settings |
| P5 Playwright smoke | ✅ Done | `tests/e2e/smoke.spec.ts` (11 用例) |
| P6 测试运行 + 修复 | ✅ Done | **11/11 passed** (8.4s)，无 console error |
| P7 后端集成 | ⬜ Pending | 替换 `services/mock.ts` 为真实 API；OAuth 平台授权 |
| P8 Agent 工作流编排 | ⬜ Pending | Agent DAG 编辑器、定时触发、日志查看 |
| P9 Electron 包装 | ⬜ Pending | 参照 `front-end/electron/` 添加桌面壳 |

---

## 4. 中断恢复指南

启动时执行：
```pwsh
cd D:\Worksapce_tradingbase\SOLO-COMPANY\opus-OPC
npm install        # 若 node_modules 不存在
npm run dev        # 启动 vite dev (port 5175)
npx playwright test  # 运行 smoke
```

查看本文件「开发阶段」表格，从第一个 ⬜ 项继续。每完成一阶段把对应行改为 ✅ Done 并 commit。

---

## 5. 已知决策记录 (ADR-lite)

- **不用 Electron**：第一阶段网页足够；用户可后续叠加 Electron 包装（参照 `front-end/electron/main.cjs`）。
- **不用状态库**：MVP 用 React Context + useState，避免引入 Redux/Zustand 增加复杂度。
- **不连真实 API**：所有数据来自 `src/services/mock/`，便于离线 demo 与 Playwright 稳定。
- **端口 5175**：避免与 `front-end` (5174) 冲突。
