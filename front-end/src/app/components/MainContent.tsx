import {
  Mic, ArrowUp, Target, TrendingUp, Activity, Cpu, X, FileText,
  Image as ImageIcon, HardDrive, Upload, Table, Home, Globe
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as React from 'react';
import { callOpenClawGateway } from '../../services/openclawGateway';
import { loadMessages, saveMessages, loadSysPrompt, saveSysPrompt } from '../../services/conversationStore';
import chatConfig from '../config/chatConfig.json';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel } from './ChatPanel';
import { FileLibraryModal } from './FileLibraryModal';
import { RightPanelContainer } from './RightPanelContainer';
import { FilesPage } from './FilesPage';
import { TradingPage } from './TradingPage';
import { AgentPage, type AgentInfo } from './AgentPage';
import type { DiscussionThread } from '../../types/discussion';
import type { Message, LibraryFile } from '../fakeChatData';
import { libraryFiles, fakeMessagesMap } from '../fakeChatData';
import { UsagePage } from './UsagePage';
import { AboutPage } from './AboutPage';
import { SchedulePage } from './SchedulePage';
import { MarketPage } from './MarketPage';


// === Tab Types ===
export type TabType = 'home' | 'files' | 'trading' | 'market' | 'agent' | 'schedule' | 'usage' | 'about' | 'chat' | 'web';

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




