import { Paperclip, Mic, ArrowUp, Edit2, X, FileText, Image as ImageIcon, HardDrive, Upload, Table } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { StrategyCard } from './StrategyCard';
import { StockPickerTable } from './StockPickerTable';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStrategy?: boolean;
  isStockPicker?: boolean;
}

interface ChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  taskTitle?: string;
  onUpdateTitle?: (newTitle: string) => void;
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

export function ChatPanel({ messages, isTyping, inputValue, setInputValue, onSendMessage, messagesEndRef, taskTitle, onUpdateTitle }: ChatPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskTitle || '');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedLibraryFiles, setAttachedLibraryFiles] = useState<LibraryFile[]>([]);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [libraryActiveTab, setLibraryActiveTab] = useState('全部');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const libraryTabs = ['全部', '文档', '幻灯片', '表格', '图片与视频', '策略代码', '更多'];

  const filteredLibraryFiles = libraryActiveTab === '全部'
    ? libraryFiles
    : libraryFiles.filter(f => f.type === libraryActiveTab);

  useEffect(() => {
    setEditedTitle(taskTitle || '');
  }, [taskTitle]);

  const handleTitleSave = () => {
    if (editedTitle.trim() && onUpdateTitle) {
      onUpdateTitle(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

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
    if (file.type.startsWith('image/')) {
      return ImageIcon;
    }
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSend = () => {
    onSendMessage();
    setAttachedFiles([]);
    setAttachedLibraryFiles([]);
  };

  const handleSelectLibraryFile = (file: LibraryFile) => {
    // 检查是否已经添加过
    if (!attachedLibraryFiles.find(f => f.id === file.id)) {
      setAttachedLibraryFiles(prev => [...prev, file]);
    }
  };

  const handleRemoveLibraryFile = (fileId: string) => {
    setAttachedLibraryFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Title Bar */}
      {taskTitle && (
        <div className="px-6 py-4 flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTitleSave();
                } else if (e.key === 'Escape') {
                  setEditedTitle(taskTitle);
                  setIsEditingTitle(false);
                }
              }}
              className="text-lg font-medium text-gray-900 bg-transparent border-b border-blue-500 outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-lg font-medium text-gray-900">
                {taskTitle}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="编辑标题"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 bg-white">
        <div className="max-w-4xl mx-auto pb-2">
          {messages.map((message) => (
            <div key={message.id} className={`mb-6 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">AI</span>
                  </div>
                  <div className="flex-1">
                    {message.isStrategy ? (
                      <div className="max-w-2xl">
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-3">
                          <p className="text-gray-900">{message.content}</p>
                        </div>
                        <StrategyCard
                          title="双均线交易策略"
                          description="基于5日和20日移动平均线的经典交易策略，当短期均线上穿长期均线时买入，下穿时卖出"
                          code={`# 双均线交易策略
import pandas as pd
import numpy as np

def dual_ma_strategy(data, short_window=5, long_window=20):
    """
    双均线交易策略
    :param data: 包含'close'价格的DataFrame
    :param short_window: 短期均线窗口
    :param long_window: 长期均线窗口
    :return: 带有交易信号的DataFrame
    """
    # 计算移动平均线
    data['short_ma'] = data['close'].rolling(window=short_window).mean()
    data['long_ma'] = data['close'].rolling(window=long_window).mean()

    # 生成交易信号
    data['signal'] = 0
    data.loc[data['short_ma'] > data['long_ma'], 'signal'] = 1  # 买入信号
    data.loc[data['short_ma'] < data['long_ma'], 'signal'] = -1  # 卖出信号

    # 计算持仓变化
    data['position'] = data['signal'].diff()

    return data

# 使用示例
# df = dual_ma_strategy(stock_data)
# buy_signals = df[df['position'] == 2]
# sell_signals = df[df['position'] == -2]`}
                        />
                      </div>
                    ) : message.isStockPicker ? (
                      <div className="max-w-4xl">
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-3">
                          <p className="text-gray-900 whitespace-pre-line">{message.content}</p>
                        </div>
                        <StockPickerTable />
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl px-4 py-3 inline-block max-w-2xl shadow-sm">
                        <p className="text-gray-900">{message.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {message.role === 'user' && (
                <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 inline-block max-w-2xl shadow-sm">
                  <p>{message.content}</p>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="mb-6 flex gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">AI</span>
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            {/* Attached Files Preview */}
            {(attachedFiles.length > 0 || attachedLibraryFiles.length > 0) && (
              <div className="px-4 pt-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {/* 本地上传的文件 */}
                  {attachedFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file);
                    return (
                      <div
                        key={`local-${index}`}
                        className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 group"
                      >
                        <FileIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-gray-900 truncate max-w-[150px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    );
                  })}
                  {/* 文件库选择的文件 */}
                  {attachedLibraryFiles.map((file) => {
                    const FileIcon = file.icon;
                    return (
                      <div
                        key={`library-${file.id}`}
                        className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 group"
                      >
                        <FileIcon className={`w-4 h-4 ${file.color} flex-shrink-0`} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-gray-900 truncate max-w-[150px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {file.size}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveLibraryFile(file.id)}
                          className="p-1 hover:bg-green-100 rounded transition-colors flex-shrink-0"
                        >
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
                    handleSend();
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 pt-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                />
                <button
                  onClick={() => setShowFileLibrary(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="从文件库添加"
                >
                  <HardDrive className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="从本地上传"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!inputValue.trim()}
                  onClick={handleSend}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Library Modal */}
      {showFileLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowFileLibrary(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">从文件库添加</h3>
              <button
                onClick={() => setShowFileLibrary(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex gap-2 flex-wrap">
                {libraryTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLibraryActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      libraryActiveTab === tab
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body - File List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3">
                {filteredLibraryFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    暂无{libraryActiveTab}
                  </div>
                ) : (
                  filteredLibraryFiles.map((file) => {
                    const isSelected = attachedLibraryFiles.find(f => f.id === file.id);
                    const FileIcon = file.icon;
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleSelectLibraryFile(file)}
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
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

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                已选择 {attachedLibraryFiles.length} 个文件
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFileLibrary(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowFileLibrary(false)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
