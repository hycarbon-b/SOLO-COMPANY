import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileText, Image, Table, MoreVertical, Trash2, Eye, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { DiscussionThread } from '../../types/discussion';
import type { ElectronAPI } from '../../types/electron';
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
  onAgentTaskComplete?: (thread: DiscussionThread) => void;
}

export function RightPanelContainer({ onAgentTaskComplete }: RightPanelContainerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const electronAPI = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;

  // Load files from Electron API
  const loadResourceFiles = async () => {
    try {
      if (electronAPI) {
        const result = await electronAPI.getResourceFiles();
        if (result.success && result.files.length > 0) {
          setFiles(result.files);
        }
      }
    } catch (e) {
      console.error('Failed to load resource files:', e);
    }
  };

  // Initialize file watching
  useEffect(() => {
    loadResourceFiles();
    electronAPI?.watchResourceFiles();
    electronAPI?.onResourceChanged((data) => setFiles(data.files));
    return () => {
      electronAPI?.unwatchResourceFiles();
    };
  }, [electronAPI]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const completedThreadIdsRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<number>(Date.now());

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

  // 从 IPC 获取真实 discussion 数据
  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        const result = await electronAPI?.getDiscussions();
        if (!result?.success || !result.discussions) return;
        for (const thread of result.discussions) {
          const threadTime = new Date(thread.startTime).getTime();
          if (threadTime <= lastUpdateRef.current) continue;
          if (thread.endRecord && !completedThreadIdsRef.current.has(thread.id)) {
            completedThreadIdsRef.current.add(thread.id);
            onAgentTaskComplete?.(thread);
          }
          lastUpdateRef.current = threadTime;
        }
      } catch (e) {
        console.error('Fetch discussions error:', e);
      }
    };

    fetchDiscussions();
    const interval = setInterval(fetchDiscussions, 5000);
    return () => clearInterval(interval);
  }, [electronAPI, onAgentTaskComplete]);

  return (
    <>
      <Panel defaultSize={25} minSize={15} maxSize={40}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={30} minSize={20}>
            <div className="h-full bg-white flex flex-col">
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">会话中的文件</h3>
                <button
                  onClick={loadResourceFiles}
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
