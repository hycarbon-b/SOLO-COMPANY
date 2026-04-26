# Front-end 页面和组件说明文档

## 页面 ( Pages )

| 页面文件 | 组件名 | 功能描述 |
|---------|--------|----------|
| `app/components/AboutPage.tsx` | `AboutPage` | 系统信息页面，显示OS版本、硬件信息、设备码、Google认证码 |
| `app/components/AgentPage.tsx` | `AgentPage` | Agent列表 |
| `app/components/FilesPage.tsx` | `FilesPage` | 文件库页面，分类显示文档/表格/图片/视频/策略代码 |
| `app/components/TradingPage.tsx` | `TradingPage` | 交易页面，模拟盘/实盘交易记录 |
| `app/components/MarketPage.tsx` | `MarketPage` | 市场页面，行情图表显示 |
| `app/components/SchedulePage.tsx` | `SchedulePage` | 定时任务页面，显示计划的自动化任务 |
| `app/components/MonitorPage.tsx` | `MonitorPage` | 实盘监控工作流编辑器（概念页），拖拽节点配置消息源→聚合分析→推送渠道 |
| `app/components/UsagePage.tsx` | `UsagePage` | 用量页面，Token消耗统计和趋势图 |

---

## 核心组件 ( Components )

| 组件文件 | 组件名 | 功能描述 |
|----------|--------|----------|
| `app/components/MainContent.tsx` | `MainContent` | **主内容区**，包含左侧菜单+中间聊天+右侧面板 |
| `app/components/RightPanelContainer.tsx` | `RightPanelContainer` | **右侧面板容器**，包含文件列表+Agent工作状态消息流 |
| `app/components/ChatPanel.tsx` | `ChatPanel` | 聊天面板，消息输入和展示 |
| `app/components/RightPanel.tsx` | `RightPanel` | 右侧面板（待确认用途） |
| `app/components/Sidebar.tsx` | `Sidebar` | 左侧导航菜单 |
| `app/components/Header.tsx` | `Header` | 顶部标题栏 |
| `app/components/GatewayStatusPanel.tsx` | `GatewayStatusPanel` | Gateway连接状态显示 |

---

## Agent相关组件

| 组件文件 | 组件名 | 功能描述 |
|----------|--------|----------|
| `app/components/AgentPage.tsx` | `AgentPage` | Agent列表，调用IPC获取discussion，显示线程卡片 |
| `app/components/DiscussionCard.tsx` | `DiscussionCard` | Discussion记录卡片，显示single discussion |

---

## UI组件

| 组件文件 | 组件名 | 功能描述 |
|----------|--------|----------|
| `app/components/StrategyCard.tsx` | `StrategyCard` | 策略卡片组件 |
| `app/components/StockPickerTable.tsx` | `StockPickerTable` | 股票选择表格组件 |

---

## 类型定义 ( Types )

| 文件 | 导出类型 | 描述 |
|------|----------|------|
| `types/discussion.ts` | `DiscussionEntry`, `DiscussionThread` | Discussion数据结构 |
| `types/electron.d.ts` | `ElectronAPI` | Electron IPC类型定义 |
| `app/fakeChatData.ts` | `Message`, `LibraryFile`, `fakeMessagesMap`, `libraryFiles` | 模拟聊天数据（demo用） |

---

## Electron进程

| 文件 | 进程 | 功能 |
|------|------|------|
| `electron/main.cjs` | main process | 窗口管理 + IPC handler (`discussion:list`) |
| `electron/preload.cjs` | preload | 暴露`electronAPI.getDiscussions()`到renderer |

---

## 页面路由关系

```
App.tsx
  └── MainContent.tsx
        ├── Sidebar.tsx (左侧菜单)
        ├── ChatPanel.tsx / AgentPage.tsx / FilesPage.tsx ... (中间内容)
        └── RightPanelContainer.tsx (右侧面板)
              ├── 文件列表区域
              └── Agent工作状态消息流
```

---

## 关键数据流

1. **Agent工作状态数据**：`d:\code\temp\discussion\` → `main.cjs` IPC → `window.electronAPI.getDiscussions()` → `AgentPage.tsx` / `RightPanelContainer.tsx`
2. **Discussion记录**：start.json + end.json → 配对为Thread → 显示在AgentPage或消息流

---

*最后更新：2026-04-24*