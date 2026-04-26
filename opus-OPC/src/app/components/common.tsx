import { ReactNode } from 'react';

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
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({
  children,
  color = 'gray',
}: {
  children: ReactNode;
  color?: 'gray' | 'green' | 'red' | 'amber' | 'indigo' | 'pink' | 'blue';
}) {
  const palette: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    pink: 'bg-pink-100 text-pink-700',
    blue: 'bg-sky-100 text-sky-700',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${palette[color]}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <span className="text-xs text-[color:var(--muted-foreground)]">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {delta && (
        <span className="text-xs" style={{ color: accent ?? 'var(--success)' }}>
          {delta}
        </span>
      )}
    </div>
  );
}
