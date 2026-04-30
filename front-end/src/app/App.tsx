import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import type { Tab, TabType } from './components/MainContent';
import { SplashScreen } from './components/SplashScreen';
import {
  newConversationId, loadTasks, saveTasks, clearAll,
  type StoredTask,
} from '../services/conversationStore';
import {
  Home, FileText, TrendingUp, Table, Cpu, Activity,
  HardDrive, Target, Globe, Plus, X, Radio, Terminal
} from 'lucide-react';

// === Tab Icons ===
const TAB_ICONS: Record<TabType, React.ReactNode> = {
  home: <Home className="w-3.5 h-3.5 flex-shrink-0" />,
  files: <FileText className="w-3.5 h-3.5 flex-shrink-0" />,
  trading: <Table className="w-3.5 h-3.5 flex-shrink-0" />,
  market: <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />,
  agent: <Cpu className="w-3.5 h-3.5 flex-shrink-0" />,
  schedule: <Activity className="w-3.5 h-3.5 flex-shrink-0" />,
  usage: <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />,
  about: <FileText className="w-3.5 h-3.5 flex-shrink-0" />,
  chat: <Target className="w-3.5 h-3.5 flex-shrink-0" />,
  web: <Globe className="w-3.5 h-3.5 flex-shrink-0" />,
  monitor: <Radio className="w-3.5 h-3.5 flex-shrink-0" />,
  'ws-debug': <Terminal className="w-3.5 h-3.5 flex-shrink-0" />,
};

