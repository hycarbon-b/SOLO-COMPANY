// Persistent application configuration.
// Stores LLM API credentials, brand info, and per-platform connection state
// in localStorage. All values live entirely on the user's machine.

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface BrandConfig {
  name: string;
  slogan: string;
  tone: string;
}

export interface PlatformAuth {
  connected: boolean;
  token?: string;
  expiresAt?: string;
}

export interface AppConfig {
  llm: LLMConfig;
  brand: BrandConfig;
  platforms: Record<string, PlatformAuth>;
}

const STORAGE_KEY = 'opus-opc:config:v1';

const DEFAULT_CONFIG: AppConfig = {
  llm: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  brand: {
    name: 'Solo · 一人公司',
    slogan: '一个人，也能撬动一个市场。',
    tone: '真诚 · 专业',
  },
  platforms: {
    wechat:      { connected: true,  expiresAt: '2026-12-31' },
    xiaohongshu: { connected: true,  expiresAt: '2026-12-31' },
    douyin:      { connected: true,  expiresAt: '2026-12-31' },
    bilibili:    { connected: true,  expiresAt: '2026-12-31' },
    youtube:     { connected: false },
    x:           { connected: false },
    linkedin:    { connected: false },
  },
};

type Listener = (cfg: AppConfig) => void;
const listeners = new Set<Listener>();

function read(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      llm:       { ...DEFAULT_CONFIG.llm,   ...(parsed.llm   ?? {}) },
      brand:     { ...DEFAULT_CONFIG.brand, ...(parsed.brand ?? {}) },
      platforms: { ...DEFAULT_CONFIG.platforms, ...(parsed.platforms ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

function write(cfg: AppConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* quota / private mode — ignore */
  }
  listeners.forEach((fn) => fn(cfg));
}

export const configStore = {
  get(): AppConfig {
    return read();
  },
  set(patch: Partial<AppConfig>): AppConfig {
    const next: AppConfig = {
      ...read(),
      ...patch,
    };
    write(next);
    return next;
  },
  patchLLM(patch: Partial<LLMConfig>): AppConfig {
    const cur = read();
    const next: AppConfig = { ...cur, llm: { ...cur.llm, ...patch } };
    write(next);
    return next;
  },
  patchBrand(patch: Partial<BrandConfig>): AppConfig {
    const cur = read();
    const next: AppConfig = { ...cur, brand: { ...cur.brand, ...patch } };
    write(next);
    return next;
  },
  setPlatform(id: string, auth: PlatformAuth): AppConfig {
    const cur = read();
    const next: AppConfig = {
      ...cur,
      platforms: { ...cur.platforms, [id]: auth },
    };
    write(next);
    return next;
  },
  reset(): AppConfig {
    write(structuredClone(DEFAULT_CONFIG));
    return read();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function isLLMConfigured(): boolean {
  const { apiKey, baseUrl } = read().llm;
  return Boolean(apiKey.trim() && baseUrl.trim());
}

/* React hook helper (lightweight, no external dep) */
import { useEffect, useState } from 'react';

export function useAppConfig(): AppConfig {
  const [cfg, setCfg] = useState<AppConfig>(() => configStore.get());
  useEffect(() => configStore.subscribe(setCfg), []);
  return cfg;
}
