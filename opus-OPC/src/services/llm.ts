// LLM client — talks to any OpenAI-compatible chat completions endpoint.
// Used by Studio chat, AI optimization, agent execution, etc.

import { configStore, isLLMConfigured } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMNotConfiguredError extends Error {
  constructor() {
    super('LLM 尚未配置：请前往「设置」页面填写 API Key 与模型。');
    this.name = 'LLMNotConfiguredError';
  }
}

export class LLMRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'LLMRequestError';
  }
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Non-streaming chat completion. Returns assistant text. */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  if (!isLLMConfigured()) throw new LLMNotConfiguredError();
  const { llm } = configStore.get();

  const url = `${llm.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: llm.model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: false,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await safeText(res);
    throw new LLMRequestError(res.status, detail || res.statusText);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new LLMRequestError(500, 'LLM 返回格式异常');
  }
  return text.trim();
}

/** Quick connectivity probe — returns true if a tiny request succeeds. */
export async function pingLLM(): Promise<boolean> {
  try {
    const reply = await chat(
      [
        { role: 'system', content: 'You answer with a single word.' },
        { role: 'user', content: 'Reply with the word OK.' },
      ],
      { maxTokens: 8, temperature: 0 }
    );
    return /ok/i.test(reply);
  } catch {
    return false;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    // Try to surface error.message field if JSON
    try {
      const j = JSON.parse(t);
      return j?.error?.message ?? j?.message ?? t.slice(0, 300);
    } catch {
      return t.slice(0, 300);
    }
  } catch {
    return '';
  }
}