// === Full-width Edge/Figma-style TabBar ===
function AppTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}) {
  return (
    <div
      className="flex items-end h-9 bg-neutral-100 select-none flex-shrink-0 overflow-x-auto scrollbar-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-end h-full min-w-0 pl-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isClosable = tab.type !== 'home';
          return (
            <div
              key={tab.id}
              title={tab.title}
              onClick={() => onSelectTab(tab.id)}
              className={`
                group relative flex items-center gap-1.5 px-3 cursor-pointer flex-shrink-0
                min-w-[80px] max-w-[200px] h-full
                transition-colors duration-100 rounded-t-[6px]
                ${isActive
                  ? 'bg-white text-gray-800 z-10 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.06)]'
                  : 'bg-transparent text-gray-500 hover:bg-neutral-200/60 hover:text-gray-700'
                }
              `}
              style={isActive ? {
                borderTop: '1px solid rgb(229 229 229)',
                borderLeft: '1px solid rgb(229 229 229)',
                borderRight: '1px solid rgb(229 229 229)',
                borderBottom: '1px solid white',
                marginBottom: '-1px',
              } : {}}
            >
              <span className={isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}>
                {TAB_ICONS[tab.type]}
              </span>
              <span className={`flex-1 truncate text-xs font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                {tab.title}
              </span>
              {isClosable ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                  className={`
                    ml-0.5 w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0
                    transition-colors
                    ${isActive
                      ? 'opacity-0 group-hover:opacity-100 hover:bg-neutral-200 text-gray-500'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-neutral-300 text-gray-400'
                    }
                  `}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}
            </div>
          );
        })}

        {/* New-tab button */}
        <button
          onClick={onNewTab}
          className="ml-1 mb-1 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-neutral-200 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right drag area filler */}
      <div className="flex-1 h-full" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
    </div>
  );
}

export type Task = StoredTask;

const SEED_TASKS: Task[] = [
  { id: '1', title: '今日市场行情分析', time: '2小时前', status: 'completed', hasUnread: false },
  { id: '4', title: '生成双均线交易策略', time: '5小时前', status: 'completed', hasUnread: false },
  { id: '5', title: '智能选股推荐', time: '1小时前', status: 'completed', hasUnread: false },
  { id: '6', title: '美股筛选', time: '30分钟前', status: 'working', hasUnread: true },
  { id: '2', title: '量化交易策略优化', time: '1天前', status: 'working', hasUnread: true },
  { id: '3', title: '持仓风险评估报告', time: '3天前', status: 'error', hasUnread: true },
];

export default function App() {
  // Splash screen state — every cold start shows the splash
  const [splashDone, setSplashDone] = useState(false);
  const [appVisible, setAppVisible] = useState(false);

  useEffect(() => {
    if (!splashDone) return;
    // 主界面在 splash 淡出后再缓入，让两段动画错开
    const t = setTimeout(() => setAppVisible(true), 80);
    return () => clearTimeout(t);
  }, [splashDone]);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = loadTasks();
    return stored.length > 0 ? stored : SEED_TASKS;
  });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // === Tab State (lifted here so TabBar spans full width) ===
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'home', type: 'home', title: '首页' },
  ]);
  const [activeTabId, setActiveTabId] = useState('home');

  const handleOpenTab = useCallback((type: TabType, title: string, taskId?: string, url?: string) => {
    const tabKey =
      type === 'chat' && taskId
        ? `chat-${taskId}`
        : type === 'web' && url
          ? `web-${url}`
          : type;

    const existing = tabs.find(t =>
      type === 'chat' && taskId
        ? t.taskId === taskId
        : type === 'web' && url
          ? t.type === 'web' && t.url === url
          : t.type === type
    );
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: Tab = { id: tabKey, type, title, taskId, url };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(tabKey);
    }
  }, [tabs]);

  const handleCloseTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (!tab || tab.type === 'home') return prev;
      const idx = prev.findIndex(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[Math.max(0, idx - 1)]?.id ?? 'home');
      }
      return newTabs;
    });
  }, [activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Electron: open web tabs from main process
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onOpenWebTab) return;
    const off = api.onOpenWebTab((data: { url: string }) => {
      if (!data?.url) return;
      let title = data.url;
      try {
        const u = new URL(data.url);
        title = u.host + (u.pathname && u.pathname !== '/' ? u.pathname : '');
      } catch { /* keep raw */ }
      handleOpenTab('web', title, undefined, data.url);
    });
    return () => { if (typeof off === 'function') off(); };
  }, [handleOpenTab]);

  // Listen for global reset (triggered from AboutPage / settings)
  useEffect(() => {
    const handler = () => {
      clearAll();
      setTasks(SEED_TASKS);
      setCurrentTaskId(null);
      setTabs([{ id: 'home', type: 'home', title: '首页' }]);
      setActiveTabId('home');
      // Notify MainContent to clear in-memory message maps
      window.dispatchEvent(new CustomEvent('yuanji:reset-all'));
    };
    window.addEventListener('yuanji:do-reset', handler);
    return () => window.removeEventListener('yuanji:do-reset', handler);
  }, []);

  const handleAddTask = useCallback((title: string): string => {
    const newTask: Task = {
      id: newConversationId(),
      title: title || '新工作',
      time: '刚刚',
      status: 'working',
      hasUnread: false,
    };
    setTasks(prev => [newTask, ...prev]);
    setCurrentTaskId(newTask.id);
    return newTask.id;
  }, []);

  const handleMarkAsRead = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, hasUnread: false } : task
    ));
  }, []);

  const handleUpdateTaskTitle = useCallback((taskId: string, newTitle: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, title: newTitle } : task
    ));
    // Also update the corresponding chat tab title
    setTabs(prev => prev.map(t =>
      t.type === 'chat' && t.taskId === taskId ? { ...t, title: newTitle } : t
    ));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setCurrentTaskId(prev => prev === taskId ? null : prev);
    // Close the corresponding chat tab if open
    handleCloseTab(`chat-${taskId}`);
  }, [handleCloseTab]);

  const handleTogglePin = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, pinned: !task.pinned } : task
    ));
  }, []);

  const handleUpdateTaskStatus = useCallback((taskId: string, status: 'idle' | 'working' | 'completed' | 'error') => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status } : task
    ));
  }, []);

  return (
    <>
      {!splashDone && <SplashScreen onEnter={() => setSplashDone(true)} />}
      <div
        className="h-screen flex flex-col bg-white overflow-hidden"
        style={{
          opacity: appVisible ? 1 : 0,
          transform: appVisible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 800ms cubic-bezier(0.22, 1, 0.36, 1), transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Full-width Edge/Figma-style tab bar */}
        <AppTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCloseTab={handleCloseTab}
          onNewTab={() => handleOpenTab('home', '首页')}
        />

        {/* Content area — border-top creates the "active tab merge" line */}
        <div className="flex-1 overflow-hidden border-t border-neutral-200">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={15} minSize={12} maxSize={25}>
              <Sidebar
                tasks={tasks}
                onDeleteTask={handleDeleteTask}
                onTogglePin={handleTogglePin}
                onMarkAsRead={handleMarkAsRead}
                currentTaskId={currentTaskId}
                setCurrentTaskId={setCurrentTaskId}
                activeTabType={activeTab?.type ?? 'home'}
                onOpenTab={handleOpenTab}
              />
            </Panel>

            <PanelResizeHandle className="w-px bg-neutral-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

            <Panel defaultSize={85} minSize={50}>
              <MainContent
                onAddTask={handleAddTask}
                tasks={tasks}
                onUpdateTaskTitle={handleUpdateTaskTitle}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                tabs={tabs}
                activeTabId={activeTabId}
                onOpenTab={handleOpenTab}
                onCloseTab={handleCloseTab}
              />
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </>
  );
}