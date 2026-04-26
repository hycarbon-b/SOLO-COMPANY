import { ReactNode, ComponentType } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ─── PageHeader ──────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="panel-soft p-5 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-[color:var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── Badge ───────────────────────────────────────────────── */
export function Badge({
  children,
  color = 'gray',
  dot,
}: {
  children: ReactNode;
  color?: 'gray' | 'green' | 'red' | 'amber' | 'indigo' | 'pink' | 'blue' | 'yellow';
  dot?: boolean;
}) {
  const palette: Record<string, string> = {
    gray:   'bg-slate-100 text-slate-600',
    green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
    red:    'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
    amber:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
    indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60',
    pink:   'bg-pink-50 text-pink-700 ring-1 ring-pink-200/60',
    blue:   'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60',
    yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200/60',
  };
  const dotColor: Record<string, string> = {
    gray: '#94a3b8', green: '#10b981', red: '#ef4444',
    amber: '#f59e0b', indigo: '#6366f1', pink: '#ec4899',
    blue: '#0ea5e9', yellow: '#eab308',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${palette[color]}`}>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: dotColor[color] }}
        />
      )}
      {children}
    </span>
  );
}

/* ─── StatusDot ───────────────────────────────────────────── */
export function StatusDot({ status }: { status: 'running' | 'idle' | 'error' | 'live' }) {
  const cfg = {
    running: { bg: 'var(--status-running)', pulse: true },
    live:    { bg: 'var(--status-live)',    pulse: true },
    idle:    { bg: 'var(--status-idle)',    pulse: false },
    error:   { bg: 'var(--status-error)',   pulse: false },
  };
  const { bg, pulse } = cfg[status];
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full status-dot-ping"
          style={{ background: bg, color: bg }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: bg }} />
    </span>
  );
}

/* ─── PlatformChip ────────────────────────────────────────── */
export function PlatformChip({ name, color, short }: { name: string; color: string; short?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: `${color}18`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
      {short ?? name}
    </span>
  );
}

/* ─── StatCard ────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  delta,
  accent,
  icon: Icon,
  accentColor,
  live,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  accent?: string;
  icon?: ComponentType<{ className?: string }>;
  accentColor?: string;
  live?: boolean;
}) {
  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');
  const trendColor = isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-[color:var(--muted-foreground)]';

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] text-[color:var(--muted-foreground)] font-medium leading-snug">{label}</span>
        {Icon && (
          <div
            className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
            style={{ background: accentColor ? `${accentColor}14` : 'var(--panel-muted)' }}
          >
            <Icon
              className="h-4 w-4"
              style={{ color: accentColor ?? 'var(--muted-foreground)' }}
            />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-[26px] font-semibold tracking-tight leading-none">{value}</span>
        {live && (
          <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />LIVE
          </span>
        )}
      </div>
      {delta && (
        <div className={`flex items-center gap-1 ${trendColor}`}>
          {isPositive && <TrendingUp className="h-3 w-3 shrink-0 text-emerald-500" />}
          {isNegative && <TrendingDown className="h-3 w-3 shrink-0 text-rose-500" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3 shrink-0" />}
          <span className="text-[12px] font-medium">{delta}</span>
        </div>
      )}
    </div>
  );
}

/* ─── SectionTitle ────────────────────────────────────────── */
export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[13px] font-semibold text-[color:var(--foreground)]">{children}</h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────── */
export function EmptyState({ icon, title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <div className="text-sm font-medium text-slate-600">{title}</div>
      {desc && <div className="text-xs text-[color:var(--muted-foreground)] mt-1">{desc}</div>}
    </div>
  );
}

