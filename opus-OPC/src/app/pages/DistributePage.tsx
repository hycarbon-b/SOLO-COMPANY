import { useState } from 'react';
import { PageHeader, Badge } from '../components/common';
import { DRAFTS, PLATFORMS, type DraftStatus, type ContentDraft } from '@/services/mock';
import { Send, Clock, Eye, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const TABS: Array<{ key: 'all' | DraftStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'queued', label: '已排程' },
  { key: 'published', label: '已发布' },
  { key: 'failed', label: '失败' },
];

// Preview modal – shows how a draft looks on each target platform
function PreviewModal({ draft, onClose }: { draft: ContentDraft; onClose: () => void }) {
  const targetPlatforms = PLATFORMS.filter((p) => draft.platforms.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div
        className="panel w-full max-w-2xl max-h-[80vh] flex flex-col"
        data-testid="preview-modal"
      >
        {/* Header */}
        <div
          className="px-5 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div>
            <div className="text-sm font-semibold">{draft.title}</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
              平台预览 · {targetPlatforms.length} 个版本
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition"
            data-testid="preview-modal-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Platform previews */}
        <div className="overflow-y-auto p-4 space-y-3">
          {targetPlatforms.map((p) => (
            <div key={p.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--panel-border)' }}>
              {/* Platform header bar */}
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ background: `${p.color}18` }}
              >
                <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="text-xs font-semibold" style={{ color: p.color }}>
                  {p.name}
                </span>
                <span className="ml-auto text-[10px] text-[color:var(--muted-foreground)]">
                  {draft.scheduledAt}
                </span>
              </div>
              {/* Mock post body */}
              <div className="p-3 bg-white">
                <div className="text-xs font-medium mb-1">{draft.title}</div>
                <div className="text-[11px] text-[color:var(--muted-foreground)] leading-relaxed line-clamp-3">
                  {draft.excerpt}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-2 text-[10px] text-[color:var(--muted-foreground)]">
                    <span>👍 0</span>
                    <span>💬 0</span>
                    <span>↗️ 0</span>
                  </div>
                  <button className="flex items-center gap-1 text-[10px] text-indigo-500 hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    在平台打开
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <span className="text-xs text-[color:var(--muted-foreground)]">
            预计触达：~{(targetPlatforms.length * 8400).toLocaleString()} 人
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              关闭
            </button>
            <button
              onClick={() => {
                toast.success('已加入发布队列');
                onClose();
              }}
              className="text-xs px-3 py-1.5 rounded-lg text-white"
              style={{ background: 'var(--primary)' }}
            >
              确认发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DistributePage() {
  const [tab, setTab] = useState<'all' | DraftStatus>('all');
  const [previewDraft, setPreviewDraft] = useState<ContentDraft | null>(null);
  const drafts = tab === 'all' ? DRAFTS : DRAFTS.filter((d) => d.status === tab);

  return (
    <div className="page-shell" data-testid="page-distribute">
      {previewDraft && (
        <PreviewModal draft={previewDraft} onClose={() => setPreviewDraft(null)} />
      )}
      <div className="page-inner">
        <PageHeader
          title="分发中心 Distribute"
          description="一稿多投：选择目标平台 → 自动适配 → 排程发布。"
          actions={
            <button
              onClick={() => toast.success('已加入发布队列')}
              className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
              style={{ background: 'var(--primary)' }}
            >
              <Send className="h-3.5 w-3.5" /> 一键发布
            </button>
          }
        />

        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                tab === t.key ? 'text-white' : 'bg-white'
              }`}
              style={{
                borderColor: 'var(--panel-border)',
                background: tab === t.key ? 'var(--primary)' : undefined,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d.id} data-testid={`draft-card-${d.id}`} className="panel p-4 flex items-start gap-4">
              <div
                className="h-16 w-16 rounded-lg shrink-0 flex items-center justify-center text-2xl"
                style={{ background: 'var(--panel-muted)' }}
              >
                {d.type === 'short-video'
                  ? '🎬'
                  : d.type === 'image-set'
                  ? '🖼️'
                  : d.type === 'tweet'
                  ? '🐦'
                  : '📝'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold truncate">{d.title}</span>
                  <Badge
                    color={
                      d.status === 'published'
                        ? 'green'
                        : d.status === 'failed'
                        ? 'red'
                        : d.status === 'queued'
                        ? 'indigo'
                        : 'gray'
                    }
                  >
                    {d.status}
                  </Badge>
                </div>
                <div className="text-xs text-[color:var(--muted-foreground)] line-clamp-1">
                  {d.excerpt}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.platforms.map((pid) => {
                    const p = PLATFORMS.find((x) => x.id === pid);
                    if (!p) return null;
                    return (
                      <span
                        key={pid}
                        className="text-[10px] px-2 py-0.5 rounded text-white"
                        style={{ background: p.color }}
                      >
                        {p.shortLabel}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {d.scheduledAt}
                </div>
                <button
                  onClick={() => setPreviewDraft(d)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border hover:bg-slate-50 transition"
                  style={{ borderColor: 'var(--panel-border)' }}
                  data-testid={`preview-btn-${d.id}`}
                >
                  <Eye className="h-3 w-3" />
                  预览
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



