import {
  Target, TrendingUp, Activity, Cpu,
} from 'lucide-react';
import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel } from './ChatPanel';
import { ChatComposer } from './ChatComposer';
import { RightPanelContainer } from './RightPanelContainer';
import { FilesPage } from './FilesPage';
import { TradingPage } from './TradingPage';
import { AgentPage } from './AgentPage';
import { UsagePage } from './UsagePage';
import { AboutPage } from './AboutPage';
import { SchedulePage } from './SchedulePage';
import { MarketPage } from './MarketPage';
import { MonitorPage } from './MonitorPage';
import { useChatSession } from '../hooks/useChatSession';

// === Tab Types ===
export type TabType = 'home' | 'files' | 'trading' | 'market' | 'agent' | 'schedule' | 'usage' | 'about' | 'chat' | 'web' | 'monitor';

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




export function MainContent({ onAddTask, tasks, onUpdateTaskTitle, onUpdateTaskStatus, tabs, activeTabId, onOpenTab: handleOpenTab, onCloseTab: _handleCloseTab }: MainContentProps) {
  // === Tab State ===
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveTaskId = activeTab?.type === 'chat' ? activeTab.taskId ?? null : null;

  // === Chat Session (state + persistence + send/agent flows) ===
  const {
    inputValue,
    setInputValue,
    messagesMap,
    isTyping,
    messages,
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

  // === Content Renderer (rendered inside the tab bar) ===
  const renderContent = () => {
    const tab = activeTab;
    if (!tab) return null;

    switch (tab.type) {
      case 'home':
        return renderHomeContent();
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
      case 'usage':
        return <UsagePage />;
      case 'about':
        return <AboutPage />;
      case 'chat':
        return renderChatContent(tab.taskId ?? null);
      case 'web':
        return renderWebContent(tab.url ?? '');
      default:
        return renderHomeContent();
    }
  };

  const renderHomeContent = () => (
    <main className="h-full flex overflow-hidden bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-white">
          <div className="w-full max-w-3xl">
            <h1 className="text-4xl text-center mb-12 text-gray-900">我能为你做什么？</h1>
            <div className="relative mb-6">
              <ChatComposer
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSendMessage}
                variant="home"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <QuickAction icon={Target} text="智能选股" onClick={() => setInputValue('帮我智能选股')} />
              <QuickAction icon={TrendingUp} text="行情分析" onClick={() => setInputValue('分析当前市场行情')} />
              <QuickAction icon={Activity} text="技术分析" onClick={() => setInputValue('进行技术分析')} />
              <QuickAction icon={Cpu} text="策略生成" onClick={() => setInputValue('生成交易策略')} />
            </div>
          </div>
        </div>
    </main>
  );

  const renderWebContent = (url: string) => {
    if (!url) {
      return (
        <main className="h-full flex items-center justify-center bg-white text-gray-500">
          未提供网址
        </main>
      );
    }
    return (
      <main className="h-full flex flex-col bg-white">
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500 truncate" title={url}>
          {url}
        </div>
        <div className="flex-1 overflow-hidden">
          {/* Electron webview 标签用于嵌入外部网页 */}
          {React.createElement('webview', {
            src: url,
            style: { width: '100%', height: '100%', display: 'inline-flex' },
            allowpopups: 'true',
          })}
        </div>
      </main>
    );
  };

  const renderChatContent = (taskId: string | null) => {
    const chatMessages = taskId ? (messagesMap[taskId] || []) : [];
    const chatTask = tasks.find(t => t.id === taskId);    return (
      <main className="h-full flex overflow-hidden bg-white">
        <PanelGroup direction="horizontal" className="flex-1">
          <Panel defaultSize={75} minSize={50}>
            <ChatPanel
              messages={chatMessages}
              isTyping={isTyping}
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSendMessage={handleSendMessage}
              messagesEndRef={messagesEndRef}
              taskTitle={chatTask?.title}
              onUpdateTitle={(newTitle) => taskId && onUpdateTaskTitle(taskId, newTitle)}
              onOpenTab={handleOpenTab}
            />
          </Panel>
          <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />
          <RightPanelContainer onAgentTaskComplete={handleAgentTaskComplete} />
        </PanelGroup>
      </main>
    );
  };

  return (
    <div className="h-full overflow-hidden">
      {renderContent()}
    </div>
  );
}

function QuickAction({ icon: Icon, text, onClick }: { icon: any; text: string; onClick?: () => void }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all" onClick={onClick}>
      <Icon className="w-4 h-4 text-gray-600" />
      <span className="text-sm text-gray-700">{text}</span>
    </button>
  );
}
