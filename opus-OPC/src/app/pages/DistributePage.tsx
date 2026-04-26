import { useState } from 'react';
import { PageHeader, Badge } from '../components/common';
import { PLATFORMS, type DraftStatus, type ContentDraft } from '@/services/mock';
import { draftsStore, useStore, recordActivity } from '@/services/store';
import { Send, Clock, Eye, X, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TABS: Array<{ key: 'all' | DraftStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'queued', label: '已排程' },
  { key: 'published', label: '已发布' },
  { key: 'failed', label: '失败' },
];

// Preview modal – shows how a draft looks on each target platform
function PreviewModal({ draft, onClose, onConfirmPublish }: { draft: ContentDraft; onClose: () => void; onConfirmPublish: () => void }) {
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
                onConfirmPublish();
                onClose();
              }}
              className="btn-primary"
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
  const [allDrafts] = useStore(draftsStore);
  const drafts = tab === 'all' ? allDrafts : allDrafts.filter((d) => d.status === tab);

  function publishDraft(d: ContentDraft) {
    draftsStore.update((cur) => cur.map((x) => x.id === d.id ? { ...x, status: 'published', scheduledAt: '已发布 · 刚刚' } : x));
    recordActivity({ type: 'publish', text: `《${d.title}》已加入发布队列`, icon: '•' });
    toast.success(`《${d.title}》已加入发布队列`);
  }

  function deleteDraft(id: string) {
    draftsStore.update((cur) => cur.filter((x) => x.id !== id));
    toast('已删除草稿');
  }

  return (
    <div className="page-shell" data-testid="page-distribute">
      {previewDraft && (
        <PreviewModal
          draft={previewDraft}
          onClose={() => setPreviewDraft(null)}
          onConfirmPublish={() => publishDraft(previewDraft)}
        />
      )}
      <div className="page-inner">
        <PageHeader
          title="分发中心"
          description="一稿多投：选择目标平台 → 自动适配 → 排程发布。"
          actions={
            <button
              onClick={() => {
                const queued = allDrafts.filter((d) => d.status === 'queued');
                if (queued.length === 0) { toast('没有已排程的草稿'); return; }
                queued.forEach((d) => {
                  draftsStore.update((cur) => cur.map((x) => x.id === d.id ? { ...x, status: 'published', scheduledAt: '已发布 · 刚刚' } : x));
                  recordActivity({ type: 'publish', text: `《${d.title}》已加入发布队列`, icon: '•' });
                });
                toast.success('已加入发布队列');
              }}
              className="btn-primary"
            >
              <Send className="h-3.5 w-3.5" /> 一键发布
            </button>
          }
        />

        {/* Filter tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-[12px] px-3 py-1.5 rounded-full font-medium transition-all border ${
                  tab === t.key ? 'text-white border-transparent shadow-sm' : 'bg-white text-[color:var(--muted-foreground)] hover:text-slate-700'
                }`}
                style={{
                  borderColor: tab === t.key ? 'transparent' : 'var(--panel-border)',
                  background: tab === t.key ? 'var(--primary)' : undefined,
                  boxShadow: tab === t.key ? '0 1px 4px rgba(79,70,229,0.25)' : undefined,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[color:var(--muted-foreground)] shrink-0">
            {drafts.length} 条内容
          </span>
        </div>

        {/* Draft cards */}
        <div className="space-y-3">
          {drafts.map((d) => {
            const typeEmoji = { 'short-video': '🎬', 'image-set': '🖼️', 'tweet': '✏️', 'article': '📝' }[d.type] ?? '📄';
            const statusCfg = {
              published: { color: 'green' as const, label: '已发布', dot: true },
              queued:    { color: 'indigo' as const, label: '已排程', dot: true },
              draft:     { color: 'gray' as const,   label: '草稿',   dot: false },
              failed:    { color: 'red' as const,    label: '失败',   dot: true },
            }[d.status] ?? { color: 'gray' as const, label: d.status, dot: false };

            return (
              <div
                key={d.id}
                data-testid={`draft-card-${d.id}`}
                className="panel p-4 flex items-start gap-4 transition-shadow hover:shadow-md"
                style={{ transition: 'box-shadow var(--t-base)' }}
              >
                {/* Type icon */}
                <div
                  className="h-14 w-14 rounded-xl shrink-0 flex items-center justify-center text-2xl"
                  style={{ background: 'var(--panel-muted)', border: '1px solid var(--panel-border)' }}
                >
                  {typeEmoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold truncate flex-1">{d.title}</span>
                    <Badge color={statusCfg.color} dot={statusCfg.dot}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <div className="text-[12px] text-[color:var(--muted-foreground)] line-clamp-1 mb-2">
                    {d.excerpt}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.platforms.map((pid) => {
                      const p = PLATFORMS.find((x) => x.id === pid);
                      if (!p) return null;
                      return (
                        <span
                          key={pid}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: `${p.color}18`, color: p.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                          {p.shortLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2.5 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-[color:var(--muted-foreground)]">
                    <Clock className="h-3 w-3" />
                    {d.scheduledAt}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPreviewDraft(d)}
                      className="btn-secondary"
                      data-testid={`preview-btn-${d.id}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      预览
                    </button>
                    <button
                      onClick={() => deleteDraft(d.id)}
                      className="btn-secondary"
                      title="删除"
                      data-testid={`delete-btn-${d.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



