import { useState } from 'react';
import { Send, Sparkles, Wand2, PenSquare, Layers } from 'lucide-react';
import { PageHeader, Badge } from '../components/common';
import { PLATFORMS } from '@/services/mock';
import { RepurposeStudio } from '../components/RepurposeStudio';
import { toast } from 'sonner';

type StudioTab = 'editor' | 'repurpose';

export function StudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('editor');
  const [title, setTitle] = useState('一人公司启动指南：从 0 到 1 的 7 个动作');
  const [body, setBody] = useState(
    '## 引子\n\n过去 30 天我亲测了 7 个动作，把启动周期从 90 天压缩到 21 天。\n\n## 七个动作\n\n1. 找到一个能向 100 个人讲清楚的小问题\n2. ...'
  );
  const [selected, setSelected] = useState<string[]>(['wechat', 'xiaohongshu']);
  const [chat, setChat] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: '你好，我是文案改写师 ✍️。把草稿丢给我，告诉我目标平台。' },
  ]);
  const [input, setInput] = useState('');

  function togglePlatform(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function send() {
    if (!input.trim()) return;
    setChat((c) => [
      ...c,
      { role: 'user', text: input },
      {
        role: 'agent',
        text: `已基于「${input}」改写为 ${selected.length} 个平台版本（mock）。点击「应用到草稿」可覆盖中间编辑器。`,
      },
    ]);
    setInput('');
  }

  return (
    <div className="page-shell" data-testid="page-studio">
      <div className="page-inner">
        <PageHeader
          title="内容创作 Studio"
          description="左侧 Brief · 中间编辑器 · 右侧 Agent 协作。"
          actions={
            <button
              onClick={() => toast.success('草稿已保存')}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              保存草稿
            </button>
          }
        />

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--panel-muted)', width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'editor' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
            }`}
            data-testid="tab-editor"
          >
            <PenSquare className="h-3.5 w-3.5" />
            创作编辑
          </button>
          <button
            onClick={() => setActiveTab('repurpose')}
            className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'repurpose' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
            }`}
            data-testid="tab-repurpose"
          >
            <Layers className="h-3.5 w-3.5" />
            改写工坊
            <span className="text-[10px] px-1.5 py-0.5 rounded text-white font-semibold" style={{ background: 'var(--accent)' }}>
              NEW
            </span>
          </button>
        </div>

        {activeTab === 'editor' ? (
          <div className="grid grid-cols-12 gap-4">
          {/* Brief */}
          <div className="col-span-12 lg:col-span-3 panel p-4 space-y-4">
            <h3 className="text-sm font-semibold">Brief</h3>
            <div>
              <label className="text-xs text-[color:var(--muted-foreground)]">标题</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
                style={{ borderColor: 'var(--panel-border)' }}
              />
            </div>
            <div>
              <label className="text-xs text-[color:var(--muted-foreground)]">目标平台</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition ${
                      selected.includes(p.id)
                        ? 'text-white'
                        : 'text-[color:var(--muted-foreground)] hover:bg-slate-50'
                    }`}
                    style={{
                      borderColor: 'var(--panel-border)',
                      background: selected.includes(p.id) ? p.color : 'transparent',
                    }}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[color:var(--muted-foreground)]">风格</label>
              <select
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <option>真诚分享</option>
                <option>干货清单</option>
                <option>故事化</option>
                <option>带货种草</option>
              </select>
            </div>
            <button
              onClick={() => toast.message('AI 优化中...', { description: '这是 mock 行为' })}
              className="w-full text-sm px-3 py-2 rounded-lg text-white flex items-center justify-center gap-1.5"
              style={{ background: 'var(--primary)' }}
            >
              <Wand2 className="h-3.5 w-3.5" />
              一键 AI 优化
            </button>
          </div>

          {/* Editor */}
          <div className="col-span-12 lg:col-span-6 panel flex flex-col">
            <div
              className="px-4 py-2.5 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <span className="text-sm font-semibold">{title}</span>
              <Badge color="amber">未保存</Badge>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="flex-1 min-h-[420px] p-4 text-sm font-mono leading-relaxed bg-transparent outline-none resize-none"
              data-testid="studio-editor"
            />
          </div>

          {/* Agent panel */}
          <div className="col-span-12 lg:col-span-3 panel flex flex-col" style={{ minHeight: 480 }}>
            <div
              className="px-4 py-2.5 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold">文案改写师</span>
              <Badge color="green">在线</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`text-xs px-3 py-2 rounded-lg max-w-[85%] ${
                    m.role === 'user'
                      ? 'ml-auto text-white'
                      : 'bg-[color:var(--panel-muted)]'
                  }`}
                  style={m.role === 'user' ? { background: 'var(--primary)' } : undefined}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div
              className="p-2.5 border-t flex items-center gap-2"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="告诉 Agent 你的需求..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border bg-white"
                style={{ borderColor: 'var(--panel-border)' }}
              />
              <button
                onClick={send}
                className="p-1.5 rounded-lg text-white"
                style={{ background: 'var(--primary)' }}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        ) : (
          <RepurposeStudio />
        )}
      </div>
    </div>
  );
}
