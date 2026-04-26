import { useState } from 'react';
import { Bot, Play, Pause, RotateCcw, FileText, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { PageHeader, Badge } from '../components/common';
import { AGENTS, AGENT_LOGS } from '@/services/mock';
import { toast } from 'sonner';

type AgentStatus = (typeof AGENTS)[number]['status'];

// Log modal
function LogModal({
  agent,
  onClose,
}: {
  agent: (typeof AGENTS)[number];
  onClose: () => void;
}) {
  const logs = AGENT_LOGS[agent.id] ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
    >
      <div className="panel w-full max-w-lg flex flex-col" data-testid="agent-log-modal">
        {/* Header */}
        <div
          className="px-5 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">{agent.name}</div>
              <div className="text-[11px] text-[color:var(--muted-foreground)]">运行日志</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition"
            data-testid="agent-log-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Log timeline */}
        <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: 360 }}>
          {logs.length === 0 ? (
            <p className="text-xs text-center text-[color:var(--muted-foreground)] py-8">
              暂无日志记录
            </p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {log.status === 'ok' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : log.status === 'warn' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-[color:var(--muted-foreground)] font-mono mr-2">
                    {log.time}
                  </span>
                  <span
                    className={`text-xs ${
                      log.status === 'error'
                        ? 'text-rose-600'
                        : log.status === 'warn'
                        ? 'text-amber-700'
                        : ''
                    }`}
                  >
                    {log.event}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <span className="text-[11px] text-[color:var(--muted-foreground)]">
            上次运行：{agent.lastRun}
          </span>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// New Agent modal
function NewAgentModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('rewrite');

  function handleCreate() {
    if (!name.trim()) {
      toast.error('请输入 Agent 名称');
      return;
    }
    toast.success(`${name} 已创建`, { description: '初始化完成，可在卡片中管理' });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
    >
      <div className="panel w-full max-w-sm flex flex-col" data-testid="new-agent-modal">
        <div
          className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <span className="text-sm font-semibold">新建 Agent</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-[color:var(--muted-foreground)]">Agent 名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：周报撰写师"
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
              style={{ borderColor: 'var(--panel-border)' }}
              data-testid="new-agent-name"
            />
          </div>
          <div>
            <label className="text-xs text-[color:var(--muted-foreground)]">工作类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <option value="rewrite">内容改写</option>
              <option value="monitor">热点监控</option>
              <option value="design">配图生成</option>
              <option value="clip">视频剪辑</option>
              <option value="reply">评论管理</option>
              <option value="report">数据报告</option>
            </select>
          </div>
        </div>
        <div
          className="px-5 py-3 border-t flex justify-end gap-2"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            className="text-xs px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'var(--primary)' }}
            data-testid="new-agent-create"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentsPage() {
  const [agents, setAgents] = useState(AGENTS);
  const [logAgent, setLogAgent] = useState<(typeof AGENTS)[number] | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  function toggleAgent(id: string, currentStatus: AgentStatus) {
    const next: AgentStatus = currentStatus === 'running' ? 'idle' : 'running';
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
    const name = agents.find((a) => a.id === id)?.name ?? '';
    toast.success(`${name} 已${next === 'running' ? '启动' : '暂停'}`);
  }

  return (
    <div className="page-shell" data-testid="page-agents">
      {logAgent && <LogModal agent={logAgent} onClose={() => setLogAgent(null)} />}
      {showNewModal && <NewAgentModal onClose={() => setShowNewModal(false)} />}

      <div className="page-inner">
        <PageHeader
          title="AI 代理"
          description="把重复劳动交给 Agent · 你只看产出。"
          actions={
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-primary"
              data-testid="new-agent-btn"
            >
              <Bot className="h-3.5 w-3.5" />
              + 新建 Agent
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => {
            const statusCfg = {
              running: { color: 'green' as const, label: 'running', dot: true, ring: '#10b981' },
              idle:    { color: 'gray'  as const, label: 'idle',    dot: false, ring: '#94a3b8' },
              error:   { color: 'red'   as const, label: 'error',   dot: true,  ring: '#ef4444' },
            }[a.status] ?? { color: 'gray' as const, label: a.status, dot: false, ring: '#94a3b8' };

            return (
            <div key={a.id} className="panel p-4 flex flex-col gap-3 transition-shadow hover:shadow-md" style={{ transition: 'box-shadow var(--t-base)' }}>
              <div className="flex items-start justify-between">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: 'var(--gradient-brand)' }}
                >
                  <Bot className="h-5 w-5" />
                </div>
                <Badge color={statusCfg.color} dot={statusCfg.dot}>
                  {statusCfg.label}
                </Badge>
              </div>
              <div>
                <div className="text-[14px] font-semibold">{a.name}</div>
                <div className="mt-1 text-[12px] text-[color:var(--muted-foreground)] line-clamp-2">
                  {a.role}
                </div>
              </div>
              <div className="text-[11px] text-[color:var(--muted-foreground)] flex items-center gap-1.5">
                <span>上次运行：</span>
                <span className="font-medium text-slate-600">{a.lastRun}</span>
              </div>
              {/* Run history mini bar */}
              <div className="flex items-center gap-0.5" title="近 15 次运行状态">
                {[1,1,1,0,1,1,0,1,1,1,1,0,1,1,a.status==='error'?0:1].map((ok, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                      background: ok
                        ? a.status === 'error' && i === 14 ? '#ef4444' : '#10b981'
                        : '#fcd34d',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  onClick={() => toggleAgent(a.id, a.status)}
                  className="btn-secondary flex-1"
                  style={{ justifyContent: 'center' }}
                >
                  {a.status === 'running' ? (
                    <><Pause className="h-3 w-3" />暂停</>
                  ) : (
                    <><Play className="h-3 w-3" />启动</>
                  )}
                </button>
                <button
                  onClick={() => toast.success(`${a.name} 重跑中…`)}
                  className="btn-secondary"
                >
                  <RotateCcw className="h-3 w-3" />
                  重跑
                </button>
                <button
                  onClick={() => setLogAgent(a)}
                  className="btn-secondary"
                  data-testid={`log-btn-${a.id}`}
                >
                  <FileText className="h-3 w-3" />
                  日志
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



