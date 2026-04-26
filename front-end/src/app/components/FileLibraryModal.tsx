import type { LibraryFile } from '../fakeChatData';
import { LIBRARY_TABS } from '../fakeChatData';

interface FileLibraryModalProps {
  libraryActiveTab: string;
  attachedLibraryFiles: LibraryFile[];
  filteredLibraryFiles: LibraryFile[];
  onTabChange: (tab: string) => void;
  onSelectLibraryFile: (file: LibraryFile) => void;
  onClose: () => void;
}

export function FileLibraryModal({
  libraryActiveTab,
  attachedLibraryFiles,
  filteredLibraryFiles,
  onTabChange,
  onSelectLibraryFile,
  onClose,
}: FileLibraryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">从文件库添加</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex gap-2 flex-wrap">
            {LIBRARY_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
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
                const isSelected = attachedLibraryFiles.some((selectedFile) => selectedFile.id === file.id);
                const FileIcon = file.icon;

                return (
                  <div
                    key={file.id}
                    onClick={() => onSelectLibraryFile(file)}
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
            <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
            <button onClick={onClose} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors">确定</button>
          </div>
        </div>
      </div>
    </div>
  );
}