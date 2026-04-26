import { useState, useEffect, useRef, useCallback } from 'react';
import workersData from './workers/information.json';
import type { DiscussionThread } from '../../types/discussion';
import {
  TICK_MS, FADE_MS, HOLD_COMPLETED, DISCUSSION_POLL_MS,
  SEGMENT_LEN, IDLE_GROUP_SIZE,
  MORCANDI_GRADIENTS, STATUS_CONFIG,
  type WorkerStatus,
} from '../config/workerConfig';

// ─── Text segmenter (for long task messages) ────────────────────────────────
function getSegments(text: string): string[] {
  if (!text) return [''];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += SEGMENT_LEN) {
    out.push(text.slice(i, i + SEGMENT_LEN));
  }
  return out;
}

// ─── Idle group: consecutive phrases joined with newlines ────────────────────
function getIdleGroupText(phrases: string[], startIdx: number): string {
  const n = phrases.length;
  return Array.from({ length: IDLE_GROUP_SIZE }, (_, offset) => phrases[(startIdx + offset) % n]).join('\n');
}

// ─── Per-worker tick state ────────────────────────────────────────────────────
interface TickState {
  status: WorkerStatus;
  phraseIndex: number;
  segmentIndex: number;
  displayText: string;
  visible: boolean;
}

interface WorkerStatusPanelProps {
  discussions?: DiscussionThread[];
}

