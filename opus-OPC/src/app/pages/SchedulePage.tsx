import { PageHeader } from '../components/common';
import { SCHEDULE_ITEMS, PLATFORMS } from '@/services/mock';

export function SchedulePage() {
  return (
    <div className="page-shell" data-testid="page-schedule">
      <div className="page-inner">
        <PageHeader
          title="排程日历 Schedule"
          description="周视图 · 拖拽调整发布时间（mock）。"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {SCHEDULE_ITEMS.map((day) => (
            <div key={day.date} className="panel p-4 min-h-[260px]">
              <div className="text-xs text-[color:var(--muted-foreground)]">{day.date}</div>
              <div className="text-base font-semibold mb-3">
                {new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'long' })}
              </div>
              <div className="space-y-2">
                {day.items.map((it, i) => {
                  const p = PLATFORMS.find((x) => x.id === it.platform);
                  return (
                    <div
                      key={i}
                      className="text-xs px-2.5 py-2 rounded-lg border-l-4"
                      style={{
                        background: 'var(--panel-muted)',
                        borderLeftColor: p?.color ?? '#999',
                      }}
                    >
                      <div className="font-medium">{it.time}</div>
                      <div className="text-[color:var(--muted-foreground)] truncate">
                        {it.title}
                      </div>
                      <div className="text-[10px] text-[color:var(--muted-foreground)] mt-1">
                        {p?.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
