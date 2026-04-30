/**
 * Conversation persistence backed by localStorage.
 * Key prefix: "yuanji:"
 *
 * Keys:
 *   yuanji:tasks          → StoredTask[]
 *   yuanji:msgs:{id}      → StoredMessage[]
 *   yuanji:sys:{id}       → string (system prompt)
 *   yuanji:sk:{id}        → string (OpenClaw Gateway sessionKey, 任务级复用)
 */

import type { ToolCallSnapshot } from '../types/agentStream';

export interface StoredTask {
  id: string;
  title: string;
  time: string;
  status?: 'idle' | 'working' | 'completed' | 'error';
  hasUnread?: boolean;
  pinned?: boolean;
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 'text' = markdown (default) | 'html' = inline HTML card */
  type?: 'text' | 'html';
  timestamp: string; // ISO-8601
  isStrategy?: boolean;
  isStockPicker?: boolean;
  toolCalls?: ToolCallSnapshot[];
}

const TASKS_KEY = 'yuanji:tasks';
const msgsKey = (id: string) => `yuanji:msgs:${id}`;
const sysKey  = (id: string) => `yuanji:sys:${id}`;
const skKey   = (id: string) => `yuanji:sk:${id}`;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── ID generation ─────────────────────────────────────────────────────────────
export function newConversationId(): string {
  return crypto.randomUUID();
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export function loadTasks(): StoredTask[] {
  return safeRead<StoredTask[]>(TASKS_KEY, []);
}

export function saveTasks(tasks: StoredTask[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ── Messages ──────────────────────────────────────────────────────────────────
export function loadMessages(taskId: string): StoredMessage[] {
  return safeRead<StoredMessage[]>(msgsKey(taskId), []);
}

export function saveMessages(taskId: string, msgs: StoredMessage[]): void {
  if (msgs.length === 0) {
    localStorage.removeItem(msgsKey(taskId));
  } else {
    localStorage.setItem(msgsKey(taskId), JSON.stringify(msgs));
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
export function loadSysPrompt(taskId: string): string | undefined {
  return localStorage.getItem(sysKey(taskId)) ?? undefined;
}

export function saveSysPrompt(taskId: string, prompt: string): void {
  localStorage.setItem(sysKey(taskId), prompt);
}

// ── Session key (OpenClaw Gateway) ────────────────────────────────────────────
export function loadSessionKey(taskId: string): string | null {
  return localStorage.getItem(skKey(taskId));
}

export function saveSessionKey(taskId: string, sk: string): void {
  localStorage.setItem(skKey(taskId), sk);
}

// ── Reset all ─────────────────────────────────────────────────────────────────
export function clearAll(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('yuanji:')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}
