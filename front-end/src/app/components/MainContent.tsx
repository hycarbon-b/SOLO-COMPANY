import {
  Mic, ArrowUp, Target, TrendingUp, Activity, Cpu,
  HardDrive, Upload
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as React from 'react';
import { callOpenClawGateway } from '../../services/openclawGateway';
import { loadMessages, saveMessages, loadSysPrompt, saveSysPrompt } from '../../services/conversationStore';
import chatConfig from '../config/chatConfig.json';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel } from './ChatPanel';
import { FileLibraryModal } from './FileLibraryModal';
import { AttachmentPreviewList } from './AttachmentPreviewList';
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
import { MonitorPage } from './MonitorPage';

// === Helpers ===
const genMsgId = (role: 'user' | 'assistant') =>
  `${Date.now()}-${role}-${Math.random().toString(36).slice(2, 9)}`;


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




export function MainContent({ onAddTask, tasks, onUpdateTaskTitle, onUpdateTaskStatus, tabs, activeTabId, onOpenTab: handleOpenTab, onCloseTab: handleCloseTab }: MainContentProps) {
  // === Tab State ===
  // Derive the effective taskId from the active tab
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveTaskId = activeTab?.type === 'chat' ? activeTab.taskId ?? null : null;

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
    // Skip only if there are already messages in memory for this task
    // Use length check (not !== undefined) to handle edge case of empty array
    if ((messagesMap[effectiveTaskId]?.length ?? 0) > 0) return;
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
  // Track previous map to only save changed tasks (avoid re-saving everything on every stream tick)
  const prevMessagesMapRef = useRef<Record<string, Message[]>>({});
  useEffect(() => {
    const prev = prevMessagesMapRef.current;
    Object.entries(messagesMap).forEach(([taskId, msgs]) => {
      if (/^\d{1,2}$/.test(taskId)) return; // skip seed IDs ('1','2'...)
      if (prev[taskId] === msgs) return;     // reference unchanged, skip re-save
      saveMessages(taskId, msgs.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      })));
    });
    prevMessagesMapRef.current = messagesMap;
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

  // === Inject HTML card from external HTTP request (port 17900) =============
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onInjectHtml) return;
    const off = api.onInjectHtml((data: { html: string; conversationId: string }) => {
      if (!data?.html || !data?.conversationId) return;
      const { html, conversationId } = data;
      const newMsg: Message = {
        id: genMsgId('assistant'),
        role: 'assistant',
        content: html,
        type: 'html',
        timestamp: new Date(),
      };
      setMessagesMap(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMsg],
      }));
      // Switch to the conversation tab if the task exists
      const existingTask = tasks.find(t => t.id === conversationId);
      if (existingTask) {
        handleOpenTab('chat', existingTask.title, conversationId);
      }
    });
    return () => { if (typeof off === 'function') off(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, handleOpenTab]);

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

    const userContent = inputValue.trim();
    const userMessage: Message = {
      id: genMsgId('user'),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    let taskIdToUse = effectiveTaskId;
    if (effectiveTaskId === null) {
      taskIdToUse = onAddTask(userContent.substring(0, 30));
      handleOpenTab('chat', userContent.substring(0, 30), taskIdToUse);
    }

    setInputValue('');
    setAttachedFiles([]);
    setAttachedLibraryFiles([]);

    if (!taskIdToUse) return;
    const taskId = taskIdToUse;

    setMessagesMap(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), userMessage],
    }));
    onUpdateTaskStatus(taskId, 'working');

    // Helper: patch one assistant message by id
    const patchMsg = (msgId: string, patch: (m: Message) => Partial<Message>) => {
      setMessagesMap(prev => {
        const msgs = prev[taskId] || [];
        const idx = msgs.findIndex(m => m.id === msgId);
        if (idx === -1) return prev;
        const updated = [...msgs];
        updated[idx] = { ...updated[idx], ...patch(updated[idx]) };
        return { ...prev, [taskId]: updated };
      });
    };
    const appendMsg = (msg: Message) => {
      setMessagesMap(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), msg],
      }));
    };

    // Initial assistant placeholder
    const assistantMsgId = genMsgId('assistant');
    let currentAsstMsgId = assistantMsgId;
    appendMsg({ id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() });

    setIsTyping(true);

    try {
      const sysPrompt = systemPromptsMap[taskId] ?? chatConfig.defaultSystemPrompt;
      const finalSystemPrompt = sysPrompt.replace('{{CONVERSATION_ID}}', taskId);
      const { text } = await callOpenClawGateway(
        userContent,
        (_chunk, accumulated, isNewSegment) => {
          setIsTyping(false);
          if (isNewSegment) {
            // Gateway started a new stream segment: freeze current bubble, open a new one
            const newMsgId = genMsgId('assistant');
            currentAsstMsgId = newMsgId;
            appendMsg({ id: newMsgId, role: 'assistant', content: accumulated, timestamp: new Date() });
            return;
          }
          patchMsg(currentAsstMsgId, () => ({ content: accumulated }));
        },
        finalSystemPrompt
      );

      // Final fallback: only fill in if current bubble is still empty (non-stream case)
      patchMsg(currentAsstMsgId, m => (m.content ? {} : { content: text || '' }));
      onUpdateTaskStatus(taskId, 'completed');
    } catch (err: any) {
      const errorText = `⚠️ ${err?.message || '连接 OpenClaw Gateway 失败，请检查配置。'}`;
      patchMsg(currentAsstMsgId, m => ({
        content: m.content ? `${m.content}\n\n${errorText}` : errorText,
      }));
      onUpdateTaskStatus(taskId, 'error');
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
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-blue-100">
                <AttachmentPreviewList
                  attachedFiles={attachedFiles}
                  attachedLibraryFiles={attachedLibraryFiles}
                  onRemoveFile={handleRemoveFile}
                  onRemoveLibraryFile={handleRemoveLibraryFile}
                />
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
