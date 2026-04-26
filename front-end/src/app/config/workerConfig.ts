// ─── Worker Status Panel Configuration ───────────────────────────────────────
// Tune these values to adjust the visual behavior of the worker status panel.

// ─── Text ticker timing ───────────────────────────────────────────────────────
/** How often the ticker text swaps (ms) */
export const TICK_MS = 3200;
/** Fade-out duration before each text swap (ms) */
export const FADE_MS = 380;
/** How long a completed/failed state is shown before returning to idle (ms) */
export const HOLD_COMPLETED = 9000;
/** Internal discussion polling interval (ms) */
export const DISCUSSION_POLL_MS = 5000;

// ─── Text segmenter ───────────────────────────────────────────────────────────
/** Max characters per segment for long task messages */
export const SEGMENT_LEN = 42;
/** Number of idle phrases shown at once (stacked with newlines) */
export const IDLE_GROUP_SIZE = 3;

// ─── Morcandi (莫兰迪) desaturated palette ────────────────────────────────────
export const MORCANDI_GRADIENTS: Record<string, string> = {
  blue:    'linear-gradient(135deg, #8FA8BB 0%, #6E90A8 100%)',
  emerald: 'linear-gradient(135deg, #8FB4A2 0%, #6D9E8A 100%)',
  violet:  'linear-gradient(135deg, #A99FC4 0%, #8D83B4 100%)',
  orange:  'linear-gradient(135deg, #C4A882 0%, #A88B64 100%)',
  red:     'linear-gradient(135deg, #C49DA0 0%, #AB8184 100%)',
  indigo:  'linear-gradient(135deg, #909DC4 0%, #7481B0 100%)',
};

// ─── Worker status display config ─────────────────────────────────────────────
export type WorkerStatus = 'idle' | 'working' | 'success' | 'failed' | 'partial';

export const STATUS_CONFIG: Record<WorkerStatus, { label: string; badge: string; dot: string; text: string }> = {
  idle:    { label: '待机',     badge: 'bg-stone-100 text-stone-400 border-stone-200',               dot: 'bg-stone-300',                text: 'text-stone-400' },
  working: { label: '工作中',   badge: 'bg-[#FBF5E8] text-[#A07830] border-[#DFC898] animate-pulse', dot: 'bg-[#D4A84B] animate-pulse',  text: 'text-[#9E7730]' },
  success: { label: '已完成',   badge: 'bg-[#EBF4EF] text-[#3D8A5E] border-[#A8D4B8]',              dot: 'bg-[#6BBF8E]',                text: 'text-[#3D7A55]' },
  failed:  { label: '失败',     badge: 'bg-[#F8EDEC] text-[#9E5050] border-[#DCAAAA]',              dot: 'bg-[#C47878]',                text: 'text-[#8F4848]' },
  partial: { label: '部分完成', badge: 'bg-[#FAF2E8] text-[#9A6E30] border-[#D9B888]',              dot: 'bg-[#C49050]',                text: 'text-[#8E6528]' },
};
