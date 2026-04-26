import { Mic, ArrowUp, Edit2, X, HardDrive, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';
import { libraryFiles, type Message, type LibraryFile } from '../fakeChatData';
import { AttachmentPreviewList } from './AttachmentPreviewList';
import { FileLibraryModal } from './FileLibraryModal';
import { StrategyCard } from './StrategyCard';
import { StockPickerTable } from './StockPickerTable';

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

export function ChatPanel({ messages, isTyping, inputValue, setInputValue, onSendMessage, messagesEndRef, taskTitle, onUpdateTitle }: ChatPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(taskTitle || '');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedLibraryFiles, setAttachedLibraryFiles] = useState<LibraryFile[]>([]);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [libraryActiveTab, setLibraryActiveTab] = useState('全部');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {messages.map((message) => {
            // 跳过空内容的助手消息（流式初始化时的空消息）
            if (message.role === 'assistant' && !message.content && !message.isStrategy && !message.isStockPicker) {
              return null;
            }
            
            return (
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
                            <div className="text-gray-900 prose prose-sm max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div>
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
    data.loc[data['short_ma'] > data['long_ma'], 'signal'] = 1  // 买入信号
    data.loc[data['short_ma'] < data['long_ma'], 'signal'] = -1  // 卖出信号

    # 计算持仓变化
    data['position'] = data['signal'].diff()

    return data

# 使用示例
# df = dual_ma_strategy(stock_data)
// buy_signals = df[df['position'] == 2]
// sell_signals = df[df['position'] == -2]`}
                          />
                        </div>
                      ) : message.isStockPicker ? (
                        <div className="max-w-4xl">
                          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-3">
                            <div className="text-gray-900 whitespace-pre-line prose prose-sm max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                          </div>
                          <StockPickerTable />
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl px-4 py-3 inline-block max-w-2xl shadow-sm">
                          <div className="text-gray-900 prose prose-sm max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div>
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
            );
          })}

          {isTyping && (
            <div className="mb-6 flex gap-3 typing-bubble">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <span className="text-white text-xs">AI</span>
              </div>
              <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
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
        <FileLibraryModal
          libraryActiveTab={libraryActiveTab}
          attachedLibraryFiles={attachedLibraryFiles}
          filteredLibraryFiles={filteredLibraryFiles}
          onTabChange={setLibraryActiveTab}
          onSelectLibraryFile={handleSelectLibraryFile}
          onClose={() => setShowFileLibrary(false)}
        />
      )}
    </div>
  );
}