export function MainContent({ onAddTask, tasks, onUpdateTaskTitle, onUpdateTaskStatus, tabs, activeTabId, onOpenTab, onCloseTab }: MainContentProps) {
  // === Tab State ===
  // Derive the effective taskId from the active tab
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveTaskId = activeTab?.type === 'chat' ? activeTab.taskId ?? null : null;

  const handleOpenTab = onOpenTab;
  const handleCloseTab = onCloseTab;

  // === Chat State ===
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedLibraryFiles, setAttachedLibraryFiles] = useState<LibraryFile[]>([]);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [libraryActiveTab, setLibraryActiveTab] = useState('全部');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLibraryFiles = libraryActiveTab === '全部'
    ? libraryFiles
    : libraryFiles.filter(f => f.type === libraryActiveTab);

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({
    ...fakeMessagesMap,
  });

  const [systemPromptsMap, setSystemPromptsMap] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === Persistence: load messages when a chat tab opens =====================
  useEffect(() => {
    if (!effectiveTaskId) return;
    // Skip seed/fake tasks (numeric IDs) if already loaded
    if (messagesMap[effectiveTaskId] !== undefined) return;
    const stored = loadMessages(effectiveTaskId);
    if (stored.length > 0) {
      setMessagesMap(prev => ({
        ...prev,
        [effectiveTaskId]: stored.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
      }));
    }
    // Load system prompt
    const sp = loadSysPrompt(effectiveTaskId);
    if (sp) {
      setSystemPromptsMap(prev => ({ ...prev, [effectiveTaskId]: sp }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTaskId]);

  // === Persistence: save messages whenever they change =====================
  // Only persist non-seed (non-numeric-short) task IDs to avoid filling storage with fake data
  useEffect(() => {
    Object.entries(messagesMap).forEach(([taskId, msgs]) => {
      if (/^\d{1,2}$/.test(taskId)) return; // skip seed IDs ('1','2'...)
      saveMessages(taskId, msgs.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      })));
    });
  }, [messagesMap]);

  // === Persistence: save system prompts whenever they change ================
  useEffect(() => {
    Object.entries(systemPromptsMap).forEach(([taskId, sp]) => {
      if (/^\d{1,2}$/.test(taskId)) return;
      saveSysPrompt(taskId, sp);
    });
  }, [systemPromptsMap]);

  // === Global reset (from About page) =======================================
  useEffect(() => {
    const handler = () => {
      setMessagesMap({ ...fakeMessagesMap });
      setSystemPromptsMap({});
      setInputValue('');
    };
    window.addEventListener('yuanji:reset-all', handler);
    return () => window.removeEventListener('yuanji:reset-all', handler);
  }, []);

  const messages = effectiveTaskId ? (messagesMap[effectiveTaskId] || []) : [];
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

  const handleAgentStartChat = (agent: AgentInfo) => {
    const title = `${agent.role} · ${agent.name}`
    const taskId = onAddTask(title)
    const welcomeMessage = `您好，我是${agent.name}，当前担任${agent.role}。我会先帮您快速梳理目标、关键数据和预期产出，再给出可执行建议。您可以直接告诉我想分析的市场、标的、策略，或把相关文件发给我，我会立即开始。`

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

    if (agent.systemPrompt) {
      setSystemPromptsMap(prev => ({ ...prev, [taskId]: agent.systemPrompt }))
    }

    onUpdateTaskStatus(taskId, 'idle')
    handleOpenTab('chat', title, taskId)
  }

    // 当RightPanel检测到Agent线程完成时，在新标签页中展示结果
    const handleAgentTaskComplete = useCallback((thread: DiscussionThread) => {
      const { startRecord, endRecord } = thread
      const title = `${startRecord.worker_label} - ${startRecord.worker_name}`
      const taskId = onAddTask(title)

      const summary = endRecord?.summary || startRecord.task_objective || ''
      const welcomeMessage = `**任务目标：** ${startRecord.task_objective}\n\n${startRecord.task_context ? '**背景信息：** ' + startRecord.task_context + '\n\n' : ''}${summary ? '**完成总结：** ' + summary + '\n\n' : ''}您可以继续提问或要求我执行相关操作。`

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
    }, [onAddTask, onUpdateTaskStatus, handleOpenTab])

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

    if (taskIdToUse) {
      setMessagesMap(prev => ({
        ...prev,
        [taskIdToUse!]: [...(prev[taskIdToUse!] || []), userMessage],
      }));
      onUpdateTaskStatus(taskIdToUse, 'working');
    }

          <RightPanelContainer onAgentTaskComplete={handleAgentTaskComplete} />

    // 创建一个唯一的助手消息ID用于流式更新
    const assistantMsgId = `${Date.now()}-assistant-${Math.random().toString(36).slice(2, 9)}`;
    // 当前正在流式更新的气泡 ID（会随新分段事件变化）
    let currentAsstMsgId = assistantMsgId;
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

    setIsTyping(true);

    try {
      const activeSystemPrompt = taskIdToUse
        ? (systemPromptsMap[taskIdToUse] ?? chatConfig.defaultSystemPrompt)
        : chatConfig.defaultSystemPrompt;
      // 替换对话ID placeholder
      const finalSystemPrompt = taskIdToUse
        ? activeSystemPrompt.replace('{{CONVERSATION_ID}}', taskIdToUse)
        : activeSystemPrompt;
      const { text } = await callOpenClawGateway(
        userContent,
        (_chunk, accumulated, isNewSegment) => {
          if (!taskIdToUse) return;

          // 首个数据块到达时关闭加载气泡
          setIsTyping(false);

          // 当 Gateway 开始一个新的流式分段时，把当前气泡定格，
          // 并为新的分段创建一个全新的助手气泡。
          if (isNewSegment) {
            const newMsgId = `${Date.now()}-assistant-${Math.random().toString(36).slice(2, 9)}`;
            currentAsstMsgId = newMsgId;
            setMessagesMap(prev => {
              const msgs = prev[taskIdToUse!] || [];
              return {
                ...prev,
                [taskIdToUse!]: [
                  ...msgs,
                  { id: newMsgId, role: 'assistant', content: accumulated, timestamp: new Date() },
                ],
              };
            });
            return;
          }

          // 每次收到新内容，更新当前助手气泡
          setMessagesMap(prev => {
            const msgs = prev[taskIdToUse!] || [];
            const messageIndex = msgs.findIndex(m => m.id === currentAsstMsgId);

            // 如果找不到消息，说明可能被意外清除了，重新添加
            if (messageIndex === -1) {
              console.warn('[Chat] Assistant message not found, re-adding:', currentAsstMsgId);
              return {
                ...prev,
                [taskIdToUse!]: [
                  ...msgs,
                  { id: currentAsstMsgId, role: 'assistant', content: accumulated, timestamp: new Date() },
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
        },
        finalSystemPrompt
      );

      // 流结束后用最终文本兜底（非流式时直接赋值）
      if (taskIdToUse) {
        setMessagesMap(prev => {
          const msgs = prev[taskIdToUse!] || [];
          const messageIndex = msgs.findIndex(m => m.id === currentAsstMsgId);

          if (messageIndex !== -1) {
            const updatedMessages = [...msgs];
            const existing = updatedMessages[messageIndex];
            // 只有当当前气泡还没有内容时才使用 text 兜底，避免覆盖已经流式写入的分段内容
            updatedMessages[messageIndex] = {
              ...existing,
              content: existing.content || text || '',
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
              { id: currentAsstMsgId, role: 'assistant', content: text || '', timestamp: new Date() },
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
          const messageIndex = msgs.findIndex(m => m.id === currentAsstMsgId);

          if (messageIndex !== -1) {
            const updatedMessages = [...msgs];
            const existing = updatedMessages[messageIndex];
            // 保留已经流式生成的内容，仅在末尾追加中断提示；
            // 如果气泡完全为空，则直接显示错误信息。
            const preservedContent = existing.content
              ? `${existing.content}\n\n${errorText}`
              : errorText;
            updatedMessages[messageIndex] = {
              ...existing,
              content: preservedContent,
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
              { id: currentAsstMsgId, role: 'assistant', content: errorText, timestamp: new Date() },
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
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-blue-100">
                {(attachedFiles.length > 0 || attachedLibraryFiles.length > 0) && (
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file, index) => {
                        const FileIcon = file.type.startsWith('image/') ? ImageIcon : FileText;
                        return (
                          <div key={`local-${index}`} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 group">
                            <FileIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-gray-900 truncate max-w-[150px]">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                {file.size < 1024
                                  ? `${file.size} B`
                                  : file.size < 1024 * 1024
                                    ? `${(file.size / 1024).toFixed(1)} KB`
                                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                              </span>
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
      {showFileLibrary && (
        <FileLibraryModal
          libraryActiveTab={libraryActiveTab}
          attachedLibraryFiles={attachedLibraryFiles}
          filteredLibraryFiles={filteredLibraryFiles}
          onTabChange={setLibraryActiveTab}
          onSelectLibraryFile={handleSelectLibraryFile}
          onClose={() => setShowFileLibrary(false)}
        />
      )}
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
