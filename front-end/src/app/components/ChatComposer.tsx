import { Mic, ArrowUp, HardDrive, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { libraryFiles, type LibraryFile } from '../fakeChatData';
import { AttachmentPreviewList } from './AttachmentPreviewList';
import { FileLibraryModal } from './FileLibraryModal';

interface ChatComposerProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  variant?: 'home' | 'chat';
}

const VARIANT_BORDER: Record<NonNullable<ChatComposerProps['variant']>, string> = {
  home: 'border border-blue-100',
  chat: 'border border-gray-100',
};

export function ChatComposer({
  inputValue,
  onInputChange,
  onSend,
  variant = 'chat',
}: ChatComposerProps) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedLibraryFiles, setAttachedLibraryFiles] = useState<LibraryFile[]>([]);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [libraryActiveTab, setLibraryActiveTab] = useState('全部');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLibraryFiles = libraryActiveTab === '全部'
    ? libraryFiles
    : libraryFiles.filter(f => f.type === libraryActiveTab);

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

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend();
    setAttachedFiles([]);
    setAttachedLibraryFiles([]);
  };

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow ${VARIANT_BORDER[variant]}`}>
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
            onChange={(e) => onInputChange(e.target.value)}
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
              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              disabled={!inputValue.trim()}
              onClick={handleSend}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
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
    </>
  );
}
