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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: '总览 Dashboard', icon: LayoutDashboard, end: true },
  { to: '/studio', label: '内容创作 Studio', icon: PenSquare },
  { to: '/library', label: '素材库 Library', icon: FolderOpen },
  { to: '/distribute', label: '分发中心 Distribute', icon: Send },
  { to: '/schedule', label: '排程日历 Schedule', icon: Calendar },
  { to: '/streaming', label: '直播推流 Streaming', icon: Radio },
  { to: '/analytics', label: '数据分析 Analytics', icon: BarChart3 },
  { to: '/agents', label: 'AI 代理 Agents', icon: Bot },
  { to: '/settings', label: '设置 Settings', icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const current = NAV_ITEMS.find((i) =>
    i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="w-64 shrink-0 flex flex-col border-r"
        style={{ background: 'var(--sidebar)', borderColor: 'var(--panel-border)' }}
        data-testid="app-sidebar"
      >
        <div className="px-5 py-5 flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">OPUS-OPC</span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              一人公司工作台
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'font-medium'
                    : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]'
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
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div
          className="m-3 rounded-xl p-3 text-xs"
          style={{ background: 'var(--panel-muted)', border: '1px solid var(--panel-border)' }}
        >
          <div className="font-medium mb-1">本月套餐</div>
          <div className="text-[color:var(--muted-foreground)]">Solo Pro · 6 平台</div>
          <div className="mt-2 h-1.5 bg-[color:var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{ width: '62%', background: 'var(--primary)' }}
            />
          </div>
          <div className="mt-1 text-[10px] text-[color:var(--muted-foreground)]">
            62 / 100 次发布
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-14 shrink-0 flex items-center justify-between px-6 border-b"
          style={{ background: 'var(--panel-background)', borderColor: 'var(--panel-border)' }}
        >
          <div>
            <h1 className="text-base font-semibold" data-testid="page-title">
              {current?.label ?? 'OPUS-OPC'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-xs px-3 py-1.5 rounded-lg text-white"
              style={{ background: 'var(--primary)' }}
            >
              + 新建创作
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400" />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
