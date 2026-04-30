import { HomeView } from './HomeView';
import { WebView } from './WebView';
import { ChatView } from './ChatView';
import { FilesPage } from './FilesPage';
import { TradingPage } from './TradingPage';
import { AgentPage } from './AgentPage';
import { UsagePage } from './UsagePage';
import { AboutPage } from './AboutPage';
import { SchedulePage } from './SchedulePage';
import { MarketPage } from './MarketPage';
import { MonitorPage } from './MonitorPage';
import { WsPlaygroundPage } from './WsPlaygroundPage';
import { useChatSession } from '../hooks/useChatSession';

// === Tab Types ===
export type TabType = 'home' | 'files' | 'trading' | 'market' | 'agent' | 'schedule' | 'usage' | 'about' | 'chat' | 'web' | 'monitor' | 'ws-debug';

export interface Tab {
  id: string;           // unique tab id
  type: TabType;
  title: string;
  taskId?: string;      // for chat tabs
  url?: string;         // for web tabs
}

interface MainContentProps {
  onAddTask: (title: string) => string;
  tasks: Array<{ id: string; title: string; time: string; status?: string; hasUnread?: boolean; pinned?: boolean }>;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'idle' | 'working' | 'completed' | 'error') => void;
  // Tab state managed externally (in App.tsx)
  tabs: Tab[];
  activeTabId: string;
  onOpenTab: (type: TabType, title: string, taskId?: string, url?: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function MainContent({
  onAddTask,
  tasks,
  onUpdateTaskTitle,
  onUpdateTaskStatus,
  tabs,
  activeTabId,
  onOpenTab: handleOpenTab,
  onCloseTab: _handleCloseTab,
}: MainContentProps) {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveTaskId = activeTab?.type === 'chat' ? activeTab.taskId ?? null : null;

  const {
    inputValue,
    setInputValue,
    messagesMap,
    isTyping,
    messagesEndRef,
    handleSendMessage,
    handleAgentStartChat,
    handleAgentTaskComplete,
  } = useChatSession({
    effectiveTaskId,
    tasks,
    onAddTask,
    onUpdateTaskStatus,
    onOpenTab: handleOpenTab,
  });

  const renderContent = () => {
    if (!activeTab) return null;

    switch (activeTab.type) {
      case 'files':
        return <FilesPage />;
      case 'trading':
        return <TradingPage />;
      case 'market':
        return <MarketPage />;
      case 'agent':
        return <AgentPage onStartChat={handleAgentStartChat} />;
      case 'schedule':
        return <SchedulePage />;
      case 'monitor':
        return <MonitorPage />;
      case 'ws-debug':
        return <WsPlaygroundPage />;
      case 'usage':
        return <UsagePage />;
      case 'about':
        return <AboutPage />;
      case 'web':
        return <WebView url={activeTab.url ?? ''} />;
      case 'chat': {
        const taskId = activeTab.taskId ?? null;
        return (
          <ChatView
            taskId={taskId}
            taskTitle={tasks.find(t => t.id === taskId)?.title}
            messages={taskId ? (messagesMap[taskId] || []) : []}
            isTyping={isTyping}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSendMessage={handleSendMessage}
            messagesEndRef={messagesEndRef}
            onUpdateTaskTitle={onUpdateTaskTitle}
            onOpenTab={handleOpenTab}
            onAgentTaskComplete={handleAgentTaskComplete}
          />
        );
      }
      case 'home':
      default:
        return (
          <HomeView
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSendMessage={handleSendMessage}
          />
        );
    }
  };

  return <div className="h-full overflow-hidden">{renderContent()}</div>;
}
