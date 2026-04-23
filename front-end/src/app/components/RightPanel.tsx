import { FileText, Image, Table, Video, ChevronRight } from 'lucide-react';

const files = [
  { id: '1', name: '股票分析报告.pdf', type: 'document', size: '2.3 MB', date: '2小时前' },
  { id: '2', name: '市场趋势图.png', type: 'image', size: '456 KB', date: '3小时前' },
  { id: '3', name: '交易数据.xlsx', type: 'spreadsheet', size: '1.2 MB', date: '1天前' },
];

const agentLogs = [
  { id: '1', agent: '数据分析师', status: 'completed', message: '已完成数据采集和清洗', time: '10:23' },
  { id: '2', agent: '新闻分析师', status: 'processing', message: '正在分析最新市场新闻...', time: '10:25' },
  { id: '3', agent: '行情解读员', status: 'pending', message: '等待数据输入', time: '10:26' },
];

export function RightPanel() {
  return (
    <div className="w-80 bg-white flex flex-col">
      {/* Files Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900">生成文件</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无生成文件
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                      {file.type === 'document' && <FileText className="w-4 h-4 text-blue-600" />}
                      {file.type === 'image' && <Image className="w-4 h-4 text-green-600" />}
                      {file.type === 'spreadsheet' && <Table className="w-4 h-4 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">{file.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{file.size} · {file.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent Logs Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900">Agent 工作流</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {agentLogs.map((log, index) => (
              <div key={log.id} className="relative">
                {index < agentLogs.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200" />
                )}
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    log.status === 'completed' ? 'bg-green-500' :
                    log.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-300'
                  }`}>
                    {log.status === 'completed' && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {log.status === 'processing' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-sm font-medium text-gray-900">{log.agent}</div>
                    <div className="text-xs text-gray-500 mt-1">{log.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{log.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
