import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileText, Image, Table, MoreVertical, Trash2, Eye, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef } from 'react';
import type { DiscussionThread } from '../../types/discussion';
import { WorkerStatusPanel } from './WorkerStatusPanel';

interface FileItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'spreadsheet' | 'code';
  size: string;
  date: string;
  content?: string;
    path?: string;
}

interface RightPanelContainerProps {
  onMessageSent?: number;
  discussions?: DiscussionThread[];
  onAgentTaskComplete?: () => void;
}

export function RightPanelContainer({ onMessageSent, discussions, onAgentTaskComplete }: RightPanelContainerProps) {
  const [files, setFiles] = useState<FileItem[]>([
    { id: '1', name: '股票分析报告.pdf', type: 'document', size: '2.3 MB', date: '2小时前', content: '# 股票分析报告\n\n## 市场概况\n\n本报告分析了当前市场的整体情况...' },
    { id: '2', name: '市场趋势图.png', type: 'image', size: '456 KB', date: '3小时前' },
    { id: '3', name: '交易数据.xlsx', type: 'spreadsheet', size: '1.2 MB', date: '1天前', content: '交易日期,股票代码,买入价,卖出价,盈亏\n2024-01-20,600519,1850.00,1920.00,+70.00' },
  ]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Load files from Electron API
  const loadResourceFiles = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getResourceFiles();
        if (result.success && result.files.length > 0) {
          setFiles(result.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            type: f.type as 'document' | 'image' | 'spreadsheet' | 'code',
            size: f.size,
            date: f.date,
            path: f.path
          })));
        }
      }
    } catch (e) {
      console.error('Failed to load resource files:', e);
    }
  };

  // Initialize file watching
  useEffect(() => {
    loadResourceFiles();
    
    // Start watching
    window.electronAPI?.watchResourceFiles();
    
    // Listen for file changes
    const handleFileChange = (data: { files: any[] }) => {
      setFiles(data.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type as 'document' | 'image' | 'spreadsheet' | 'code',
        size: f.size,
        date: f.date,
        path: f.path
      })));
    };
    
    window.electronAPI?.onResourceChanged(handleFileChange);
    
    return () => {
      window.electronAPI?.unwatchResourceFiles();
    };
  }, []);

  const handleRefreshFiles = async () => {
    setFilesLoading(true);
    await loadResourceFiles();
    setFilesLoading(false);
  };
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [agentMessages, setAgentMessages] = useState<Array<{
    id: string;
    agent: string;
    message: string;
    time: string;
    direction: 'left' | 'right';
  }>>([]);
  const agentMessagesEndRef = useRef<HTMLDivElement>(null);
  const lastDiscussionsRef = useRef<DiscussionThread[]>([]);
    const completedThreadIdsRef = useRef<Set<string>>(new Set());
    const lastUpdateRef = useRef<number>(Date.now()); // 从用户进入时开始记录
    const polledRef = useRef<boolean>(false); // 标记是否已轮询过

  const agentAvatars: { [key: string]: { bg: string; initial: string } } = {
    '数据分析师': { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', initial: '数' },
    '新闻分析师': { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', initial: '新' },
    '行情解读员': { bg: 'bg-gradient-to-br from-green-400 to-green-600', initial: '行' },
    '策略顾问': { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', initial: '策' },
    '风险管理师': { bg: 'bg-gradient-to-br from-red-400 to-red-600', initial: '风' },
    '市场研究员': { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', initial: '市' },
  };

  const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(files.filter(f => f.id !== fileId));
    setOpenMenuId(null);
  };

  const handlePreviewFile = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewFile(file);
    setOpenMenuId(null);
  };

  useEffect(() => {
  }, [onMessageSent]);

  // 从 IPC 获取真实 discussion 数据
  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        const result = await window.electronAPI.getDiscussions();
        if (result.success && result.discussions) {
          const latestTime = lastUpdateRef.current;
          const allThreads = result.discussions; // 保存所有线程
          const now = Date.now();
          // 过滤出用户进入后新产生的线程
          const newThreads = allThreads.filter(d => {
            const threadTime = new Date(d.startTime).getTime();
            return threadTime > latestTime && threadTime <= now;
          });
          
          if (newThreads.length > 0) {
            // 通知父组件有新的 Agent 任务完成
            for (const thread of newThreads) {
              if (thread.endRecord && !completedThreadIdsRef.current.has(thread.id)) {
                completedThreadIdsRef.current.add(thread.id);
                if (onAgentTaskComplete) onAgentTaskComplete(thread);
              }
            }

            // 更新时间戳，但只针对新线程
            for (const thread of newThreads) {
              const threadTime = new Date(thread.startTime).getTime();
              if (threadTime > lastUpdateRef.current) {
                lastUpdateRef.current = threadTime;
              }
            }
            lastDiscussionsRef.current = allThreads;
            
            const newMessages: Array<{
              id: string;
              agent: string;
              message: string;
              time: string;
              direction: 'left' | 'right';
            }> = [];
            
            for (const thread of newThreads) {
              const { startRecord } = thread;
              const agent = startRecord.worker_label || startRecord.worker_name;
              
              newMessages.push({
                id: `${thread.id}-start`,
                agent: agent,
                message: `开始: ${startRecord.task_objective}`,
                time: new Date(startRecord.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                direction: 'left',
              });
              
              if (thread.endRecord) {
                const status = thread.endRecord.status === 'success' ? '✓' : 
                              thread.endRecord.status === 'failed' ? '✗' : '~';
                newMessages.push({
                  id: `${thread.id}-end`,
                  agent: agent,
                  message: `${status} ${thread.endRecord.summary || ''}`,
                  time: new Date(thread.endRecord.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                  direction: 'right',
                });
              }
            }
            
            setAgentMessages(prev => [...prev, ...newMessages].slice(-50));
          }
        }
      } catch (e) {
        console.error('Fetch discussions error:', e);
      }
    };
    
    // 初始获取
    fetchDiscussions();
    
    // 每5秒轮询
    const interval = setInterval(fetchDiscussions, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // 自动滚动到最新消息
  useEffect(() => {
    agentMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  return (
    <>
      <Panel defaultSize={25} minSize={15} maxSize={40}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={30} minSize={20}>
            <div className="h-full bg-white flex flex-col">
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">会话中的文件</h3>
                <button
                  onClick={handleRefreshFiles}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="刷新"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {files.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    暂无文件
                  </div>
                ) : (
                  <div>
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="relative px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={(e) => handlePreviewFile(file, e)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                            {file.type === 'document' && <FileText className="w-4 h-4 text-blue-600" />}
                            {file.type === 'image' && <Image className="w-4 h-4 text-green-600" />}
                            {file.type === 'spreadsheet' && <Table className="w-4 h-4 text-orange-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 truncate">{file.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{file.size} · {file.date}</div>
                          </div>
                          <div className="relative">
                            <button
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === file.id ? null : file.id);
                              }}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            {openMenuId === file.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }}
                                />
                                <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg py-1 min-w-[120px]">
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    onClick={(e) => handlePreviewFile(file, e)}
                                  >
                                    <Eye className="w-4 h-4" />
                                    预览
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                                    onClick={(e) => handleDeleteFile(file.id, e)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    删除
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="h-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-row-resize" />

          <Panel defaultSize={70} minSize={20}>
            <WorkerStatusPanel />
          </Panel>
        </PanelGroup>
      </Panel>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-20 backdrop-blur-lg"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-medium text-gray-900">{previewFile.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{previewFile.size} · 最近修改: {previewFile.date}</p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {previewFile.type === 'document' && (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{previewFile.content}</pre>
                </div>
              )}
              {previewFile.type === 'spreadsheet' && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      {previewFile.content?.split('\n').map((row, idx) => (
                        <tr key={idx} className={idx === 0 ? 'bg-gray-50' : ''}>
                          {row.split(',').map((cell, cellIdx) => (
                            <td key={cellIdx} className="border border-gray-200 px-4 py-2 text-sm">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {previewFile.type === 'image' && (
                <div className="flex items-center justify-center bg-gray-50 rounded-lg p-8">
                  <div className="text-gray-400">图片预览</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
