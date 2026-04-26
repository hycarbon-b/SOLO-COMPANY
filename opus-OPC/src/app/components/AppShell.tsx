import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenSquare,
  FolderOpen,
  Send,
  Calendar,
  Radio,
  BarChart3,
  Bot,
  Settings,
  Sparkles,
  Bell,
  Search,
  Plus,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: '工作区',
    items: [
      { to: '/', label: '总览', icon: LayoutDashboard, end: true },
      { to: '/studio', label: '内容创作', icon: PenSquare },
      { to: '/library', label: '素材库', icon: FolderOpen },
      { to: '/distribute', label: '分发中心', icon: Send },
      { to: '/schedule', label: '排程日历', icon: Calendar },
      { to: '/streaming', label: '直播推流', icon: Radio },
    ],
  },
  {
    label: '数据 & 智能',
    items: [
      { to: '/analytics', label: '数据分析', icon: BarChart3 },
      { to: '/agents', label: 'AI 代理', icon: Bot },
    ],
  },
];

const SETTINGS_ITEM = { to: '/settings', label: '设置', icon: Settings };

// Flatten for "current label" lookup in header
const ALL_ITEMS = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  SETTINGS_ITEM,
];

export function AppShell() {
  const location = useLocation();
  const current = ALL_ITEMS.find((i) =>
    (i as { end?: boolean }).end
      ? location.pathname === i.to
      : location.pathname.startsWith(i.to)
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col border-r overflow-hidden"
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--sidebar)',
          borderColor: 'var(--panel-border)',
          boxShadow: '1px 0 0 var(--panel-border)',
        }}
        data-testid="app-sidebar"
      >
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 shrink-0">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-bold tracking-wide">OPUS-OPC</span>
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              一人公司工作台
            </span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div
                className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--sidebar-section-label)' }}
              >
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={(item as { end?: boolean }).end}
                    className={({ isActive }) =>
                      cn(
                        'nav-active-bar flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors',
                        isActive
                          ? 'font-semibold'
                          : 'text-[color:var(--muted-foreground)] hover:bg-slate-50 hover:text-slate-800'
                      )
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'var(--sidebar-active)',
                            color: 'var(--sidebar-active-foreground)',
                          }
                        : undefined
                    }
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Settings as separator item */}
          <div
            className="my-2 border-t"
            style={{ borderColor: 'var(--panel-border)' }}
          />
          <NavLink
            to={SETTINGS_ITEM.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors',
                isActive
                  ? 'font-semibold'
                  : 'text-[color:var(--muted-foreground)] hover:bg-slate-50 hover:text-slate-800'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'var(--sidebar-active)', color: 'var(--sidebar-active-foreground)' }
                : undefined
            }
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>{SETTINGS_ITEM.label}</span>
          </NavLink>
        </nav>

        {/* Plan usage */}
        <div
          className="mx-3 mb-3 rounded-xl p-3"
          style={{ background: 'var(--panel-muted)', border: '1px solid var(--panel-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold">本月套餐</span>
            <span className="text-[10px] text-[color:var(--muted-foreground)]">62%</span>
          </div>
          <div className="progress-bar mb-1.5">
            <div className="progress-fill" style={{ width: '62%' }} />
          </div>
          <div className="text-[10px] text-[color:var(--muted-foreground)]">
            62 / 100 次发布 · 6 平台
          </div>
        </div>

        {/* User profile */}
        <div
          className="px-3 py-3 border-t flex items-center gap-2.5"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div
            className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--gradient-primary)' }}
          >
            张
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium truncate">张·Solo Founder</div>
            <div className="text-[10px] text-[color:var(--muted-foreground)]">plan@opus.so</div>
          </div>
          <User className="h-3.5 w-3.5 text-[color:var(--muted-foreground)] shrink-0" />
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header bar */}
        <header
          className="h-13 shrink-0 flex items-center justify-between px-5 border-b gap-4"
          style={{
            background: 'var(--panel-background)',
            borderColor: 'var(--panel-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-[color:var(--muted-foreground)] text-[12px]">OPUS-OPC</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <h1
              className="text-[13px] font-semibold truncate"
              data-testid="page-title"
            >
              {current?.label ?? 'Workspace'}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-primary">+ 新建创作</button>
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--gradient-primary)' }}
            >
              张
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

