import { useState, useRef, useEffect, useCallback } from 'react';
import { callOpenClawGateway } from '../../services/openclawGateway';
import { loadMessages, saveMessages, loadSysPrompt, saveSysPrompt } from '../../services/conversationStore';
import chatConfig from '../config/chatConfig.json';
import type { Message } from '../fakeChatData';
import { fakeMessagesMap } from '../fakeChatData';
import type { DiscussionThread } from '../../types/discussion';
import type { AgentInfo } from '../components/AgentPage';
import type { TabType } from '../components/MainContent';

const genMsgId = (role: 'user' | 'assistant') =>
  `${Date.now()}-${role}-${Math.random().toString(36).slice(2, 9)}`;

const isSeedTaskId = (id: string) => /^\d{1,2}$/.test(id);

interface UseChatSessionOptions {
  effectiveTaskId: string | null;
  tasks: Array<{ id: string; title: string }>;
  onAddTask: (title: string) => string;
  onUpdateTaskStatus: (taskId: string, status: 'idle' | 'working' | 'completed' | 'error') => void;
  onOpenTab: (type: TabType, title: string, taskId?: string, url?: string) => void;
}

export function useChatSession({
  effectiveTaskId,
  tasks,
  onAddTask,
  onUpdateTaskStatus,
  onOpenTab,
}: UseChatSessionOptions) {
  const [inputValue, setInputValue] = useState('');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({ ...fakeMessagesMap });
  const [systemPromptsMap, setSystemPromptsMap] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages when a chat tab opens
  useEffect(() => {
    if (!effectiveTaskId) return;
    if ((messagesMap[effectiveTaskId]?.length ?? 0) > 0) return;
    const stored = loadMessages(effectiveTaskId);
    if (stored.length > 0) {
      setMessagesMap(prev => ({
        ...prev,
        [effectiveTaskId]: stored.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
      }));
    }
    const sp = loadSysPrompt(effectiveTaskId);
    if (sp) {
      setSystemPromptsMap(prev => ({ ...prev, [effectiveTaskId]: sp }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTaskId]);

  // Persist messages on change (skip seed IDs, only changed refs)
  const prevMessagesMapRef = useRef<Record<string, Message[]>>({});
  useEffect(() => {
    const prev = prevMessagesMapRef.current;
    Object.entries(messagesMap).forEach(([taskId, msgs]) => {
      if (isSeedTaskId(taskId)) return;
      if (prev[taskId] === msgs) return;
      saveMessages(taskId, msgs.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      })));
    });
    prevMessagesMapRef.current = messagesMap;
  }, [messagesMap]);

  // Persist system prompts
  useEffect(() => {
    Object.entries(systemPromptsMap).forEach(([taskId, sp]) => {
      if (isSeedTaskId(taskId)) return;
      saveSysPrompt(taskId, sp);
    });
  }, [systemPromptsMap]);

  // Global reset (from About page)
  useEffect(() => {
    const handler = () => {
      setMessagesMap({ ...fakeMessagesMap });
      setSystemPromptsMap({});
      setInputValue('');
    };
    window.addEventListener('yuanji:reset-all', handler);
    return () => window.removeEventListener('yuanji:reset-all', handler);
  }, []);

  // Inject HTML card from external HTTP request (port 17900)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onInjectHtml) return;
    const off = api.onInjectHtml((data: { html: string; conversationId: string }) => {
      if (!data?.html || !data?.conversationId) return;
      const { html, conversationId } = data;
      const newMsg: Message = {
        id: genMsgId('assistant'),
        role: 'assistant',
        content: html,
        type: 'html',
        timestamp: new Date(),
      };
      setMessagesMap(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMsg],
      }));
      const existingTask = tasks.find(t => t.id === conversationId);
      if (existingTask) {
        onOpenTab('chat', existingTask.title, conversationId);
      }
    });
    return () => { if (typeof off === 'function') off(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, onOpenTab]);

  const messages = effectiveTaskId ? (messagesMap[effectiveTaskId] || []) : [];

  // Reset typing when leaving chat
  useEffect(() => {
    if (effectiveTaskId === null) setIsTyping(false);
  }, [effectiveTaskId]);

  // Reflect typing into task status
  useEffect(() => {
    if (effectiveTaskId && isTyping) {
      onUpdateTaskStatus(effectiveTaskId, 'working');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping, effectiveTaskId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleAgentStartChat = useCallback((agent: AgentInfo) => {
    const title = `${agent.role} · ${agent.name}`;
    const taskId = onAddTask(title);
    const welcomeMessage = `您好，我是${agent.name}，当前担任${agent.role}。我会先帮您快速梳理目标、关键数据和预期产出，再给出可执行建议。您可以直接告诉我想分析的市场、标的、策略，或把相关文件发给我，我会立即开始。`;

    setMessagesMap(prev => ({
      ...prev,
      [taskId]: [{
        id: `${taskId}-welcome`,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      }],
    }));

    if (agent.systemPrompt) {
      setSystemPromptsMap(prev => ({ ...prev, [taskId]: agent.systemPrompt }));
    }

    onUpdateTaskStatus(taskId, 'idle');
    onOpenTab('chat', title, taskId);
  }, [onAddTask, onUpdateTaskStatus, onOpenTab]);

  const handleAgentTaskComplete = useCallback((thread: DiscussionThread) => {
    const { startRecord, endRecord } = thread;
    const title = `${startRecord.worker_label} - ${startRecord.worker_name}`;
    const taskId = onAddTask(title);

    const summary = endRecord?.summary || startRecord.task_objective || '';
    const welcomeMessage = `**任务目标：** ${startRecord.task_objective}\n\n${startRecord.task_context ? '**背景信息：** ' + startRecord.task_context + '\n\n' : ''}${summary ? '**完成总结：** ' + summary + '\n\n' : ''}您可以继续提问或要求我执行相关操作。`;

    setMessagesMap(prev => ({
      ...prev,
      [taskId]: [{
        id: `${taskId}-welcome`,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      }],
    }));

    onUpdateTaskStatus(taskId, 'idle');
    onOpenTab('chat', title, taskId);
  }, [onAddTask, onUpdateTaskStatus, onOpenTab]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userContent = inputValue.trim();
    const userMessage: Message = {
      id: genMsgId('user'),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    let taskIdToUse = effectiveTaskId;
    if (effectiveTaskId === null) {
      taskIdToUse = onAddTask(userContent.substring(0, 30));
      onOpenTab('chat', userContent.substring(0, 30), taskIdToUse);
    }

    setInputValue('');

    if (!taskIdToUse) return;
    const taskId = taskIdToUse;

    setMessagesMap(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), userMessage],
    }));
    onUpdateTaskStatus(taskId, 'working');

    const patchMsg = (msgId: string, patch: (m: Message) => Partial<Message>) => {
      setMessagesMap(prev => {
        const msgs = prev[taskId] || [];
        const idx = msgs.findIndex(m => m.id === msgId);
        if (idx === -1) return prev;
        const updated = [...msgs];
        updated[idx] = { ...updated[idx], ...patch(updated[idx]) };
        return { ...prev, [taskId]: updated };
      });
    };
    const appendMsg = (msg: Message) => {
      setMessagesMap(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), msg],
      }));
    };

    const assistantMsgId = genMsgId('assistant');
    let currentAsstMsgId = assistantMsgId;
    appendMsg({ id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() });

    setIsTyping(true);

    try {
      const sysPrompt = systemPromptsMap[taskId] ?? chatConfig.defaultSystemPrompt;
      const finalSystemPrompt = sysPrompt.replace('{{CONVERSATION_ID}}', taskId);
      const { text } = await callOpenClawGateway(
        userContent,
        (_chunk, accumulated, isNewSegment) => {
          setIsTyping(false);
          if (isNewSegment) {
            const newMsgId = genMsgId('assistant');
            currentAsstMsgId = newMsgId;
            appendMsg({ id: newMsgId, role: 'assistant', content: accumulated, timestamp: new Date() });
            return;
          }
          patchMsg(currentAsstMsgId, () => ({ content: accumulated }));
        },
        finalSystemPrompt
      );

      patchMsg(currentAsstMsgId, m => (m.content ? {} : { content: text || '' }));
      onUpdateTaskStatus(taskId, 'completed');
    } catch (err: any) {
      const errorText = `⚠️ ${err?.message || '连接 OpenClaw Gateway 失败，请检查配置。'}`;
      patchMsg(currentAsstMsgId, m => ({
        content: m.content ? `${m.content}\n\n${errorText}` : errorText,
      }));
      onUpdateTaskStatus(taskId, 'error');
    } finally {
      setIsTyping(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, effectiveTaskId, onAddTask, onUpdateTaskStatus, onOpenTab]);

  return {
    inputValue,
    setInputValue,
    messagesMap,
    isTyping,
    messages,
    messagesEndRef,
    handleSendMessage,
    handleAgentStartChat,
    handleAgentTaskComplete,
  };
}
