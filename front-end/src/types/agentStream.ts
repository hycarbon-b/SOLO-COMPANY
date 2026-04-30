/**
 * OpenClaw Agent Streaming 协议类型定义
 *
 * 来源：从实际抓取的 ws 帧 (ref/openclaw_ws_message/toolcall) 反推。
 * Gateway schema (ref/claw_gateway_protocol/schema/agent.ts) 中
 * `AgentEventSchema.data` 被定义为 Record<string, unknown>，未约束子结构。
 *
 * 一条 agent run 内 payload.stream 可取四类：
 *   - "lifecycle"      run 生命周期开始/结束
 *   - "item"           工具项 (kind=tool 或 command) 的状态机
 *   - "command_output" 命令 stdout 的增量与终态
 *   - "assistant"      LLM 文本流式输出
 */

export type AgentStreamKind =
  | 'lifecycle'
  | 'item'
  | 'command_output'
  | 'assistant';

// ───── lifecycle ─────
export interface AgentLifecycleData {
  phase: 'start' | 'end';
  startedAt?: number;
  endedAt?: number;
}

// ───── item ─────
export type AgentItemKind = 'tool' | 'command';
export type AgentItemPhase = 'start' | 'update' | 'end';
export type AgentItemStatus = 'running' | 'completed' | 'failed';

export interface AgentItemData {
  itemId: string;          // "tool:<callId>" | "command:<callId>"
  phase: AgentItemPhase;
  kind: AgentItemKind;
  title: string;
  status: AgentItemStatus;
  name: string;
  meta?: string;
  toolCallId: string;
  startedAt?: number;
  endedAt?: number;
  /** command kind, phase=update 时可能携带的预览输出 */
  progressText?: string;
  /** command kind, phase=end 时携带的最终摘要 */
  summary?: string;
}

// ───── command_output ─────
export type CommandOutputPhase = 'delta' | 'end';
export interface AgentCommandOutputData {
  itemId: string;
  phase: CommandOutputPhase;
  title: string;
  toolCallId: string;
  name: string;
  output: string;
  status: AgentItemStatus;
  exitCode?: number;
  durationMs?: number;
  cwd?: string;
}

// ───── assistant ─────
export interface AgentAssistantData {
  text: string;            // 累积全文
  delta: string;           // 本帧增量
}

// ───── 统一帧 (payload 部分) ─────
interface AgentEventCommon {
  runId: string;
  seq: number;
  ts: number;
  sessionKey?: string;
}

export type AgentStreamEvent =
  | (AgentEventCommon & { stream: 'lifecycle';      data: AgentLifecycleData })
  | (AgentEventCommon & { stream: 'item';           data: AgentItemData })
  | (AgentEventCommon & { stream: 'command_output'; data: AgentCommandOutputData })
  | (AgentEventCommon & { stream: 'assistant';      data: AgentAssistantData });

// ───── 聚合后的工具调用快照 (UI 友好) ─────
export interface ToolCallSnapshot {
  toolCallId: string;
  /** 来自 item.kind=tool 的标题（相对最权威） */
  title: string;
  name: string;          // exec / read_file / ...
  meta?: string;
  status: AgentItemStatus;
  startedAt?: number;
  endedAt?: number;
  /** 实时增量预览（来自 command_output.delta 或 item.update.progressText） */
  progressText?: string;
  /** 最终输出，来自 command_output.end.output 或 item.command.end.summary */
  output?: string;
  exitCode?: number;
  durationMs?: number;
  cwd?: string;
}

/**
 * 用一组 AgentStreamEvent 增量更新 ToolCallSnapshot 表。
 * 不修改入参 map，返回新引用以方便 React 状态对比。
 */
export function reduceToolCalls(
  prev: Record<string, ToolCallSnapshot>,
  evt: AgentStreamEvent,
): Record<string, ToolCallSnapshot> {
  if (evt.stream === 'lifecycle' || evt.stream === 'assistant') return prev;

  const callId = evt.data.toolCallId;
  if (!callId) return prev;
  const cur: ToolCallSnapshot = prev[callId] ?? {
    toolCallId: callId,
    title: '',
    name: '',
    status: 'running',
  };

  let next: ToolCallSnapshot = cur;

  if (evt.stream === 'item') {
    const d = evt.data;
    next = {
      ...cur,
      // tool kind 的 title 通常更干净（"exec ..."），优先采用
      title: d.kind === 'tool' || !cur.title ? d.title : cur.title,
      name: d.name || cur.name,
      meta: d.meta ?? cur.meta,
      status: d.status,
      startedAt: d.startedAt ?? cur.startedAt,
      endedAt: d.endedAt ?? cur.endedAt,
      progressText: d.progressText ?? cur.progressText,
      output: d.summary ?? cur.output,
    };
  } else if (evt.stream === 'command_output') {
    const d = evt.data;
    next = {
      ...cur,
      title: cur.title || d.title,
      name: cur.name || d.name,
      status: d.status,
      progressText: d.phase === 'delta' ? d.output : cur.progressText,
      output: d.phase === 'end' ? d.output : cur.output,
      exitCode: d.exitCode ?? cur.exitCode,
      durationMs: d.durationMs ?? cur.durationMs,
      cwd: d.cwd ?? cur.cwd,
    };
  }

  if (next === cur) return prev;
  return { ...prev, [callId]: next };
}
