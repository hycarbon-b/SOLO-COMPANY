import { useState } from 'react';
import { FileText, Image, Table, Video, File, Trash2, MoreVertical, Grid, List, X, Maximize2, Minimize2, ExternalLink, FolderOpen } from 'lucide-react';

const tabs = ['全部', '文档', '幻灯片', '表格', '图片与视频', '策略代码', '更多'];

const initialFiles = [
  { id: '1', name: '股票分析报告.pdf', size: '2.3 MB', date: '2026-04-20', path: '/documents/reports/股票分析报告.pdf', type: '文档', icon: FileText, color: 'text-red-600' },
  { id: '4', name: '交易数据.xlsx', size: '1.2 MB', date: '2026-04-20', path: '/spreadsheets/交易数据.xlsx', type: '表格', icon: Table, color: 'text-green-600' },
  { id: '6', name: '趋势图.png', size: '456 KB', date: '2026-04-20', path: '/images/charts/趋势图.png', type: '图片与视频', icon: Image, color: 'text-purple-600' },
  { id: '9', name: '量化策略_V1.py', size: '128 KB', date: '2026-04-20', path: '/strategies/quant/量化策略_V1.py', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '2', name: '市场研究.docx', size: '1.5 MB', date: '2026-04-19', path: '/documents/research/市场研究.docx', type: '文档', icon: FileText, color: 'text-blue-600' },
  { id: '5', name: '财务报表.csv', size: '856 KB', date: '2026-04-19', path: '/spreadsheets/reports/财务报表.csv', type: '表格', icon: Table, color: 'text-green-600' },
  { id: '10', name: '趋势跟踪策略.py', size: '95 KB', date: '2026-04-19', path: '/strategies/trend/趋势跟踪策略.py', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '3', name: '季度总结.pptx', size: '5.2 MB', date: '2026-04-18', path: '/presentations/季度总结.pptx', type: '幻灯片', icon: FileText, color: 'text-orange-600' },
  { id: '11', name: '网格交易策略.json', size: '45 KB', date: '2026-04-18', path: '/strategies/grid/网格交易策略.json', type: '策略代码', icon: FileText, color: 'text-indigo-600' },
  { id: '7', name: '演示视频.mp4', size: '15.3 MB', date: '2026-04-17', path: '/videos/demos/演示视频.mp4', type: '图片与视频', icon: Video, color: 'text-pink-600' },
  { id: '8', name: '配置文件.json', size: '12 KB', date: '2026-04-16', path: '/config/配置文件.json', type: '更多', icon: File, color: 'text-gray-600' },
];

