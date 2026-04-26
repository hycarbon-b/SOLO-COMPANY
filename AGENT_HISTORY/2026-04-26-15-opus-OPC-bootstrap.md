# OPUS-OPC 一人公司 Agent 工作台 · 首轮搭建

**时间**：2026-04-26 · **目录**：`opus-OPC/`

## 任务目标
为「一人公司」运营者构建 React Web 工作台，覆盖 内容创作 / 多平台分发 / 直播推流 / Agent 编排 全链路；要求可中断恢复、自动 Playwright 验收、对标主流 SaaS。

## 调研对标（同类 SaaS）
- Buffer / Hootsuite — 多平台社交调度发布
- OpusClip / Castmagic — AI 视频切片与文案
- Restream / Streamyard — 多平台同步推流
- Repurpose.io — 一稿多投自动改写
- Notion AI / Jasper — AI 创作助手

## 本轮产出

### 项目脚手架
- `package.json` / `tsconfig.json` / `vite.config.ts` / `index.html`
- 端口 5175（避开 front-end 的 5174）
- 依赖：React 18 + TS + Vite 6 + Tailwind v4 + Radix + recharts + lucide-react + react-router v7 + sonner + Playwright

### 9 大功能页面（全部 mock 数据驱动）
1. **Dashboard** — KPI 卡 + 7 日跨平台粉丝增长曲线 + Agent 状态 + 待发布表格
2. **Content Studio** — 三栏：Brief / Markdown 编辑器 / Agent 协作对话
3. **Library** — 素材网格（图/视频/音频/模板）
4. **Distribute** — 草稿队列、状态 Tab、平台彩签、一稿多投
5. **Schedule** — 周视图日历卡片
6. **Streaming** — 多 RTMP 推流目标管理 + 弹幕聚合 + 推流参数
7. **Analytics** — 各平台曝光 vs 互动柱状图 + 热门内容 + 收入分布
8. **Agents** — Agent 卡片网格（启停 / 重跑）
9. **Settings** — 平台 OAuth 状态 / AI Provider Key / 品牌资料

### 测试
- `tests/e2e/smoke.spec.ts`：11 个用例
  - sidebar 9 项导航存在
  - 9 个路由全部正常渲染、无 console error
  - studio 编辑器输入 + agent 聊天交互
- **结果：11 / 11 passed (8.4s)**

### 进度文档
`opus-OPC/DEV_PROGRESS.md` — 包含 RPD、阶段表、中断恢复指南、ADR-lite 决策记录。下次启动直接读此文件继续 P7+。

## 启动方式
```pwsh
cd D:\Worksapce_tradingbase\SOLO-COMPANY\opus-OPC
npm run dev               # http://localhost:5175
npx playwright test       # 自动启动 dev server 并跑 smoke
```

## 后续 Roadmap（已记入 DEV_PROGRESS.md）
- P7：替换 mock 为真实 API + OAuth 平台授权
- P8：Agent DAG 工作流编排器
- P9：Electron 桌面壳（参照 `front-end/electron/`）
