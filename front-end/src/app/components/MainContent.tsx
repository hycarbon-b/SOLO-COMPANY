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
import { AgentPage, type AgentInfo } from './AgentPage';
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStrategy?: boolean;
  isStockPicker?: boolean;
}

interface LibraryFile {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  icon: any;
  color: string;
}

const libraryFiles: LibraryFile[] = [
  { id: '1', name: '股票分析报告.pdf', size: '2.3 MB', date: '2026-04-20', type: '文档', icon: FileText, color: 'text-red-600' },
  { id: '4', name: '交易数据.xlsx', size: '1.2 MB', date: '2026-04-20', type: '表格', icon: Table, color: 'text-green-600' },
  { id: '6', name: '趋势图.png', size: '456 KB', date: '2026-04-20', type: '图片与视频', icon: ImageIcon, color: 'text-purple-600' },
  { id: '9', name: '量化策略_V1.py', size: '128 KB', date: '2026-04-20', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '2', name: '市场研究.docx', size: '1.5 MB', date: '2026-04-19', type: '文档', icon: FileText, color: 'text-blue-600' },
  { id: '5', name: '财务报表.csv', size: '856 KB', date: '2026-04-19', type: '表格', icon: Table, color: 'text-green-600' },
  { id: '10', name: '趋势跟踪策略.py', size: '95 KB', date: '2026-04-19', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '3', name: '季度总结.pptx', size: '5.2 MB', date: '2026-04-18', type: '幻灯片', icon: FileText, color: 'text-orange-600' },
  { id: '11', name: '网格交易策略.json', size: '45 KB', date: '2026-04-18', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '7', name: '演示视频.mp4', size: '15.3 MB', date: '2026-04-17', type: '图片与视频', icon: ImageIcon, color: 'text-pink-600' },
  { id: '8', name: '配置文件.json', size: '12 KB', date: '2026-04-16', type: '更多', icon: FileText, color: 'text-gray-600' },
];

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
    '1': [
      { id: '1-1', role: 'user', content: '帮我分析一下今天的市场行情', timestamp: new Date('2024-01-21T10:00:00') },
      { id: '1-2', role: 'assistant', content: '好的，我来为您分析今日市场行情。\n\n**市场概况：**\n- 上证指数：3,245.67 (+1.2%)\n- 深证成指：11,234.89 (+0.8%)\n- 创业板指：2,456.78 (+1.5%)\n\n**行业表现：**\n1. 科技板块领涨，涨幅2.3%\n2. 新能源板块表现强劲，涨幅1.8%\n3. 金融板块相对平稳，涨幅0.5%\n\n**市场情绪：**\n整体市场情绪偏乐观，成交量较昨日放大15%，资金流入明显。建议关注科技和新能源板块的龙头股票。', timestamp: new Date('2024-01-21T10:00:30') },
      { id: '1-3', role: 'user', content: '有什么具体的投资建议吗？', timestamp: new Date('2024-01-21T10:05:00') },
      { id: '1-4', role: 'assistant', content: '基于当前市场行情，我给出以下建议：\n\n**短期操作建议：**\n1. 科技板块：可关注芯片、人工智能相关标的\n2. 新能源板块：光伏、储能产业链值得关注\n3. 仓位控制：建议保持6-7成仓位，留有应对回调空间\n\n**风险提示：**\n- 注意短期获利盘可能带来的调整压力\n- 关注外围市场变化\n- 设置好止盈止损位\n\n具体标的建议需要结合您的风险偏好和资金情况来定制，是否需要我进一步分析？', timestamp: new Date('2024-01-21T10:05:45') },
    ],
    '2': [
      { id: '2-1', role: 'user', content: '我需要优化现有的量化交易策略', timestamp: new Date('2024-01-20T14:00:00') },
      { id: '2-2', role: 'assistant', content: '好的，我来帮您优化量化交易策略。请先告诉我：\n\n1. 当前策略的主要逻辑是什么？（如趋势跟踪、均值回归等）\n2. 当前策略的回测收益率和最大回撤是多少？\n3. 您希望从哪些方面进行优化？\n   - 提高收益率\n   - 降低回撤\n   - 优化胜率\n   - 减少交易频率', timestamp: new Date('2024-01-20T14:00:25') },
      { id: '2-3', role: 'user', content: '主要是双均线策略，年化收益15%，最大回撤12%，希望降低回撤', timestamp: new Date('2024-01-20T14:03:00') },
      { id: '2-4', role: 'assistant', content: '明白了。针对您的双均线策略，我建议从以下几个方面优化以降低回撤：\n\n**1. 加入趋势过滤器**\n- 使用长周期均线（如200日线）判断大趋势\n- 只在趋势向上时做多，避免震荡市频繁交易\n\n**2. 优化止损机制**\n- 添加ATR动态止损，根据市场波动调整\n- 设置分批止损，而非一次性离场\n\n**3. 仓位管理优化**\n- 根据市场波动率动态调整仓位\n- 回撤期间降低仓位，突破新高时加仓\n\n**4. 加入风控指标**\n- 监控连续亏损次数，达到阈值暂停交易\n- 月度最大亏损限制\n\n我可以为您生成优化后的策略代码，需要我继续吗？', timestamp: new Date('2024-01-20T14:03:50') },
    ],
    '3': [
      { id: '3-1', role: 'user', content: '请帮我做一份持仓风险评估报告', timestamp: new Date('2024-01-18T16:00:00') },
      { id: '3-2', role: 'assistant', content: '好的，我来为您进行持仓风险评估。请提供以下信息：\n\n1. 当前持仓股票代码和仓位占比\n2. 持仓周期（短期/中期/长期）\n3. 您的风险承受能力（保守/稳健/激进）\n\n或者您可以直接上传持仓截图，我来帮您分析。', timestamp: new Date('2024-01-18T16:00:20') },
      { id: '3-3', role: 'user', content: '主要持仓是科技股，占比60%，新能源20%，金融20%，中长期持有，风险偏好稳健', timestamp: new Date('2024-01-18T16:05:00') },
      { id: '3-4', role: 'assistant', content: '基于您的持仓信息，我已完成风险评估：\n\n**持仓结构分析：**\n- 科技股60% - 占比较高，存在集中度风险\n- 新能源20% - 配置合理\n- 金融20% - 配置合理\n\n**风险等级：中等偏高**\n\n**主要风险点：**\n1. **行业集中度风险**：科技股占比过高，建议控制在40%以内\n2. **市场风险**：科技板块波动性较大，与稳健风险偏好不完全匹配\n3. **系统性风险**：缺乏防御性资产配置\n\n**优化建议：**\n1. 降低科技股仓位至40-45%\n2. 增配消费、医药等防御性板块15-20%\n3. 考虑配置5-10%债券或货币基金作为安全垫\n4. 分散持股，单只股票建议不超过15%\n\n**止损建议：**\n- 单只股票止损位：-8%\n- 总仓位止损位：-15%\n\n需要我提供详细的调仓方案吗？', timestamp: new Date('2024-01-18T16:06:15') },
    ],
    '4': [
      { id: '4-1', role: 'user', content: '帮我生成一个双均线交易策略', timestamp: new Date('2024-01-21T14:00:00') },
      { id: '4-2', role: 'assistant', content: '好的，我为您生成了一个完整的双均线交易策略。这是一个基于5日均线和20日均线的经典策略，适合中短期交易。', timestamp: new Date('2024-01-21T14:00:30'), isStrategy: true },
    ],
    '5': [
      { id: '5-1', role: 'user', content: '帮我智能选股，推荐一些优质标的', timestamp: new Date('2024-01-21T15:30:00') },
      { id: '5-2', role: 'assistant', content: '好的，我基于多因子量化模型为您筛选了当前市场中的优质标的。综合考虑了基本面、技术面、估值和市场情绪等多个维度。', timestamp: new Date('2024-01-21T15:30:20') },
      { id: '5-3', role: 'user', content: '能详细说明一下选股逻辑吗？', timestamp: new Date('2024-01-21T15:32:00') },
      { id: '5-4', role: 'assistant', content: '当然。我的选股模型主要从以下几个维度进行评估：\n\n**1. 基本面分析**\n- ROE连续三年超过15%\n- 营收和净利润持续增长\n- 负债率处于合理水平\n\n**2. 估值分析**\n- PE、PB处于行业中位数以下或历史低位\n- PEG小于1，具有成长性溢价\n\n**3. 技术面分析**\n- 突破关键阻力位或处于上升通道\n- 成交量配合良好\n- MACD金叉等技术指标支持\n\n**4. 行业景气度**\n- 所属行业处于上升周期\n- 政策支持力度强\n- 市场需求旺盛\n\n以下是为您筛选出的6只优质标的：', timestamp: new Date('2024-01-21T15:32:45'), isStockPicker: true },
    ],
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

  const handleAgentStartChat = (agent: AgentInfo) => {
    const taskId = onAddTask(`${agent.role} · ${agent.name}`);
    setMessagesMap(prev => ({
      ...prev,
      [taskId]: [
        {
          id: `${taskId}-welcome`,
          role: 'assistant',
          content: `您好，我是${agent.name}，当前担任${agent.role}。我会先帮您快速梳理目标、关键数据和预期产出，再给出可执行建议。您可以直接告诉我想分析的市场、标的、策略，或把相关文件发给我，我会立即开始。`,
          timestamp: new Date(),
        }
      ]
    }));
    onUpdateTaskStatus(taskId, 'idle');
    handleOpenTab('chat', `${agent.role} · ${agent.name}`, taskId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
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

    // 创建一个空的助手消息用于流式更新
    const assistantMsgId = (Date.now() + 1).toString();
    if (taskIdToUse) {
      setMessagesMap(prev => ({
        ...prev,
        [taskIdToUse!]: [
          ...(prev[taskIdToUse!] || []),
          { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() },
        ],
      }));
    }

    try {
      const { text } = await callOpenClawGateway(
        userContent,
        (_chunk, accumulated) => {
          // 每次收到新内容，更新助手消息
          if (taskIdToUse) {
            setMessagesMap(prev => {
              const msgs = prev[taskIdToUse!] || [];
              return {
                ...prev,
                [taskIdToUse!]: msgs.map(m =>
                  m.id === assistantMsgId ? { ...m, content: accumulated } : m
                ),
              };
            });
          }
        }
      );

      // 流结束后用最终文本兜底（非流式时直接赋值）
      if (taskIdToUse) {
        setMessagesMap(prev => {
          const msgs = prev[taskIdToUse!] || [];
          return {
            ...prev,
            [taskIdToUse!]: msgs.map(m =>
              m.id === assistantMsgId ? { ...m, content: text || m.content } : m
            ),
          };
        });
        onUpdateTaskStatus(taskIdToUse, 'completed');
      }
    } catch (err: any) {
      const errorText = `⚠️ ${err?.message || '连接 OpenClaw Gateway 失败，请检查配置。'}`;
      if (taskIdToUse) {
        setMessagesMap(prev => {
          const msgs = prev[taskIdToUse!] || [];
          return {
            ...prev,
            [taskIdToUse!]: msgs.map(m =>
              m.id === assistantMsgId ? { ...m, content: errorText } : m
            ),
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
