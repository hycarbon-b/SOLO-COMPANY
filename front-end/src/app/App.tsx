import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';

export interface Task {
  id: string;
  title: string;
  time: string;
  pinned?: boolean;
  status?: 'idle' | 'working' | 'completed' | 'error';
  hasUnread?: boolean;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: '今日市场行情分析', time: '2小时前', status: 'completed', hasUnread: false },
    { id: '4', title: '生成双均线交易策略', time: '5小时前', status: 'completed', hasUnread: false },
    { id: '5', title: '智能选股推荐', time: '1小时前', status: 'completed', hasUnread: false },
    { id: '6', title: '美股筛选', time: '30分钟前', status: 'working', hasUnread: true },
    { id: '2', title: '量化交易策略优化', time: '1天前', status: 'working', hasUnread: true },
    { id: '3', title: '持仓风险评估报告', time: '3天前', status: 'error', hasUnread: true },
  ]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const handleAddTask = (title: string): string => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title || '新工作',
      time: '刚刚',
      status: 'working',
      hasUnread: false,
    };
    setTasks([newTask, ...tasks]);
    setCurrentTaskId(newTask.id);
    return newTask.id;
  };

  const handleMarkAsRead = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, hasUnread: false } : task
    ));
  };

  const handleUpdateTaskTitle = (taskId: string, newTitle: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, title: newTitle } : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    if (currentTaskId === taskId) {
      setCurrentTaskId(null);
    }
  };

  const handleTogglePin = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, pinned: !task.pinned } : task
    ));
  };

  const handleUpdateTaskStatus = (taskId: string, status: 'idle' | 'working' | 'completed' | 'error') => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, status } : task
    ));
  };

  return (
    <div className="h-screen bg-white overflow-hidden">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={15} minSize={12} maxSize={25}>
          <Sidebar
            tasks={tasks}
            onDeleteTask={handleDeleteTask}
            onTogglePin={handleTogglePin}
            onMarkAsRead={handleMarkAsRead}
            currentTaskId={currentTaskId}
            setCurrentTaskId={setCurrentTaskId}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

        <Panel defaultSize={85} minSize={50}>
          <MainContent
            onAddTask={handleAddTask}
            tasks={tasks}
            onUpdateTaskTitle={handleUpdateTaskTitle}
            onUpdateTaskStatus={handleUpdateTaskStatus}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}