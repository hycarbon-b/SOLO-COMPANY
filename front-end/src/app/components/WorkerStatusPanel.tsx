import { useState, useEffect, useRef, useCallback } from 'react';
import workersData from './workers/information.json';
import type { DiscussionThread } from '../../types/discussion';

// ─── Types ──────────────────────────────────────────────────────────────────────
type WorkerStatus = 'idle' | 'working' | 'success' | 'failed' | 'partial';

// ─── Morcandi (莫兰迪) desaturated palette ────────────────────────────────────
const MORCANDI_GRADIENTS: Record<string, string> = {
  blue:    'linear-gradient(135deg, #8FA8BB 0%, #6E90A8 100%)',
  emerald: 'linear-gradient(135deg, #8FB4A2 0%, #6D9E8A 100%)',
  violet:  'linear-gradient(135deg, #A99FC4 0%, #8D83B4 100%)',
  orange:  'linear-gradient(135deg, #C4A882 0%, #A88B64 100%)',
  red:     'linear-gradient(135deg, #C49DA0 0%, #AB8184 100%)',
  indigo:  'linear-gradient(135deg, #909DC4 0%, #7481B0 100%)',
};

const STATUS_CONFIG: Record<WorkerStatus, { label: string; badge: string; dot: string; text: string }> = {
  idle:    { label: '待机',    badge: 'bg-stone-100 text-stone-400 border-stone-200',               dot: 'bg-stone-300',                text: 'text-stone-400' },
  working: { label: '工作中',  badge: 'bg-[#FBF5E8] text-[#A07830] border-[#DFC898] animate-pulse', dot: 'bg-[#D4A84B] animate-pulse',  text: 'text-[#9E7730]' },
  success: { label: '已完成',  badge: 'bg-[#EBF4EF] text-[#3D8A5E] border-[#A8D4B8]',              dot: 'bg-[#6BBF8E]',                text: 'text-[#3D7A55]' },
  failed:  { label: '失败',    badge: 'bg-[#F8EDEC] text-[#9E5050] border-[#DCAAAA]',              dot: 'bg-[#C47878]',                text: 'text-[#8F4848]' },
  partial: { label: '部分完成', badge: 'bg-[#FAF2E8] text-[#9A6E30] border-[#D9B888]',              dot: 'bg-[#C49050]',                text: 'text-[#8E6528]' },
};

// ─── Text segmenter ───────────────────────────────────────────────────────────
// Split text into character-count segments (works for CJK — no ellipsis, hard clip)
const SEGMENT_LEN = 13;
function getSegments(text: string): string[] {
  if (!text) return [''];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += SEGMENT_LEN) {
    out.push(text.slice(i, i + SEGMENT_LEN));
  }
  return out;
}

// ─── Per-worker tick state ────────────────────────────────────────────────────
interface TickState {
  status: WorkerStatus;
  phraseIndex: number;
  segmentIndex: number;
  displayText: string;
  visible: boolean;
}

// ─── Timing constants ─────────────────────────────────────────────────────────
const TICK_MS        = 3200;   // how often text swaps
const FADE_MS        = 380;    // fade-out duration before swap
const HOLD_COMPLETED = 9000;   // how long completed state shows before returning to idle

interface WorkerStatusPanelProps {
  discussions?: DiscussionThread[];
}

export function WorkerStatusPanel({ discussions: externalDiscussions }: WorkerStatusPanelProps) {

  // ── Initial state ─────────────────────────────────────────────────────────
  const [states, setStates] = useState<Record<string, TickState>>(() => {
    const init: Record<string, TickState> = {};
    workersData.forEach(w => {
      const segs = getSegments(w.intro_phrases[0]);
      init[w.skill_id] = { status: 'idle', phraseIndex: 0, segmentIndex: 0, displayText: segs[0], visible: true };
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
    const id = setInterval(poll, 5000);
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
        const currentPhrase = worker.intro_phrases[cur.phraseIndex];
        const segs = getSegments(currentPhrase);
        const nextSeg = cur.segmentIndex + 1;

        if (nextSeg < segs.length) {
          // Next segment of same phrase
          return { segmentIndex: nextSeg, displayText: segs[nextSeg] };
        } else {
          // Advance to next phrase, reset to segment 0
          const nextPhrase = (cur.phraseIndex + 1) % worker.intro_phrases.length;
          const newSegs = getSegments(worker.intro_phrases[nextPhrase]);
          return { phraseIndex: nextPhrase, segmentIndex: 0, displayText: newSegs[0] };
        }
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
          const segs = getSegments(worker?.intro_phrases[0] ?? '');
          setStates(prev => ({
            ...prev,
            [skillId]: { status: 'idle', phraseIndex: 0, segmentIndex: 0, displayText: segs[0], visible: true },
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

              {/* ── Row 2: cycling ticker message ── */}
              <div className="mt-2 pl-12 h-[16px] overflow-hidden">
                <span
                  className={`text-[11px] leading-4 block whitespace-nowrap ${cfg.text}`}
                  style={{
                    opacity: s?.visible ? 1 : 0,
                    transform: s?.visible ? 'translateY(0)' : 'translateY(4px)',
                    transition: `opacity ${FADE_MS}ms ease-in-out, transform ${FADE_MS}ms ease-in-out`,
                    textOverflow: 'clip',
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
