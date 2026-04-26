import { X, FileText, Image as ImageIcon } from 'lucide-react';
import type { LibraryFile } from '../fakeChatData';

interface AttachmentPreviewListProps {
  attachedFiles: File[];
  attachedLibraryFiles: LibraryFile[];
  onRemoveFile: (index: number) => void;
  onRemoveLibraryFile: (fileId: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file: File) {
  return file.type.startsWith('image/') ? ImageIcon : FileText;
}

export function AttachmentPreviewList({
  attachedFiles,
  attachedLibraryFiles,
  onRemoveFile,
  onRemoveLibraryFile,
}: AttachmentPreviewListProps) {
  if (attachedFiles.length === 0 && attachedLibraryFiles.length === 0) {
    return null;
  }

  return (
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
              <button onClick={() => onRemoveFile(index)} className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0">
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
              <button onClick={() => onRemoveLibraryFile(file.id)} className="p-1 hover:bg-green-100 rounded transition-colors flex-shrink-0">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}