export function FilesPage() {
  const [activeTab, setActiveTab] = useState('全部');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<typeof initialFiles[0] | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [allFiles, setAllFiles] = useState(initialFiles);

  const mockFiles = {
    '全部': allFiles,
    '文档': allFiles.filter(f => f.type === '文档'),
    '幻灯片': allFiles.filter(f => f.type === '幻灯片'),
    '表格': allFiles.filter(f => f.type === '表格'),
    '图片与视频': allFiles.filter(f => f.type === '图片与视频'),
    '策略代码': allFiles.filter(f => f.type === '策略代码'),
    '更多': allFiles.filter(f => f.type === '更多'),
  };

  const currentFiles = mockFiles[activeTab as keyof typeof mockFiles] || [];

  const handleMenuClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === fileId ? null : fileId);
  };

  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setAllFiles(allFiles.filter(file => file.id !== fileId));
    setOpenMenuId(null);
  };

  const handleFileClick = (file: typeof allFiles[0]) => {
    setSelectedFile(file);
    setIsExpanded(false);
  };

  const handleCloseModal = () => {
    setSelectedFile(null);
    setIsExpanded(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">文件库</h2>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
            title="卡片视图"
          >
            <Grid className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
            title="列表视图"
          >
            <List className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pb-2">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentFiles.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无{activeTab}</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentFiles.map((file) => (
              <div
                key={file.id}
                className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer relative"
                onClick={() => handleFileClick(file)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${file.color}`}>
                    <file.icon className="w-5 h-5" />
                  </div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                      onClick={(e) => handleMenuClick(e, file.id)}
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
                        <div
                          className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg py-1 min-w-[120px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                            onClick={(e) => handleDelete(e, file.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{file.size}</div>
                </div>
                <div className="text-xs text-gray-400 mb-2">{file.date}</div>
                <div className="text-xs text-gray-500 truncate" title={file.path}>{file.path}</div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文件名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">路径</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {currentFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 ${file.color}`}>
                          <file.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{file.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{file.size}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{file.date}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-gray-500 truncate block" title={file.path}>{file.path}</span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 relative">
                        <button
                          className="p-2 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => handleMenuClick(e, file.id)}
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
                            <div
                              className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg py-1 min-w-[120px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                                onClick={(e) => handleDelete(e, file.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                删除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-20 backdrop-blur-lg" onClick={handleCloseModal}>
          <div
            className={`bg-white rounded-lg shadow-xl transition-all ${
              isExpanded ? 'w-[95vw] h-[95vh]' : 'w-[800px] h-[600px]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${selectedFile.color}`}>
                  <selectedFile.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">{selectedFile.size} · {selectedFile.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => console.log('打开源文件:', selectedFile.path)}
                  title="打开源文件"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => console.log('打开文件夹:', selectedFile.path.substring(0, selectedFile.path.lastIndexOf('/')))}
                  title="打开文件夹"
                >
                  <FolderOpen className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? '收缩' : '展开'}
                >
                  {isExpanded ? <Minimize2 className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={handleCloseModal}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
              <div className="p-6">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {selectedFile.type === '文档' && (
                      <div className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="mt-6 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    )}
                    {selectedFile.type === '表格' && (
                      <div className="p-4">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">列A</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">列B</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">列C</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">列D</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((row) => (
                              <tr key={row} className="border-t border-gray-200">
                                <td className="px-4 py-2"><div className="h-3 bg-gray-200 rounded w-20"></div></td>
                                <td className="px-4 py-2"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                                <td className="px-4 py-2"><div className="h-3 bg-gray-200 rounded w-24"></div></td>
                                <td className="px-4 py-2"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {selectedFile.type === '图片与视频' && selectedFile.name.includes('mp4') && (
                      <div className="bg-black flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[16px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1"></div>
                          </div>
                          <p className="text-white text-sm">视频预览</p>
                        </div>
                      </div>
                    )}
                    {selectedFile.type === '图片与视频' && selectedFile.name.includes('png') && (
                      <div className="bg-gray-100 flex items-center justify-center min-h-[400px]">
                        <div className="bg-gradient-to-br from-blue-400 to-purple-500 w-64 h-48 rounded-lg shadow-lg"></div>
                      </div>
                    )}
                    {selectedFile.type === '策略代码' && (
                      <div className="p-6 bg-gray-900 text-gray-100 font-mono text-sm">
                        <div className="space-y-2">
                          <div><span className="text-purple-400">import</span> <span className="text-blue-300">pandas</span> <span className="text-purple-400">as</span> pd</div>
                          <div><span className="text-purple-400">import</span> <span className="text-blue-300">numpy</span> <span className="text-purple-400">as</span> np</div>
                          <div><span className="text-purple-400">import</span> <span className="text-blue-300">datetime</span></div>
                          <div className="mt-4"><span className="text-purple-400">class</span> <span className="text-yellow-300">TradingStrategy</span>:</div>
                          <div className="ml-4"><span className="text-purple-400">def</span> <span className="text-yellow-300">__init__</span>(<span className="text-orange-300">self</span>):</div>
                          <div className="ml-8"><span className="text-orange-300">self</span>.data = pd.DataFrame()</div>
                          <div className="ml-8"><span className="text-orange-300">self</span>.signals = []</div>
                          <div className="mt-4 ml-4"><span className="text-purple-400">def</span> <span className="text-yellow-300">calculate_indicators</span>(<span className="text-orange-300">self</span>):</div>
                          <div className="ml-8"><span className="text-gray-400"># 计算技术指标</span></div>
                          <div className="ml-8"><span className="text-orange-300">self</span>.data[<span className="text-green-300">'MA20'</span>] = <span className="text-orange-300">self</span>.data[<span className="text-green-300">'close'</span>].rolling(<span className="text-blue-300">20</span>).mean()</div>
                          <div className="ml-8"><span className="text-orange-300">self</span>.data[<span className="text-green-300">'MA50'</span>] = <span className="text-orange-300">self</span>.data[<span className="text-green-300">'close'</span>].rolling(<span className="text-blue-300">50</span>).mean()</div>
                          <div className="ml-8"><span className="text-purple-400">return</span> <span className="text-orange-300">self</span>.data</div>
                          <div className="mt-4 ml-4"><span className="text-purple-400">def</span> <span className="text-yellow-300">generate_signals</span>(<span className="text-orange-300">self</span>):</div>
                          <div className="ml-8"><span className="text-gray-400"># 生成交易信号</span></div>
                          <div className="ml-8"><span className="text-purple-400">if</span> <span className="text-orange-300">self</span>.data[<span className="text-green-300">'MA20'</span>].iloc[-<span className="text-blue-300">1</span>] {'>'} <span className="text-orange-300">self</span>.data[<span className="text-green-300">'MA50'</span>].iloc[-<span className="text-blue-300">1</span>]:</div>
                          <div className="ml-12"><span className="text-purple-400">return</span> <span className="text-green-300">'BUY'</span></div>
                          <div className="ml-8"><span className="text-purple-400">else</span>:</div>
                          <div className="ml-12"><span className="text-purple-400">return</span> <span className="text-green-300">'SELL'</span></div>
                        </div>
                      </div>
                    )}
                    {selectedFile.type === '幻灯片' && (
                      <div className="p-6 space-y-4">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-48 rounded-lg flex items-center justify-center">
                          <div className="text-white text-2xl font-semibold">幻灯片标题</div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gray-100 h-24 rounded"></div>
                          <div className="bg-gray-100 h-24 rounded"></div>
                          <div className="bg-gray-100 h-24 rounded"></div>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-48 rounded-lg flex items-center justify-center">
                          <div className="text-white text-xl font-semibold">第二页</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-100 h-32 rounded"></div>
                          <div className="bg-gray-100 h-32 rounded"></div>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-48 rounded-lg flex items-center justify-center">
                          <div className="text-white text-xl font-semibold">第三页</div>
                        </div>
                      </div>
                    )}
                    {selectedFile.type === '更多' && (
                      <div className="p-6 bg-gray-900 text-gray-100 font-mono text-sm">
                        <div className="space-y-1">
                          <div>{'{'}</div>
                          <div className="ml-4"><span className="text-blue-300">"name"</span>: <span className="text-green-300">"config"</span>,</div>
                          <div className="ml-4"><span className="text-blue-300">"version"</span>: <span className="text-green-300">"1.0.0"</span>,</div>
                          <div className="ml-4"><span className="text-blue-300">"description"</span>: <span className="text-green-300">"Trading system configuration"</span>,</div>
                          <div className="ml-4"><span className="text-blue-300">"settings"</span>: {'{'}</div>
                          <div className="ml-8"><span className="text-blue-300">"enabled"</span>: <span className="text-purple-300">true</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"apiUrl"</span>: <span className="text-green-300">"https://api.example.com"</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"timeout"</span>: <span className="text-orange-300">5000</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"retryAttempts"</span>: <span className="text-orange-300">3</span></div>
                          <div className="ml-4">{'},'},</div>
                          <div className="ml-4"><span className="text-blue-300">"trading"</span>: {'{'}</div>
                          <div className="ml-8"><span className="text-blue-300">"maxPositions"</span>: <span className="text-orange-300">10</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"defaultLeverage"</span>: <span className="text-orange-300">1</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"stopLoss"</span>: <span className="text-orange-300">0.05</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"takeProfit"</span>: <span className="text-orange-300">0.15</span></div>
                          <div className="ml-4">{'},'},</div>
                          <div className="ml-4"><span className="text-blue-300">"notifications"</span>: {'{'}</div>
                          <div className="ml-8"><span className="text-blue-300">"email"</span>: <span className="text-purple-300">true</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"sms"</span>: <span className="text-purple-300">false</span>,</div>
                          <div className="ml-8"><span className="text-blue-300">"webhook"</span>: <span className="text-green-300">"https://webhook.example.com"</span></div>
                          <div className="ml-4">{'}'}</div>
                          <div>{'}'}</div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
