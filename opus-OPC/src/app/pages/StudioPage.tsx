import { useState } from 'react';
import { Send, Sparkles, Wand2, PenSquare, Layers, Loader2 } from 'lucide-react';
import { PageHeader, Badge } from '../components/common';
import { PLATFORMS } from '@/services/mock';
import { RepurposeStudio } from '../components/RepurposeStudio';
import { toast } from 'sonner';
import { chat, LLMNotConfiguredError } from '@/services/llm';
import { isLLMConfigured, useAppConfig } from '@/services/config';
import { draftsStore, recordActivity } from '@/services/store';
import type { ContentDraft } from '@/services/mock';

type StudioTab = 'editor' | 'repurpose';

const SYSTEM_PROMPT = (brand: string, tone: string, platforms: string[]) =>
  `你是「${brand}」的资深内容编辑，写作语气：${tone}。` +
  `请基于用户提供的草稿与需求，针对以下平台分别给出改写版本：${platforms.join('、')}。` +
  `输出格式：每个平台用「## 平台名」标题分段，正文紧贴平台调性（字数、表情、话题标签等）。`;

export function StudioPage() {
  const cfg = useAppConfig();
  const [activeTab, setActiveTab] = useState<StudioTab>('editor');
  const [title, setTitle] = useState('一人公司启动指南：从 0 到 1 的 7 个动作');
  const [body, setBody] = useState(
    '## 引子\n\n过去 30 天我亲测了 7 个动作，把启动周期从 90 天压缩到 21 天。\n\n## 七个动作\n\n1. 找到一个能向 100 个人讲清楚的小问题\n2. ...'
  );
  const [style, setStyle] = useState('真诚分享');
  const [selected, setSelected] = useState<string[]>(['wechat', 'xiaohongshu']);
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: '你好，我是文案改写师。把草稿丢给我，告诉我目标平台。' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  function togglePlatform(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function send() {
    const userMsg = input.trim();
    if (!userMsg || busy) return;
    setChatLog((c) => [...c, { role: 'user', text: userMsg }]);
    setInput('');
    setBusy(true);

    const platformNames = PLATFORMS.filter((p) => selected.includes(p.id)).map((p) => p.name);

    if (isLLMConfigured()) {
      try {
        const reply = await chat([
          { role: 'system', content: SYSTEM_PROMPT(cfg.brand.name, cfg.brand.tone, platformNames) },
          { role: 'user',   content: `当前草稿：\n# ${title}\n\n${body}\n\n用户需求：${userMsg}` },
        ], { temperature: 0.7, maxTokens: 1200 });
        setChatLog((c) => [...c, {
          role: 'agent',
          text: `已基于「${userMsg}」生成 ${selected.length} 个平台版本：\n\n${reply}`,
        }]);
      } catch (e) {
        const msg = e instanceof LLMNotConfiguredError
          ? e.message
          : `调用失败：${(e as Error).message}`;
        setChatLog((c) => [...c, {
          role: 'agent',
          text: `已基于「${userMsg}」尝试改写，但 ${msg}`,
        }]);
      }
    } else {
      setChatLog((c) => [...c, {
        role: 'agent',
        text: `已基于「${userMsg}」改写为 ${selected.length} 个平台版本（未配置 API · 当前为占位回复）。请前往「设置」配置 LLM API Key。`,
      }]);
    }
    setBusy(false);
  }

  async function aiOptimize() {
    if (optimizing) return;
    if (!isLLMConfigured()) {
      toast.message('AI 优化中...', { description: '尚未配置 API，使用本地启发式提示：收紧开头、强化 hook、加入动作动词。' });
      return;
    }
    setOptimizing(true);
    try {
      const reply = await chat([
        { role: 'system', content: `你是「${cfg.brand.name}」的资深内容编辑，写作语气：${cfg.brand.tone}。请将用户提供的草稿优化得更具吸引力（保留原结构，仅润色文字、加强 hook、收紧逻辑）。直接返回优化后的正文，不要前后语。` },
        { role: 'user', content: `# ${title}\n\n${body}\n\n风格偏好：${style}` },
      ], { temperature: 0.6, maxTokens: 1600 });
      setBody(reply);
      toast.success('已应用 AI 优化');
    } catch (e) {
      toast.error('AI 优化失败：' + (e as Error).message);
    } finally {
      setOptimizing(false);
    }
  }

  function saveDraft() {
    const id = 'd-' + Date.now().toString(36);
    const newDraft: ContentDraft = {
      id,
      title: title || '未命名草稿',
      excerpt: body.slice(0, 80).replace(/\n+/g, ' '),
      type: 'article',
      platforms: selected,
      scheduledAt: '草稿保存于 ' + new Date().toLocaleString('zh-CN', { hour12: false }),
      status: 'draft',
    };
    draftsStore.update((cur) => [newDraft, ...cur]);
    recordActivity({ type: 'publish', text: `草稿《${newDraft.title}》已保存`, icon: '•' });
    toast.success('草稿已保存');
  }

  return (
    <div className="page-shell" data-testid="page-studio">
      <div className="page-inner">
        <PageHeader
          title="内容创作"
          description="左侧 Brief · 中间编辑器 · 右侧 Agent 协作。"
          actions={
            <button
              onClick={saveDraft}
              className="btn-secondary"
            >
              保存草稿
            </button>
          }
        />

        {/* Tab bar — editorial squared tabs */}
        <div className="flex gap-0" style={{ borderBottom: '1px solid var(--panel-border-soft)' }}>
          <button
            onClick={() => setActiveTab('editor')}
            className="flex items-center gap-1.5 text-[12px] px-4 py-2 font-medium transition relative"
            style={{
              color: activeTab === 'editor' ? 'var(--foreground)' : 'var(--muted-foreground)',
              borderBottom: activeTab === 'editor' ? '2px solid var(--foreground)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
            data-testid="tab-editor"
          >
            <PenSquare className="h-3.5 w-3.5" />
            创作编辑
          </button>
          <button
            onClick={() => setActiveTab('repurpose')}
            className="flex items-center gap-1.5 text-[12px] px-4 py-2 font-medium transition relative"
            style={{
              color: activeTab === 'repurpose' ? 'var(--foreground)' : 'var(--muted-foreground)',
              borderBottom: activeTab === 'repurpose' ? '2px solid var(--foreground)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
            data-testid="tab-repurpose"
          >
            <Layers className="h-3.5 w-3.5" />
            改写工坊
            <span className="text-[9px] px-1.5 py-0.5 num font-bold tracking-wider"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}>
              NEW
            </span>
          </button>
        </div>

        {activeTab === 'editor' ? (
          <div className="grid grid-cols-12 gap-4">
            {/* Brief */}
            <div className="col-span-12 lg:col-span-3 panel p-5 space-y-4">
              <h3 className="label-caps">Brief</h3>
              <div>
                <label className="label-caps">标题</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field mt-2"
                />
              </div>
              <div>
                <label className="label-caps">目标平台</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => {
                    const on = selected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className="text-[11px] px-2.5 py-1 border transition font-medium"
                        style={{
                          borderColor: on ? p.color : 'var(--panel-border-soft)',
                          background: on ? p.color : 'transparent',
                          color: on ? '#fff' : 'var(--muted-foreground)',
                        }}
                      >
                        {p.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label-caps">风格</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="input-field mt-2"
                >
                  <option>真诚分享</option>
                  <option>干货清单</option>
                  <option>故事化</option>
                  <option>带货种草</option>
                </select>
              </div>
              <button
                onClick={aiOptimize}
                disabled={optimizing}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                {optimizing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />优化中...</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5" />一键 AI 优化</>
                )}
              </button>
              {!isLLMConfigured() && (
                <div className="text-[11px] leading-relaxed pt-2 border-t" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--panel-border-soft)' }}>
                  ⚠ 尚未配置 LLM API。
                  <br />
                  请前往「设置 → AI 模型 API」填写 Key。
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="col-span-12 lg:col-span-6 panel flex flex-col">
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--panel-border-soft)' }}
              >
                <span className="text-[13px] font-semibold">{title}</span>
                <Badge color="amber">未保存</Badge>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 min-h-[440px] p-5 text-[13px] font-mono leading-relaxed bg-transparent outline-none resize-none"
                data-testid="studio-editor"
              />
            </div>

            {/* Agent panel */}
            <div className="col-span-12 lg:col-span-3 panel flex flex-col" style={{ minHeight: 480 }}>
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--panel-border-soft)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[13px] font-semibold">文案改写师</span>
                <Badge color={isLLMConfigured() ? 'green' : 'gray'} dot>
                  {isLLMConfigured() ? '在线' : '离线'}
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatLog.map((m, i) => (
                  <div
                    key={i}
                    className="text-[12px] px-3 py-2 max-w-[88%] leading-relaxed whitespace-pre-wrap"
                    style={
                      m.role === 'user'
                        ? { marginLeft: 'auto', background: 'var(--foreground)', color: 'var(--background)' }
                        : { background: 'var(--panel-muted)', border: '1px solid var(--panel-border-soft)' }
                    }
                  >
                    {m.text}
                  </div>
                ))}
                {busy && (
                  <div className="text-[12px] px-3 py-2 inline-flex items-center gap-2"
                    style={{ background: 'var(--panel-muted)', border: '1px solid var(--panel-border-soft)' }}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    思考中...
                  </div>
                )}
              </div>
              <div
                className="p-3 flex items-center gap-2"
                style={{ borderTop: '1px solid var(--panel-border-soft)' }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="告诉 Agent 你的需求..."
                  className="input-field"
                  disabled={busy}
                />
                <button
                  onClick={send}
                  disabled={busy}
                  className="btn-primary disabled:opacity-50"
                  style={{ padding: '8px 10px' }}
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
