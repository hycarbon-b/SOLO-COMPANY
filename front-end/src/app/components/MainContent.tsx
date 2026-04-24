import {
  Paperclip, Mic, ArrowUp, Target, TrendingUp, Activity, Cpu, X, FileText,
  Image as ImageIcon, HardDrive, Upload, Table, Plus, Home
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { callOpenClawGateway } from '../../services/openclawGateway';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel } from './ChatPanel';
import { RightPanelContainer } from './RightPanelContainer';
import { FilesPage } from './FilesPage';
import { TradingPage } from './TradingPage';
import { AgentPage } from './AgentPage';
import type { DiscussionThread } from '../../types/discussion';
import type { Message, LibraryFile } from '../fakeChatData';
import { libraryFiles, fakeMessagesMap } from '../fakeChatData';
import { UsagePage } from './UsagePage';
import { AboutPage } from './AboutPage';
import { SchedulePage } from './SchedulePage';
import { MarketPage } from './MarketPage';
import { StrategyCard } from './StrategyCard';


// === Tab Types ===
type TabType = 'home' | 'files' | 'trading' | 'market' | 'agent' | 'schedule' | 'usage' | 'about' | 'chat';

interface Tab {
  id: string;           // unique tab id
  type: TabType;
  title: string;
  taskId?: string;      // for chat tabs
  icon?: React.ReactNode;
}

interface MainContentProps {
  onAddTask: (title: string) => string;
  currentTaskId: string | null;
  selectedMenu: string;
  tasks: Array<{ id: string; title: string; time: string; status?: string; hasUnread?: boolean; pinned?: boolean }>;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'idle' | 'working' | 'completed' | 'error') => void;
}

// === Tab Icons (inline SVGs for consistency) ===
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
};

