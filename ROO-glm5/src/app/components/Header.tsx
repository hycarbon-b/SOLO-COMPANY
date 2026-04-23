import { Bell, Menu, Pencil, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Task } from '../App';

interface HeaderProps {
  currentTask?: Task;
  onUpdateTitle: (taskId: string, newTitle: string) => void;
}

export function Header({ currentTask, onUpdateTitle }: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = () => {
    if (currentTask) {
      setEditTitle(currentTask.title);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (currentTask && editTitle.trim()) {
      onUpdateTitle(currentTask.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
  };

  return (
    <header className="h-full flex items-center justify-between px-6 bg-white">
      <div className="flex items-center gap-4 flex-1">
        <button className="md:hidden text-gray-600">
          <Menu className="w-5 h-5" />
        </button>

        {currentTask && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-gray-400"
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-900">{currentTask.title}</span>
                <button
                  onClick={handleStartEdit}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
