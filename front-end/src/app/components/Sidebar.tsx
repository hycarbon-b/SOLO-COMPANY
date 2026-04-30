import { Plus, LayoutDashboard, FolderOpen, Receipt, Bot, BarChart3, Info, Trash2, Pin, PinOff, Clock, LineChart, Radio, Terminal, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Task } from '../App';
import type { TabType } from './MainContent';
import logo from '../../imports/Union.png';

interface SidebarProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onMarkAsRead: (taskId: string) => void;
  currentTaskId: string | null;
  setCurrentTaskId: (taskId: string | null) => void;
  activeTabType: string;
  onOpenTab: (tabType: TabType, title: string, taskId?: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  tabType: TabType;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'home', label: '控制台', icon: LayoutDashboard, tabType: 'home' },
];

const MIDDLE_NAV: NavItem[] = [
  { id: 'market', label: '行情', icon: LineChart, tabType: 'market' },
  { id: 'files', label: '文件库', icon: FolderOpen, tabType: 'files' },
  { id: 'schedule', label: '定时任务', icon: Clock, tabType: 'schedule' },
  { id: 'monitor', label: '监控工作流', icon: Radio, tabType: 'monitor' },
  { id: 'ws-debug', label: 'WS 调试台', icon: Terminal, tabType: 'ws-debug' },
  { id: 'trading', label: '交易管理', icon: Receipt, tabType: 'trading' },
  { id: 'agent', label: 'Agent', icon: Bot, tabType: 'agent' },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'usage', label: '用量统计', icon: BarChart3, tabType: 'usage' },
  { id: 'about', label: '关于本机', icon: Info, tabType: 'about' },
];

export function Sidebar({ tasks, onDeleteTask, onTogglePin, onMarkAsRead, currentTaskId, setCurrentTaskId, activeTabType, onOpenTab }: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);

  const goToTab = (item: NavItem) => {
    setCurrentTaskId(null);
    onOpenTab(item.tabType, item.label);
  };

  const renderNavButton = (item: NavItem, extraClass = '') => {
    const Icon = item.icon;
    const active = activeTabType === item.tabType;
    return (
      <button
        key={item.id}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${extraClass} ${
          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
        }`}
        onClick={() => goToTab(item)}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">{item.label}</span>
      </button>
    );
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask(taskId);
    setContextMenu(null);
    const remainingTasks = tasks.filter(task => task.id !== taskId);
    if (remainingTasks.length === 0) {
      setCurrentTaskId(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  };

  const handleCloseContextMenu = () => setContextMenu(null);

  return (
    <aside className="h-full bg-white flex flex-col">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <img src={logo} alt="YUANJI T" className="w-7 h-7 flex-shrink-0" />
        <span className="font-semibold text-gray-900 truncate tracking-tight">YUANJI T</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="p-3">
          {PRIMARY_NAV.map(item => renderNavButton(item))}
          {MIDDLE_NAV.map(item => renderNavButton(item, 'mt-1'))}
        </div>

        {/* Tasks Section */}
        <div className="px-3 mt-6">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-gray-500">工作列表</span>
            <button
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                activeTabType === 'home' && currentTaskId === null
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              onClick={() => {
                setCurrentTaskId(null);
                onOpenTab('home', '首页');
              }}
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>新建工作</span>
            </button>
          </div>

          <div className="space-y-1">
            {tasks.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <div className="text-sm text-gray-400">暂无工作</div>
                <div className="text-xs text-gray-400 mt-1">点击上方新建工作</div>
              </div>
            ) : (
              [...tasks]
                .sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return 0;
                })
                .map((task) => (
                  <button
                    key={task.id}
                    className={`w-full px-3 py-2 text-left rounded-lg transition-colors relative ${
                      activeTabType === 'chat' && currentTaskId === task.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onContextMenu={(e) => handleContextMenu(e, task.id)}
                    onClick={() => {
                      setCurrentTaskId(task.id);
                      onOpenTab('chat', task.title, task.id);
                      if (task.hasUnread) {
                        onMarkAsRead(task.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {task.pinned && <Pin className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                      <div className="text-sm truncate flex-1">{task.title}</div>
                      {task.hasUnread && task.status && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'working' ? 'bg-yellow-500' :
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'error' ? 'bg-red-500' : ''
                        }`} />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{task.time}</div>
                  </button>
                ))
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3">
        {BOTTOM_NAV.map((item, idx) => renderNavButton(item, idx === 0 ? '' : 'mt-1'))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleCloseContextMenu} />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg py-1 min-w-[150px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                onTogglePin(contextMenu.taskId);
                setContextMenu(null);
              }}
            >
              {tasks.find(t => t.id === contextMenu.taskId)?.pinned ? (
                <><PinOff className="w-4 h-4" />取消置顶</>
              ) : (
                <><Pin className="w-4 h-4" />置顶</>
              )}
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
              onClick={() => handleDeleteTask(contextMenu.taskId)}
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
