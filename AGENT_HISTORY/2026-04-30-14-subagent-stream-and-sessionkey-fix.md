# Subagent 事件流捕捉完善 + sessionKey 复用修复

## 背景

用户报告两类问题：

1. **同一对话页面发送消息时偶尔会新建一个 `sessionKey`**，导致 Gateway 认为是新的会话，
   上下文丢失。
2. **部分 tool 消息的 output 没有被前端正确捕捉**。

要求先用脚本模拟拿到真实的 WS 帧，确认问题原因后再改代码。

## 实证分析（脚本驱动）

新增两个脚本：

- `front-end/debug-claw-capture.mjs`：在固定 `sessionKey` 下连续发出 3 条
  消息，把所有 WS 帧存成 `ws-capture.jsonl`。
- `front-end/debug-claw-analyze.mjs`：解析 jsonl，按 `runId` 分组打印
  `item.end` 字段、`command_output` 累积情况。

观察结论：

| 现象 | 结论 |
|------|------|
| 同一 `sessionKey` 下 3 轮调用，gateway 全部接受并各自分配独立 `runId` | sessionKey **可以也必须**跨轮复用 |
| `command_output.delta` 中 `output` 字段是**全量累积**而非增量片段（5→11→17 字节） | 客户端 reducer 必须用 `progressText: d.output` **替换**，不能 append |
| `item.end kind=command` 帧带 `summary` 字段，包含完整 stdout | 命令类工具结果可以拿到 |
| 非命令类工具（`sessions_spawn`、文件操作等）只发 `kind=tool` 的 start/end，**没有 output 内容** | 这是 Gateway 端的限制，前端无法补救；只能展示 `meta`（输入参数） |
| Subagent 触发的 item 帧使用 `tool-xxx` 前缀，仍归在 parent 的 `runId` 下 | 不需要单独绑定 subagent runId，只要按 sessionKey + parent runId 收即可 |

## 代码修改

### 1) `front-end/src/services/openclawGateway.ts`

- 移除 `PendingRequest._boundRunId` 与 `onAgentEvent`，agent 事件改为
  **全局总线广播**（`emitAgentEvent`）。
- 新增 `subscribeAgentEvents(fn)` 和 `createSessionKey(prefix)` 导出。
- 新增 `findPendingBySessionKey` / `findPendingEntryBySessionKey`，配合
  `sessionKeyMatches` 做 `endsWith` 匹配（gateway 实际 sessionKey 为
  `agent:main:<userKey>`）。
- `callOpenClawGateway` 接口升级为 `(message, opts | onStream, systemPrompt?)`，
  返回 `{ text, sessionKey }`，调用方可拿到本次实际使用的 sessionKey。
  保留旧签名 `(message, onStream, systemPrompt)` 的向后兼容。

### 2) `front-end/src/services/conversationStore.ts`

新增任务级 sessionKey 持久化：

```ts
loadSessionKey(taskId: string): string | null
saveSessionKey(taskId: string, sk: string): void
```

key 前缀 `yuanji:sk:{taskId}`。

### 3) `front-end/src/app/hooks/useChatSession.ts`

- 新增 `sessionKeyMapRef`（任务 id → sessionKey）。
- 发送消息时按 taskId 取 sessionKey；没有就 `loadSessionKey` 或 `createSessionKey`，
  并对真实 task（非 seed id）`saveSessionKey` 持久化。
- 用 `subscribeAgentEvents` 全局订阅 + 本轮 sessionKey/runId 过滤代替原来的
  请求级 `onAgentEvent` 回调。`finally` 中卸载订阅。
- 这样 subagent 派生的 item 帧（在 parent run 下）也会被收录。

## 验证

- 三个被改文件 `get_errors` 全部无错误。
- 旧调用方 `GatewayStatusPanel.tsx` 仍走兼容签名，正常工作。