// === TabBar Component ===
function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-white overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isClosable = tab.type !== 'home';
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all flex-shrink-0 min-w-0 max-w-[160px] ${
              isActive
                ? 'bg-blue-50 border border-blue-100'
                : 'text-gray-500 hover:bg-gray-50 border border-transparent'
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
              {TAB_ICONS[tab.type]}
            </span>
            <span className={`truncate ${isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
              {tab.title}
            </span>
            {isClosable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`ml-0.5 p-0.5 rounded transition-colors flex-shrink-0 ${
                  isActive
                    ? 'text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                    : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MainContent({ onAddTask, currentTaskId, selectedMenu, tasks, onUpdateTaskTitle, onUpdateTaskStatus }: MainContentProps) {
  // === Tab State ===
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'home', type: 'home', title: '首页' },
  ]);
  const [activeTabId, setActiveTabId] = useState('home');

  // Derive the effective taskId from the active tab
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveTaskId = activeTab?.type === 'chat' ? activeTab.taskId ?? null : null;

  // Sync tab changes back to Sidebar for highlight
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('workbuddy:tab-changed', {
      detail: { tabType: activeTab?.type ?? 'home' }
    }));
  }, [activeTabId, activeTab?.type]);

  // === Sidebar interaction → open/switch tab ===
  // This replaces direct selectedMenu navigation with tab-based navigation
  const handleOpenTab = (type: TabType, title: string, taskId?: string) => {
    // For chat tabs, key by taskId so the same task reuses the tab
    const tabKey = type === 'chat' && taskId ? `chat-${taskId}` : type;

    const existing = tabs.find(t => (type === 'chat' && taskId ? t.taskId === taskId : t.type === type));
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: Tab = { id: tabKey, type, title, taskId };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(tabKey);
    }
  };

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.type === 'home') return;
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);
      // If closing active tab, navigate to prev tab or home
      if (activeTabId === tabId) {
        const targetIdx = Math.max(0, idx - 1);
        setActiveTabId(newTabs[targetIdx]?.id ?? 'home');
      }
      return newTabs;
    });
  };

  // Expose tab-open function via a ref/event so Sidebar can trigger it
  // We'll use a global event approach via window
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tabType: TabType; title: string; taskId?: string }>).detail;
      // event type is 'workbuddy:open-tab'; detail contains { tabType, title, taskId }
      handleOpenTab(detail.tabType, detail.title, detail.taskId);
    };
    window.addEventListener('workbuddy:open-tab', handler);
    return () => window.removeEventListener('workbuddy:open-tab', handler);
  }, [tabs, activeTabId]);

  // === Chat State (same as before) ===
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedLibraryFiles, setAttachedLibraryFiles] = useState<LibraryFile[]>([]);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [libraryActiveTab, setLibraryActiveTab] = useState('全部');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const libraryTabs = ['全部', '文档', '幻灯片', '表格', '图片与视频', '策略代码', '更多'];

  const filteredLibraryFiles = libraryActiveTab === '全部'
    ? libraryFiles
    : libraryFiles.filter(f => f.type === libraryActiveTab);

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({
  ...fakeMessagesMap,
});

  const [isTyping, setIsTyping] = useState(false);
  const [messageSentTrigger, setMessageSentTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = effectiveTaskId ? (messagesMap[effectiveTaskId] || []) : [];
  const currentTask = tasks.find(t => t.id === effectiveTaskId);

  useEffect(() => {
    if (effectiveTaskId === null) {
      setIsTyping(false);
    }
  }, [effectiveTaskId]);

  useEffect(() => {
    if (effectiveTaskId) {
      if (isTyping) {
        onUpdateTaskStatus(effectiveTaskId, 'working');
      }
    }
  }, [isTyping, effectiveTaskId]);

  const handleAgentStartChat = (thread: DiscussionThread) => {
    const { startRecord } = thread
    const title = `${startRecord.worker_label} - ${startRecord.worker_name}`
    const taskId = onAddTask(title)
    
    // Create initial message with task context
    const welcomeMessage = `**任务目标：** ${startRecord.task_objective}\n\n${startRecord.task_context ? '**背景信息：** ' + startRecord.task_context + '\n\n' : ''}您可以继续提问或要求我执行相关操作。`
    
    setMessagesMap(prev => ({
      ...prev,
      [taskId]: [
        {
          id: `${taskId}-welcome`,
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        }
      ]
    }))
    
    onUpdateTaskStatus(taskId, 'idle')
    handleOpenTab('chat', title, taskId)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `${Date.now()}-user-${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    let taskIdToUse = effectiveTaskId;

    // If no active chat tab, create one
    if (effectiveTaskId === null) {
      taskIdToUse = onAddTask(inputValue.trim().substring(0, 30));
      // Open the new task as a chat tab
      handleOpenTab('chat', inputValue.trim().substring(0, 30), taskIdToUse);
    }

    const userContent = inputValue.trim();
    setInputValue('');
    setAttachedFiles([]);
    setAttachedLibraryFiles([]);
    setMessageSentTrigger(prev => prev + 1);

    if (taskIdToUse) {
      setMessagesMap(prev => ({
        ...prev,
        [taskIdToUse!]: [...(prev[taskIdToUse!] || []), userMessage],
      }));
      onUpdateTaskStatus(taskIdToUse, 'working');
    }

    setIsTyping(true);

    // 创建一个唯一的助手消息ID用于流式更新
    const assistantMsgId = `${Date.now()}-assistant-${Math.random().toString(36).slice(2, 9)}`;
    if (taskIdToUse) {
      setMessagesMap(prev => {
        const currentMessages = prev[taskIdToUse!] || [];
        return {
          ...prev,
          [taskIdToUse!]: [
            ...currentMessages,
            { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() },
          ],
        };
      });
    }

    try {
      const { text } = await callOpenClawGateway(
        userContent,
        (_chunk, accumulated) => {
          // 每次收到新内容，更新助手消息
          if (taskIdToUse) {
            setMessagesMap(prev => {
              const msgs = prev[taskIdToUse!] || [];
              const messageIndex = msgs.findIndex(m => m.id === assistantMsgId);
              
              // 如果找不到消息，说明可能被意外清除了，重新添加
              if (messageIndex === -1) {
                console.warn('[Chat] Assistant message not found, re-adding:', assistantMsgId);
                return {
                  ...prev,
                  [taskIdToUse!]: [
                    ...msgs,
                    { id: assistantMsgId, role: 'assistant', content: accumulated, timestamp: new Date() },
                  ],
                };
              }
              
              // 正常更新现有消息
              const updatedMessages = [...msgs];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: accumulated,
              };
              return {
                ...prev,
                [taskIdToUse!]: updatedMessages,
              };
            });
          }
        }
      );

      // 流结束后用最终文本兜底（非流式时直接赋值）
      if (taskIdToUse) {
        setMessagesMap(prev => {
          const msgs = prev[taskIdToUse!] || [];
          const messageIndex = msgs.findIndex(m => m.id === assistantMsgId);
          
          if (messageIndex !== -1) {
            const updatedMessages = [...msgs];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              content: text || updatedMessages[messageIndex].content,
            };
            return {
              ...prev,
              [taskIdToUse!]: updatedMessages,
            };
          }
          
          // 如果消息不存在，添加新消息
          return {
            ...prev,
            [taskIdToUse!]: [
              ...msgs,
              { id: assistantMsgId, role: 'assistant', content: text || '', timestamp: new Date() },
            ],
          };
        });
        onUpdateTaskStatus(taskIdToUse, 'completed');
      }
    } catch (err: any) {
      const errorText = `⚠️ ${err?.message || '连接 OpenClaw Gateway 失败，请检查配置。'}`;
      if (taskIdToUse) {
        setMessagesMap(prev => {
          const msgs = prev[taskIdToUse!] || [];
          const messageIndex = msgs.findIndex(m => m.id === assistantMsgId);
          
          if (messageIndex !== -1) {
            const updatedMessages = [...msgs];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              content: errorText,
            };
            return {
              ...prev,
              [taskIdToUse!]: updatedMessages,
            };
          }
          
          // 如果消息不存在，添加错误消息
          return {
            ...prev,
            [taskIdToUse!]: [
              ...msgs,
              { id: assistantMsgId, role: 'assistant', content: errorText, timestamp: new Date() },
            ],
          };
        });
        onUpdateTaskStatus(taskIdToUse, 'error');
      }
    } finally {
      setIsTyping(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, effectiveTaskId, onAddTask, onUpdateTaskStatus]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSelectLibraryFile = (file: LibraryFile) => {
    if (!attachedLibraryFiles.find(f => f.id === file.id)) {
      setAttachedLibraryFiles(prev => [...prev, file]);
    }
  };

  const handleRemoveLibraryFile = (fileId: string) => {
    setAttachedLibraryFiles(prev => prev.filter(f => f.id !== fileId));
  };

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
      case 'usage':
        return <UsagePage />;
      case 'about':
        return <AboutPage />;
      case 'chat':
        return renderChatContent(tab.taskId ?? null);
      default:
        return renderHomeContent();
    }
  };

  const renderHomeContent = () => (
    <main className="h-full flex overflow-hidden bg-white">
      {messages.length === 0 && effectiveTaskId === null ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 bg-white">
          <div className="w-full max-w-3xl">
            <h1 className="text-4xl text-center mb-12 text-gray-900">我能为你做什么？</h1>
            <div className="relative mb-6">
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-blue-100">
                {(attachedFiles.length > 0 || attachedLibraryFiles.length > 0) && (
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file, index) => {
                        const FileIcon = getFileIcon(file);
                        return (
                          <div key={`local-${index}`} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 group">
                            <FileIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-gray-900 truncate max-w-[150px]">{file.name}</span>
                              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            </div>
                            <button onClick={() => handleRemoveFile(index)} className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0">
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                        );
                      })}
                      {attachedLibraryFiles.map((file) => {
                        const FileIcon = file.icon;
                        return (
                          <div key={`library-${file.id}`} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 group">
                            <FileIcon className={`w-4 h-4 ${file.color} flex-shrink-0`} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-gray-900 truncate max-w-[150px]">{file.name}</span>
                              <span className="text-xs text-gray-500">{file.size}</span>
                            </div>
                            <button onClick={() => handleRemoveLibraryFile(file.id)} className="p-1 hover:bg-green-100 rounded transition-colors flex-shrink-0">
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <input
                    type="text"
                    placeholder="分配具体工作或提问任何问题"
                    className="w-full text-gray-600 placeholder-gray-400 bg-transparent outline-none"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputValue.trim()) {
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between px-4 pb-3 pt-3">
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
                    <button onClick={() => setShowFileLibrary(true)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="从文件库添加">
                      <HardDrive className="w-5 h-5" />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="从本地上传">
                      <Upload className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      disabled={!inputValue.trim()}
                      onClick={handleSendMessage}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <QuickAction icon={Target} text="智能选股" onClick={() => setInputValue('帮我智能选股')} />
              <QuickAction icon={TrendingUp} text="行情分析" onClick={() => setInputValue('分析当前市场行情')} />
              <QuickAction icon={Activity} text="技术分析" onClick={() => setInputValue('进行技术分析')} />
              <QuickAction icon={Cpu} text="策略生成" onClick={() => setInputValue('生成交易策略')} />
            </div>
          </div>
        </div>
      ) : (
        renderChatContent(effectiveTaskId)
      )}
      {showFileLibrary && renderFileLibraryModal()}
    </main>
  );

  const renderChatContent = (taskId: string | null) => {
    const chatMessages = taskId ? (messagesMap[taskId] || []) : [];
    const chatTask = tasks.find(t => t.id === taskId);
    return (
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
            />
          </Panel>
          <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />
          <RightPanelContainer onMessageSent={messageSentTrigger} />
        </PanelGroup>
        {showFileLibrary && renderFileLibraryModal()}
      </main>
    );
  };

  const renderFileLibraryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowFileLibrary(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">从文件库添加</h3>
          <button onClick={() => setShowFileLibrary(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex gap-2 flex-wrap">
            {libraryTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setLibraryActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  libraryActiveTab === tab ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3">
            {filteredLibraryFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">暂无{libraryActiveTab}文件</div>
            ) : (
              filteredLibraryFiles.map((file) => {
                const isSelected = attachedLibraryFiles.find(f => f.id === file.id);
                const FileIcon = file.icon;
                return (
                  <div
                    key={file.id}
                    onClick={() => handleSelectLibraryFile(file)}
                    className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${file.color}`}>
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{file.size} · {file.date}</div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">已选择 {attachedLibraryFiles.length} 个文件</div>
          <div className="flex gap-2">
            <button onClick={() => setShowFileLibrary(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
            <button onClick={() => setShowFileLibrary(false)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors">确定</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => setActiveTabId(id)}
        onCloseTab={handleCloseTab}
      />
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
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
