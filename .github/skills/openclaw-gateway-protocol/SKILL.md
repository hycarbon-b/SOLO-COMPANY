---
name: openclaw-gateway-protocol
description: "Use when: designing or debugging WebSocket communication with OpenClaw Gateway; understanding chat.send flow, agent streaming events, authentication handshake, or frame formats; reading claw_gateway_protocol schema files; implementing a Gateway WebSocket client. Keywords: openclaw, gateway, websocket, protocol, chat.send, agent event, chat event, streaming, frames, authentication."
argument-hint: "Optional: 具体问题，如 chat.send 参数、agent 事件结构"
---

# OpenClaw Gateway WebSocket Protocol

## 何时使用
- 需要了解 Gateway 的 WebSocket 帧格式
- 设计或调试 `chat.send` 流程
- 理解 `agent` / `chat` 流式事件的结构
- 实现 Gateway 客户端
- 查看认证握手（`connect` 方法）的字段

---

## 协议概览

Gateway 使用一套**统一的 JSON 帧**进行双向通信，帧类型分三类：

| 帧类型 | 方向 | 作用 |
|--------|------|------|
| `req`  | 客户端 → 服务端 | 发起 RPC 调用 |
| `res`  | 服务端 → 客户端 | RPC 的直接返回 |
| `event`| 服务端 → 客户端 | 异步流式推送 |

---

## 步骤 1：查阅协议来源文件

遇到具体协议问题时，**先读取以下文件**，再作分析：

| 需求 | 目标文件 |
|------|---------|
| 帧格式 / `connect` 握手 | `ref/claw_gateway_protocol/schema/frames.ts` |
| `chat.send` / `chat` 事件 | `ref/claw_gateway_protocol/schema/logs-chat.ts` |
| `agent` 事件结构 | `ref/claw_gateway_protocol/schema/agent.ts` |
| 全量方法 + 事件注册表 | `ref/claw_gateway_protocol/schema/protocol-schemas.ts` |
| Sessions / sessionKey | `ref/claw_gateway_protocol/schema/sessions.ts` |
| 基础类型（NonEmptyString 等） | `ref/claw_gateway_protocol/schema/primitives.ts` |

---

## 步骤 2：认证握手（`connect`）

连接建立后，客户端立即发送 `connect` 请求：

```json
{
  "type": "req",
  "id": "connect-<timestamp>",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 10,
    "client": {
      "id": "openclaw-control-ui",
      "version": "1.0.0",
      "platform": "web",
      "mode": "webchat"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write", "operator.admin"],
    "auth": { "token": "<bearer-token>" }
  }
}
```

**服务端响应**（`res` 帧）：
- `ok: true` → 连接成功，可使用 `server.connId`、`features.methods`
- `ok: false` → 认证失败，需关闭连接

Schema 来源：`frames.ts` → `ConnectParamsSchema` / `HelloOkSchema`

---

## 步骤 3：发送消息（`chat.send`）

```json
{
  "type": "req",
  "id": "<唯一ID>",
  "method": "chat.send",
  "params": {
    "sessionKey": "tradingbase-<timestamp>-<random>",
    "message": "<用户消息>",
    "idempotencyKey": "<与 id 相同>"
  }
}
```

`chat.send` 的关键 params（来自 `ChatSendParamsSchema`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sessionKey` | string | 会话标识，首次发送时自动创建会话 |
| `message` | string | 用户消息文本 |
| `idempotencyKey` | string（必须） | 幂等键，防止重复处理 |
| `thinking` | string？ | 可选的思考内容 |
| `timeoutMs` | int？ | 单次请求超时毫秒 |

---

## 步骤 4：处理流式事件

服务端通过 `event` 帧推送两类核心事件：

### `agent` 事件（流式文本）

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "sessionKey": "...",
    "data": {
      "text": "<全量累积文本>",
      "runId": "...",
      "seq": 5,
      "stream": "main",
      "ts": 1714000000000
    }
  }
}
```

> ⚠️ `payload.data.text` 是**全量累积文本**，不是增量。客户端需要自行对比前一次的 `text` 长度，截取新增部分。

### `chat` 事件（状态变更）

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "sessionKey": "...",
    "state": "final",        // "delta" | "final" | "aborted" | "error"
    "runId": "...",
    "seq": 0,
    "message": { "content": "..." },
    "errorMessage": "...",   // state=error 时存在
    "errorKind": "timeout"   // "refusal"|"timeout"|"rate_limit"|"context_length"|"unknown"
  }
}
```

**状态含义**：

| state | 含义 |
|-------|------|
| `delta` | 中间增量（一般不带 message） |
| `final` | 完整响应完成，`message` 字段包含最终内容 |
| `aborted` | 被 `chat.abort` 打断 |
| `error` | 出错，读取 `errorMessage` / `errorKind` |

---

## 步骤 5：匹配事件与请求

`event` 帧**不包含 req 的 id**，必须通过 `payload.sessionKey` 匹配到对应的 pending 请求。

匹配规则（见 `openclawGateway.ts` `handleGatewayMessage`）：
```
sk === req.sessionKey
|| sk.endsWith(req.sessionKey)
|| req.sessionKey.endsWith(sk)
```

---

## 步骤 6：会话管理

- `sessionKey` 由客户端自行生成，格式任意，建议含 timestamp 保证唯一性
- 同一 `sessionKey` 的多次 `chat.send` 会在同一会话内累积上下文
- `sessions.list` / `sessions.resolve` 方法可查询已有会话
- Schema 来源：`sessions.ts` → `SessionsListParamsSchema`

---

## 分析流程（接收到问题时）

1. 识别问题所属分类（握手 / 发送 / 事件 / 会话 / 其他）
2. 从上面的"目标文件"表读取对应的 schema 文件
3. 结合 schema 字段 + `openclawGateway.ts` 的运行时实现进行对比分析
4. 若需要确认全量方法列表，读取 `protocol-schemas.ts`
5. 给出字段说明或 bug 定位结论

---

## 常见问题速查

| 问题 | 检查点 |
|------|--------|
| 流式文本出现重复 / 乱序 | `agent` 事件的 `text` 是全量，是否正确截取增量 |
| 收到 event 但无法匹配请求 | `sessionKey` 匹配逻辑，注意前缀/后缀扩展匹配 |
| `chat.send` 直接报错 | 先看 `res` 帧的 `ok`/`error`，再看 `chat` event `state=error` |
| 认证失败 | `connect` 的 `auth.token` 是否正确；`role` + `scopes` 是否符合服务端要求 |
| 请求超时 | `pendingRequests` 里有无遗留未清理的 entry；WebSocket 是否已断连 |
