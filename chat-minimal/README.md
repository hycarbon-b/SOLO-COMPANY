# OpenClaw Chat - Minimal

极简的 OpenClaw 聊天客户端，只包含核心对话功能。

## 特性

✅ WebSocket 连接到 OpenClaw Gateway  
✅ 发送和接收消息  
✅ 流式响应支持  
✅ 授权对话框处理  
✅ 简单的设置界面  

❌ 无标签页管理  
❌ 无边栏导航  
❌ 无文件库  
❌ 无 Agent 中心  
❌ 无其他额外功能  

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5174/

### 3. 配置

点击右上角的设置图标，配置：
- **Gateway 地址**: 默认 `127.0.0.1:18789`
- **Token**: 你的 OpenClaw 访问令牌

## 技术栈

- React 18.3
- TypeScript
- Vite 5
- Tailwind CSS 4
- lucide-react (图标)

## 项目结构

```
openclaw-chat-minimal/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.tsx              # 入口文件
    ├── App.tsx               # 主应用（单一组件）
    ├── services/
    │   └── openclawGateway.js # OpenClaw 网关服务
    └── assets/
        └── main.css          # 样式文件
```

## 使用说明

1. 确保 OpenClaw Gateway 正在运行
2. 在设置中配置 Gateway 地址和 Token
3. 在输入框中输入消息
4. 按 Enter 或点击"发送"按钮
5. 查看 AI 回复（支持流式显示）

## 与主项目的区别

| 特性 | 主项目 | 此最小项目 |
|------|--------|-----------|
| 代码量 | ~5000+ 行 | ~300 行 |
| 功能 | 完整功能 | 仅聊天 |
| 启动速度 | 中等 | 极快 |
| 依赖 | 较多 | 极少 |
| 适用场景 | 生产环境 | 测试/调试 |

## 开发

这个子项目用于：
- 快速测试 OpenClaw 集成
- 调试 WebSocket 连接
- 学习核心实现
- 作为参考示例
