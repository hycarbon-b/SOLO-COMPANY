# Electron 热调试与 Agent 工作状态监控

## 📋 实现概述

本次修改实现了以下功能：
1. ✅ 使用 Electron Node.js API 直接读取 `d:/code/temp/discussion/` 文件夹
2. ✅ 通过 IPC 通信将数据传递给渲染进程
3. ✅ 轮询机制：每 5 秒自动检查新文件
4. ✅ 实时显示员工技能执行状态（start/end 记录配对）
5. ✅ 支持热调试：Vite HMR + Electron 开发模式

---

## 🔧 技术架构

### 数据流
```
discussion 文件夹 (d:/code/temp/discussion/)
    ↓
Electron 主进程 (main.cjs) - fs API 读取 JSON 文件
    ↓
IPC 通信 (ipcMain.handle / ipcRenderer.invoke)
    ↓
Preload 脚本 (preload.cjs) - 暴露安全 API
    ↓
渲染进程 (AgentPage.tsx) - 显示讨论列表
    ↓
轮询更新 (setInterval 5s)
```

### 文件解析逻辑
- 文件名格式：`{timestamp}_{skill_id}_{start|end}.json`
- 按 timestamp 分组配对 start/end 记录
- 计算执行时长和状态

---

## 📁 修改文件清单

### 新建文件
1. **`front-end/src/types/discussion.ts`**
   - TypeScript 类型定义
   - `DiscussionEntry` - 单条记录
   - `DiscussionThread` - 配对的对话线程

2. **`front-end/src/types/electron.d.ts`**
   - Window.electronAPI 类型声明
   - 提供 IDE 智能提示

3. **`front-end/src/app/components/DiscussionCard.tsx`**
   - 讨论卡片组件
   - 显示员工信息、任务目标、状态、耗时

### 修改文件
1. **`front-end/electron/main.cjs`**
   - 添加 `ipcMain.handle('discussion:list')` 
   - 使用 `fs.promises` 读取文件夹
   - 解析并配对 JSON 文件

2. **`front-end/electron/preload.cjs`**
   - 暴露 `getDiscussions()` API

3. **`front-end/src/app/components/AgentPage.tsx`**
   - 完全重写为动态列表
   - 移除硬编码的 agents 数组
   - 添加轮询逻辑（5秒间隔）
   - 显示加载、错误、空状态

4. **`front-end/src/app/components/MainContent.tsx`**
   - 修改 `handleAgentStartChat` 接受 `DiscussionThread`
   - 显示真实的任务目标和背景信息

---

## 🚀 使用方法

### 启动开发模式
```bash
cd front-end
npm run electron:dev
```

### 热调试特性
- ✅ Vite 开发服务器支持 HMR（热模块替换）
- ✅ React 组件修改后自动刷新
- ✅ Electron 主进程修改需重启
- ✅ 渲染进程代码即时生效

### 查看 Agent 工作状态
1. 打开应用
2. 点击左侧菜单 "Agent"
3. 自动加载 `d:/code/temp/discussion/` 中的对话记录
4. 每 5 秒自动刷新
5. 点击卡片可查看详细对话

---

## 📊 数据结构示例

### Start 记录
```json
{
  "schema": "discussion_entry_v1",
  "event": "start",
  "timestamp": "2026-04-23T17:27:56.712Z",
  "skill_id": "employee_cto",
  "worker_label": "CTO · 首席技术官",
  "worker_name": "David Zhang",
  "task_objective": "评估 OpenClaw 插件开发的技术路径与架构建议",
  "task_context": "用户是 agent 软件开发工程师..."
}
```

### End 记录
```json
{
  "schema": "discussion_entry_v1",
  "event": "end",
  "timestamp": "2026-04-23T17:28:10.000Z",
  "skill_id": "employee_cto",
  "worker_label": "CTO · 首席技术官",
  "worker_name": "David Zhang",
  "task_objective": "评估 OpenClaw 插件开发的技术路径与架构建议",
  "summary": "采用渐进式策略...",
  "key_findings": [...],
  "next_actions": [...],
  "status": "success"
}
```

---

## 🎨 UI 状态

### 进行中（黄色）
- 只有 start 记录，无 end 记录
- 显示旋转加载图标
- 显示任务目标和开始时间

### 已完成（绿色）
- start 和 end 记录都存在
- status = "success"
- 显示总结和执行时长

### 失败（红色）
- end 记录中 status = "failed"
- 显示错误图标

### 部分完成（橙色）
- end 记录中 status = "partial"

---

## ⚙️ 配置说明

### 文件夹路径
当前硬编码在 `electron/main.cjs` 中：
```javascript
const discussionDir = 'd:\\code\\temp\\discussion'
```

如需修改，编辑该行即可。

### 轮询间隔
在 `AgentPage.tsx` 中修改：
```typescript
const interval = setInterval(fetchDiscussions, 5000) // 5000ms = 5秒
```

---

## 🐛 故障排查

### 问题 1：无法读取文件夹
**症状：** 显示 "Discussion directory not found"

**解决：**
1. 确认 `d:/code/temp/discussion/` 文件夹存在
2. 检查路径是否正确（注意 Windows 路径分隔符）

### 问题 2：TypeScript 报错找不到模块
**症状：** `Cannot find module '../../types/discussion'`

**解决：**
1. 这是 IDE 缓存问题，不影响运行
2. 重启 VSCode 或重新加载窗口
3. Vite 编译时会正确处理

### 问题 3：Electron 窗口不显示内容
**症状：** 白屏或加载失败

**解决：**
1. 检查 Vite 服务器是否正常运行（http://localhost:5174）
2. 查看开发者工具控制台错误
3. 确认 `NODE_ENV=development` 已设置

### 问题 4：JSON 解析失败
**症状：** 某些文件未显示

**解决：**
1. 检查 JSON 文件格式是否正确
2. 确保使用 UTF-8 编码
3. 查看终端输出中的错误日志

---

## 🔮 后续优化建议

1. **性能优化**
   - 只读取新文件，缓存已解析的数据
   - 使用文件系统监听（chokidar）替代轮询

2. **用户体验**
   - 添加筛选功能（按状态、员工角色）
   - 支持搜索和排序
   - 点击卡片展开详情视图

3. **数据持久化**
   - 保存用户的筛选偏好
   - 记录查看历史

4. **错误处理**
   - 更友好的错误提示
   - 自动重试机制
   - 离线状态检测

---

## 📝 注意事项

1. **浏览器兼容性**
   - 此方案仅在 Electron 环境中有效
   - 不依赖浏览器 File System Access API

2. **安全性**
   - IPC 通信已通过 contextBridge 隔离
   - 渲染进程无法直接访问 Node.js API

3. **路径硬编码**
   - 当前路径写死在 main.cjs 中
   - 生产环境建议使用配置文件或环境变量

4. **文件编码**
   - JSON 文件必须使用 UTF-8 编码
   - Windows 下注意 BOM 头问题

---

## ✅ 验证清单

- [x] Electron 主进程 IPC handler 正常工作
- [x] Preload 脚本正确暴露 API
- [x] AgentPage 成功获取并显示讨论列表
- [x] 轮询机制每 5 秒更新一次
- [x] 点击卡片可创建聊天会话
- [x] 热重载功能正常（修改 React 组件即时生效）
- [x] 状态标识正确（进行中/已完成/失败）
- [x] 时间格式化正确
- [x] 错误处理完善

---

**最后更新：** 2026-04-24
**作者：** Lingma Assistant
