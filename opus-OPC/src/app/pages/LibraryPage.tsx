import { useState } from 'react';
import { Image, FileText, Film, Music, Layers, Upload, MoreHorizontal, Download, Eye } from 'lucide-react';
import { PageHeader, Badge, SectionTitle } from '../components/common';
import { ASSETS } from '@/services/mock';

const TYPE_CONFIG: Record<string, { icon: any; bg: string; color: string }> = {
  image:    { icon: Image,    bg: '#eef2ff', color: '#6366f1' },
  doc:      { icon: FileText, bg: '#f0fdf4', color: '#16a34a' },
  video:    { icon: Film,     bg: '#fef2f2', color: '#dc2626' },
  audio:    { icon: Music,    bg: '#fffbeb', color: '#d97706' },
  template: { icon: Layers,   bg: '#fdf4ff', color: '#9333ea' },
};

const FILTER_TABS = ['全部', '图片', '视频', '音频', '文档', '模板'];
const FILTER_MAP: Record<string, string> = {
  '图片': 'image', '视频': 'video', '音频': 'audio', '文档': 'doc', '模板': 'template',
};

const KIND_LABEL: Record<string, string> = {
  image: '图片', doc: '文档', video: '视频', audio: '音频', template: '模板',
};

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState('全部');
  const filtered = activeTab === '全部'
    ? ASSETS
    : ASSETS.filter((a) => a.kind === FILTER_MAP[activeTab]);

  return (
    <div className="page-shell" data-testid="page-library">
      <div className="page-inner">
        <PageHeader
          title="素材库"
          description="所有图片、视频、音频、模板统一管理。"
          actions={
            <button className="btn-primary">
              <Upload className="h-3.5 w-3.5" />
              上传素材
            </button>
          }
        />

        {/* Filter tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`text-[12px] px-3 py-1.5 rounded-full font-medium transition-all border ${
                  activeTab === t
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-[color:var(--muted-foreground)] hover:text-slate-700'
                }`}
                style={{
                  borderColor: activeTab === t ? 'transparent' : 'var(--panel-border)',
                  background: activeTab === t ? 'var(--primary)' : undefined,
                  boxShadow: activeTab === t ? '0 1px 4px rgba(79,70,229,0.25)' : undefined,
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[color:var(--muted-foreground)] shrink-0">
            {filtered.length} 个文件
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((a) => {
            const cfg = TYPE_CONFIG[a.kind] ?? TYPE_CONFIG.doc;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className="panel p-3 group cursor-pointer flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                {/* Thumbnail / icon area */}
                <div
                  className="aspect-square flex flex-col items-center justify-center relative rounded-lg overflow-hidden -mx-3 -mt-3 mb-0"
                  style={{ background: cfg.bg }}
                >
                  <Icon className="h-12 w-12" style={{ color: cfg.color, opacity: 0.7 }} />
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button className="h-8 w-8 rounded-lg bg-white shadow flex items-center justify-center hover:bg-slate-50">
                      <Eye className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <button className="h-8 w-8 rounded-lg bg-white shadow flex items-center justify-center hover:bg-slate-50">
                      <Download className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                  </div>
                  {/* Kind badge top-right */}
                  <div className="absolute top-2 right-2">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                      style={{ background: cfg.color, color: '#fff', opacity: 0.9 }}
                    >
                      {a.kind}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="pt-3">
                  <div className="text-[12px] font-medium truncate mb-1" title={a.name}>
                    {a.name}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[color:var(--muted-foreground)]">{a.size}</span>
                    <span className="text-[11px] text-[color:var(--muted-foreground)]">{a.updated}</span>
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

