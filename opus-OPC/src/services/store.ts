// Generic localStorage-backed store with seed fallback and React hook.
// Used to persist drafts, assets, agents, schedule, etc.
//
// On first read, the store hydrates from seed data so first-run UX
// (and Playwright tests starting in fresh browser contexts) shows
// the same content as before — but every mutation persists.

import { useEffect, useState } from 'react';

interface Persisted<T> {
  v: number;     // schema version
  d: T;          // data
}

export interface PersistentStore<T> {
  get(): T;
  set(value: T): T;
  update(fn: (prev: T) => T): T;
  reset(): T;
  subscribe(fn: (value: T) => void): () => void;
}

export function createStore<T>(
  key: string,
  seed: T,
  version = 1,
): PersistentStore<T> {
  const storageKey = `opus-opc:${key}:v${version}`;
  const listeners = new Set<(value: T) => void>();

  function read(): T {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return structuredClone(seed);
      const parsed = JSON.parse(raw) as Persisted<T>;
      if (parsed?.v !== version) return structuredClone(seed);
      return parsed.d;
    } catch {
      return structuredClone(seed);
    }
  }

  function write(value: T): T {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ v: version, d: value }));
    } catch {
      /* ignore */
    }
    listeners.forEach((fn) => fn(value));
    return value;
  }

  return {
    get: read,
    set: (value: T) => write(value),
    update: (fn: (prev: T) => T) => write(fn(read())),
    reset: () => write(structuredClone(seed)),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** React hook bound to a PersistentStore. */
export function useStore<T>(store: PersistentStore<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setValue), [store]);
  const setter = (next: T | ((prev: T) => T)) => {
    if (typeof next === 'function') {
      store.update(next as (prev: T) => T);
    } else {
      store.set(next);
    }
  };
  return [value, setter];
}

/* ─── Concrete stores (seeded with current mock data) ─────── */

import {
  DRAFTS,
  ASSETS,
  AGENTS,
  SCHEDULE_ITEMS,
  ACTIVITY_FEED,
  AGENT_LOGS,
  STREAM_TARGETS,
  type ContentDraft,
} from './mock';

export const draftsStore   = createStore<ContentDraft[]>('drafts',   DRAFTS);
export const assetsStore   = createStore('assets',     ASSETS);
export const agentsStore   = createStore('agents',     AGENTS);
export const scheduleStore = createStore('schedule',   SCHEDULE_ITEMS);
export const activityStore = createStore('activity',   ACTIVITY_FEED);
export const agentLogsStore = createStore('agent-logs', AGENT_LOGS);
export const streamStore   = createStore('streams',    STREAM_TARGETS);

/** Append a new entry to the activity feed (most-recent first). */
export function recordActivity(entry: {
  type: 'publish' | 'agent' | 'comment';
  text: string;
  icon?: string;
}) {
  activityStore.update((cur) => [
    {
      id: 'af-' + Date.now(),
      time: '刚刚',
      icon: entry.icon ?? '•',
      ...entry,
    },
    ...cur,
  ].slice(0, 50));
}
