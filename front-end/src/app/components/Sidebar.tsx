import { Plus, LayoutDashboard, FolderOpen, Receipt, Bot, BarChart3, Info, Trash2, Pin, PinOff, Clock, LineChart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Task } from '../App';
import logo from '../../imports/Union.png';

interface SidebarProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onMarkAsRead: (taskId: string) => void;
  currentTaskId: string | null;
  setCurrentTaskId: (taskId: string | null) => void;
}

export function Sidebar({ tasks, onDeleteTask, onTogglePin, onMarkAsRead, currentTaskId, setCurrentTaskId }: SidebarProps) {
  const [activeTabType, setActiveTabType] = useState<string>('home');

  // Listen to tab changes from MainContent to sync sidebar highlight
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tabType?: string }>).detail;
      setActiveTabType(detail?.tabType ?? 'home');
    };
    window.addEventListener('workbuddy:tab-changed', handler);
    return () => window.removeEventListener('workbuddy:tab-changed', handler);
  }, []);
  

  // Dispatch open-tab event to MainContent
  const openTab = (tabType: string, title: string, taskId?: string) => {
    window.dispatchEvent(new CustomEvent('workbuddy:open-tab', {
      detail: { tabType, title, taskId }
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask(taskId);
    setContextMenu(null);
    const remainingTasks = tasks.filter(task => task.id !== taskId);
    if (remainingTasks.length === 0) {
      setCurrentTaskId(null);
    }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const navItems = [
    { id: 'dashboard', label: '控制台', icon: LayoutDashboard, tabType: 'dashboard' as const },
    { id: 'market', label: '行情', icon: LineChart, tabType: 'market' as const },
    { id: 'files', label: '文件库', icon: FolderOpen, tabType: 'files' as const },
    { id: 'schedule', label: '定时任务', icon: Clock, tabType: 'schedule' as const },
    { id: 'trading', label: '交易管理', icon: Receipt, tabType: 'trading' as const },
    { id: 'agent', label: 'Agent', icon: Bot, tabType: 'agent' as const },
  ];

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
          {/* 控制台 → 首页 */}
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTabType === 'home' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => {
              setCurrentTaskId(null);
              openTab('home', '首页');
            }}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">控制台</span>
          </button>

          {navItems.filter(n => n.id !== 'dashboard').map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-1 ${
                  activeTabType === item.tabType ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setCurrentTaskId(null);
                  openTab(item.tabType, item.label);
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
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
                openTab('home', '首页');
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
                      openTab('chat', task.title, task.id);
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
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            activeTabType === 'usage' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => {
            setCurrentTaskId(null);
            openTab('usage', '用量统计');
          }}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">用量统计</span>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-1 ${
            activeTabType === 'about' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => {
            setCurrentTaskId(null);
            openTab('about', '关于本机');
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">关于本机</span>
        </button>
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
