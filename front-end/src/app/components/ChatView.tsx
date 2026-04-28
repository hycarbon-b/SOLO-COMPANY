import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel } from './ChatPanel';
import { RightPanelContainer } from './RightPanelContainer';
import type { Message } from '../fakeChatData';
import type { DiscussionThread } from '../../types/discussion';
import type { TabType } from './MainContent';

interface ChatViewProps {
  taskId: string | null;
  taskTitle?: string;
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSendMessage: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => void;
  onOpenTab: (type: TabType, title: string, taskId?: string, url?: string) => void;
  onAgentTaskComplete: (thread: DiscussionThread) => void;
}

export function ChatView({
  taskId,
  taskTitle,
  messages,
  isTyping,
  inputValue,
  setInputValue,
  onSendMessage,
  messagesEndRef,
  onUpdateTaskTitle,
  onOpenTab,
  onAgentTaskComplete,
}: ChatViewProps) {
  return (
    <main className="h-full flex overflow-hidden bg-white">
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={75} minSize={50}>
          <ChatPanel
            messages={messages}
            isTyping={isTyping}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSendMessage={onSendMessage}
            messagesEndRef={messagesEndRef}
            taskTitle={taskTitle}
            onUpdateTitle={(newTitle) => taskId && onUpdateTaskTitle(taskId, newTitle)}
            onOpenTab={onOpenTab}
          />
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />
        <RightPanelContainer onAgentTaskComplete={onAgentTaskComplete} />
      </PanelGroup>
    </main>
  );
}
