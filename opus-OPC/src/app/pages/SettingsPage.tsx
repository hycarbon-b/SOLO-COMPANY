import { PageHeader, Badge } from '../components/common';
import { PLATFORMS } from '@/services/mock';

export function SettingsPage() {
  return (
    <div className="page-shell" data-testid="page-settings">
      <div className="page-inner">
        <PageHeader title="设置" description="平台账号 · API Key · 品牌资料。" />

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-3">已绑定平台</h3>
          <div className="space-y-2">
            {PLATFORMS.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: p.color }}
                >
                  {p.shortLabel.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)]">
                    {i < 4 ? '已授权 · 有效期至 2026-12-31' : '未授权'}
                  </div>
                </div>
                <Badge color={i < 4 ? 'green' : 'gray'}>{i < 4 ? 'connected' : 'disconnected'}</Badge>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  {i < 4 ? '重新授权' : '立即授权'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">AI Provider</h3>
            <div className="space-y-3 text-sm">
              {[
                ['OpenAI', 'sk-xxxx...abcd', true],
                ['Anthropic', '未配置', false],
                ['DeepSeek', 'sk-xxxx...wxyz', true],
              ].map(([n, k, ok]) => (
                <div
                  key={n as string}
                  className="flex items-center justify-between py-1.5 border-b last:border-0"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <div>
                    <div className="font-medium">{n}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)] font-mono">
                      {k}
                    </div>
                  </div>
                  <Badge color={ok ? 'green' : 'gray'}>{ok ? '已配置' : '未配置'}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">品牌资料</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-[color:var(--muted-foreground)]">品牌名</label>
                <input
                  defaultValue="Solo · 一人公司"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
                  style={{ borderColor: 'var(--panel-border)' }}
                />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted-foreground)]">Slogan</label>
                <input
                  defaultValue="一个人，也能撬动一个市场。"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
                  style={{ borderColor: 'var(--panel-border)' }}
                />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted-foreground)]">语气</label>
                <select
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <option>真诚 · 专业</option>
                  <option>活泼 · 年轻</option>
                  <option>权威 · 严谨</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
