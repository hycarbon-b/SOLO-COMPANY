# Tool Output 捕捉修复 + WS帧持久化

## 问题背景

部分 tool 消息的 output 没有在前端渲染出来。用 ws-capture.jsonl 进行实证分析。

## JSONL 实证分析结论

文件：`front-end/ws-capture.jsonl`（91帧）

**数据结构确认**（脚本层面：`row.frame.event / row.frame.payload`）：

| 工具 | item 流 | command_output 流 | output 字段 |
|------|---------|-----------------|------------|
| `exec` | kind=tool (start/update/end) + kind=command (start/update/**end+summary**) | delta(累积)/end(exitCode+cwd) | `command/end.summary` + `command_output/end.output` |
| `sessions_spawn` | kind=tool (start/**end**，无 output) | **无** | **无（Gateway 侧限制）** |
| `sessions_yield` | 同上 | **无** | **无（Gateway 侧限制）** |

**两个根本原因：**

1. **Gateway 限制**：`sessions_spawn`、`sessions_yield` 等非命令类工具只发 `kind=tool` start/end，没有 `summary`/`output`，只有 `meta`（调用入参）。前端此前因 `hasDetail` 判断不含 `meta`，导致这类工具调用无法展开。

2. **Timing race**：`chat/final` 到达 → `callOpenClawGateway` resolve → `finally` 立即执行 `unsubscribeAgent()` —— 而几乎同时到达的最后几帧 `command/end`、`command_output/end` 被丢弃，导致最终 output 渲染缺失。

## 代码修改

### `front-end/src/app/components/ToolCallList.tsx`

- `hasDetail` 条件新增 `!!call.meta`，使无 output 的工具也可展开。
- 展开面板中新增兜底块：当 `display` 为空时，以 `args:` 标签展示 `call.meta`（调用入参），让 `sessions_spawn`、`sessions_yield` 等也有内容可看。

### `front-end/src/app/hooks/useChatSession.ts`

- `finally` 块中 `unsubscribeAgent()` 改为 `setTimeout(() => unsubscribeAgent(), 300)`，给最后一批 WS 帧 300ms 缓冲时间，避免 race 导致尾帧丢失。

### WS帧持久化（本场开头已完成）

- `front-end/electron/main.cjs`：新增 IPC `wsCapture:append / list / read`，写入 `<userData>/ws-captures/<sessionKey>.jsonl`。
- `front-end/electron/preload.cjs`：暴露 `wsCaptureAppend / wsCaptureList / wsCaptureRead`。
- `front-end/src/services/openclawGateway.ts`：`logWs` 中调用 `persistWsFrame`，每帧自动追加到对应 sessionKey 的 JSONL 文件（非 electron 环境静默跳过）。
- `front-end/src/types/electron.d.ts`：补充三个新 API 的 TypeScript 类型。

文件落地：`%APPDATA%\trading-app\ws-captures\<sessionKey>.jsonl`