export function WorkerStatusPanel({ discussions: externalDiscussions }: WorkerStatusPanelProps) {

  // ── Initial state ─────────────────────────────────────────────────────────
  const [states, setStates] = useState<Record<string, TickState>>(() => {
    const init: Record<string, TickState> = {};
    workersData.forEach(w => {
      init[w.skill_id] = { status: 'idle', phraseIndex: 0, segmentIndex: 0, displayText: getIdleGroupText(w.intro_phrases, 0), visible: true };
    });
    return init;
  });
  const stateRef = useRef(states);
  stateRef.current = states;

  // ── Internal polling ──────────────────────────────────────────────────────
  const [internalDiscussions, setInternalDiscussions] = useState<DiscussionThread[]>([]);
  const discussions = externalDiscussions ?? internalDiscussions;

  useEffect(() => {
    if (externalDiscussions !== undefined) return;
    const poll = async () => {
      try {
        const r = await (window as any).electronAPI?.getDiscussions();
        if (r?.success && r.discussions) setInternalDiscussions(r.discussions);
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, DISCUSSION_POLL_MS);
    return () => clearInterval(id);
  }, [externalDiscussions]);

  // ── Timer refs ────────────────────────────────────────────────────────────
  const tickerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const holdRefs   = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Fade helper: set invisible → swap text → set visible ─────────────────
  const fadeSwap = useCallback((skillId: string, updater: (prev: TickState) => Partial<TickState>) => {
    setStates(prev => ({ ...prev, [skillId]: { ...prev[skillId], visible: false } }));
    setTimeout(() => {
      setStates(prev => {
        const cur = prev[skillId];
        if (!cur) return prev;
        return { ...prev, [skillId]: { ...cur, ...updater(cur), visible: true } };
      });
    }, FADE_MS);
  }, []);

  // ── Stop ticker ───────────────────────────────────────────────────────────
  const stopTicker = useCallback((skillId: string) => {
    clearInterval(tickerRefs.current[skillId]);
    delete tickerRefs.current[skillId];
  }, []);

  // ── Idle ticker: cycle through phrase segments, then advance phrase ────────
  const startIdleTicker = useCallback((skillId: string) => {
    stopTicker(skillId);
    const worker = workersData.find(w => w.skill_id === skillId);
    if (!worker) return;

    tickerRefs.current[skillId] = setInterval(() => {
      const s = stateRef.current[skillId];
      if (!s || s.status !== 'idle') { stopTicker(skillId); return; }

      fadeSwap(skillId, (cur) => {
        // Slide window by 1 phrase each tick
        const nextPhrase = (cur.phraseIndex + 1) % worker.intro_phrases.length;
        return { phraseIndex: nextPhrase, segmentIndex: 0, displayText: getIdleGroupText(worker.intro_phrases, nextPhrase) };
      });
    }, TICK_MS);
  }, [stopTicker, fadeSwap]);

  // ── Message ticker: cycle through segments of a fixed message ─────────────
  const startMessageTicker = useCallback((skillId: string, fullMessage: string, status: WorkerStatus) => {
    stopTicker(skillId);
    clearTimeout(holdRefs.current[skillId]);
    const segs = getSegments(fullMessage);

    // Show first segment
    fadeSwap(skillId, () => ({ status, phraseIndex: 0, segmentIndex: 0, displayText: segs[0] }));

    if (segs.length < 2) return;

    let idx = 0;
    tickerRefs.current[skillId] = setInterval(() => {
      const s = stateRef.current[skillId];
      if (!s || s.status !== status) { stopTicker(skillId); return; }
      idx = (idx + 1) % segs.length;
      fadeSwap(skillId, () => ({ segmentIndex: idx, displayText: segs[idx] }));
    }, TICK_MS);
  }, [stopTicker, fadeSwap]);

  // ── Mount: start idle tickers ─────────────────────────────────────────────
  useEffect(() => {
    workersData.forEach(w => startIdleTicker(w.skill_id));
    return () => {
      Object.values(tickerRefs.current).forEach(clearInterval);
      Object.values(holdRefs.current).forEach(clearTimeout);
    };
  }, [startIdleTicker]);

  // ── Process discussion updates ─────────────────────────────────────────────
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!discussions?.length) return;

    discussions.forEach(thread => {
      const skillId = thread.startRecord.skill_id;
      if (!stateRef.current[skillId]) return;
      const id = thread.id;

      if (thread.endRecord) {
        if (processedRef.current.has(`${id}-end`)) return;
        processedRef.current.add(`${id}-end`);

        const status: WorkerStatus =
          thread.endRecord.status === 'success' ? 'success'
          : thread.endRecord.status === 'failed' ? 'failed'
          : 'partial';

        const msg = thread.endRecord.summary || thread.startRecord.task_objective;
        startMessageTicker(skillId, msg, status);

        holdRefs.current[skillId] = setTimeout(() => {
          stopTicker(skillId);
          const worker = workersData.find(w => w.skill_id === skillId);
          setStates(prev => ({
            ...prev,
            [skillId]: { status: 'idle', phraseIndex: 0, segmentIndex: 0, displayText: getIdleGroupText(worker?.intro_phrases ?? [''], 0), visible: true },
          }));
          startIdleTicker(skillId);
        }, HOLD_COMPLETED);

      } else if (thread.isActive) {
        if (processedRef.current.has(`${id}-start`)) return;
        processedRef.current.add(`${id}-start`);
        startMessageTicker(skillId, thread.startRecord.task_objective, 'working');
      }
    });
  }, [discussions, startMessageTicker, stopTicker, startIdleTicker]);

  // ── Avatar fallback ────────────────────────────────────────────────────────
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());
  const handleAvatarError = useCallback((id: string) => {
    setAvatarErrors(prev => new Set(prev).add(id));
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white">

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5 border-b border-gray-100">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-400" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
          员工状态
        </span>
      </div>

      {/* Worker rows */}
      <div className="flex-1 overflow-y-auto">
        {workersData.map(worker => {
          const s = states[worker.skill_id];
          const status = s?.status ?? 'idle';
          const cfg = STATUS_CONFIG[status];
          const gradient = MORCANDI_GRADIENTS[worker.color] ?? MORCANDI_GRADIENTS.blue;
          const useGradient = avatarErrors.has(worker.skill_id);

          return (
            <div
              key={worker.skill_id}
              className="px-4 py-3.5 border-b border-gray-100 transition-colors hover:bg-gray-50/50"
            >
              {/* ── Row 1: avatar · name/role · status badge ── */}
              <div className="flex items-center gap-3">

                {/* Avatar + status dot */}
                <div className="relative flex-shrink-0">
                  {!useGradient ? (
                    <img
                      src={`./workers/${encodeURIComponent(worker.avatar_file)}`}
                      alt={worker.worker_name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-gray-100"
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
                      onError={() => handleAvatarError(worker.skill_id)}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-gray-100"
                      style={{ background: gradient, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
                    >
                      <span className="text-white text-xs font-semibold">{worker.role[0]}</span>
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dot}`} />
                </div>

                {/* Name + full label */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold leading-tight truncate text-gray-800">
                    {worker.worker_name}
                  </div>
                  <div className="text-[10px] leading-tight mt-0.5 truncate text-gray-400">
                    {worker.worker_label}
                  </div>
                </div>

                {/* Status badge */}
                <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}>
                  {cfg.label}
                </div>
              </div>

              {/* ── Row 2: cycling ticker message (3-line area) ── */}
              <div className="mt-1.5 pl-12 h-[48px] overflow-hidden">
                <span
                  className={`text-[11px] leading-4 block whitespace-pre-line line-clamp-3 ${cfg.text}`}
                  style={{
                    opacity: s?.visible ? 1 : 0,
                    transform: s?.visible ? 'translateY(0)' : 'translateY(5px)',
                    transition: `opacity ${FADE_MS}ms ease-in-out, transform ${FADE_MS}ms ease-in-out`,
                  }}
                >
                  {s?.displayText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
