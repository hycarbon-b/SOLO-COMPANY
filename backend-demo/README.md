# 群聊·一人公司 🦞

> 用 Vue 3 + OpenClaw 构建你的 AI 团队，一个人就是一家公司。

## 功能特性

- **5 位 AI 角色** — CEO、CPO、CTO、CMO、CFO，各司其职
- **群聊广播** — 一个问题，所有成员同时回复
- **@mention** — `@ceo` `@tech` 单独咨询特定角色
- **议题管理** — 设置当前讨论主题，对话更聚焦
- **对话记录** — 自动持久化，支持导出 TXT
- **OpenClaw 集成** — 连接真实 AI Agent，无 OpenClaw 时降级到智能模拟
- **快速话题** — 内置常用商业议题模板
- **响应式设计** — 适配桌面端，暗色主题

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动（模拟模式，无需 OpenClaw）

```bash
npm run dev
```

访问 `http://localhost:5173` 即可使用。AI 团队在模拟模式下会根据角色给出专业回复。

### 3. 连接真实 OpenClaw（可选）

```bash
# 安装 OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon

# 创建 5 个 Agent
openclaw agents add ceo
openclaw agents add product
openclaw agents add tech
openclaw agents add marketing
openclaw agents add finance

# 启动网关
openclaw gateway --port 18789

# 配置模型 (~/.openclaw/openclaw.json)
# 见 src/composables/useOpenClawSetup.js
```

## 如何使用

| 操作 | 说明 |
|------|------|
| 直接输入 | 全员讨论，5 人同时发表意见 |
| `@ceo 问题` | 只有 CEO 回复 |
| `@tech @product` | 只有 CTO 和 CPO 回复 |
| 点击成员头像 | 启用/禁用该成员参与讨论 |
| ⭐ 按钮 | 快速选择预设议题模板 |
| 清空对话 | 开始新的讨论 |
| 导出记录 | 保存为 TXT 文件 |

## 技术栈

- **Vue 3** (Composition API + `<script setup>`)
- **Pinia** 状态管理
- **Vite** 构建工具
- **marked** Markdown 渲染
- **OpenClaw** AI Agent 网关（可选）

## 项目结构

```
src/
├── components/
│   ├── ChatSidebar.vue    # 左侧成员栏
│   ├── ChatRoom.vue       # 主聊天区域
│   ├── ChatMessage.vue    # 消息气泡
│   ├── ChatInput.vue      # 输入框组件
│   ├── TypingIndicator.vue # 打字指示器
│   └── RoleCard.vue       # 成员卡片
├── stores/
│   └── chat.js            # Pinia 聊天状态
├── services/
│   └── openclaw.js        # OpenClaw API 服务 + 模拟模式
├── composables/
│   └── useOpenClawSetup.js # 配置向导
└── assets/
    └── main.css           # 全局样式
```

## License

MIT
