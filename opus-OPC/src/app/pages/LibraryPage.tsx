import { Image, FileText, Film, Music, Layers, Upload } from 'lucide-react';
import { PageHeader, Badge } from '../components/common';
import { ASSETS } from '@/services/mock';

const ICONS = {
  image: Image,
  doc: FileText,
  video: Film,
  audio: Music,
  template: Layers,
} as const;

export function LibraryPage() {
  return (
    <div className="page-shell" data-testid="page-library">
      <div className="page-inner">
        <PageHeader
          title="素材库 Library"
          description="所有图片、视频、音频、模板统一管理。"
          actions={
            <button
              className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
              style={{ background: 'var(--primary)' }}
            >
              <Upload className="h-3.5 w-3.5" /> 上传素材
            </button>
          }
        />

        <div className="flex gap-2 flex-wrap">
          {['全部', '图片', '视频', '音频', '文档', '模板'].map((t, i) => (
            <button
              key={t}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                i === 0 ? 'text-white' : 'bg-white'
              }`}
              style={{
                borderColor: 'var(--panel-border)',
                background: i === 0 ? 'var(--primary)' : undefined,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ASSETS.map((a) => {
            const Icon = ICONS[a.kind as keyof typeof ICONS] ?? FileText;
            return (
              <div key={a.id} className="panel p-3 flex flex-col gap-2">
                <div
                  className="aspect-square rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--panel-muted)' }}
                >
                  <Icon className="h-10 w-10 text-slate-400" />
                </div>
                <div className="text-xs font-medium truncate" title={a.name}>
                  {a.name}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[color:var(--muted-foreground)]">
                  <span>{a.size}</span>
                  <Badge color="gray">{a.kind}</Badge>
                </div>
                <div className="text-[10px] text-[color:var(--muted-foreground)]">
                  {a.updated}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
