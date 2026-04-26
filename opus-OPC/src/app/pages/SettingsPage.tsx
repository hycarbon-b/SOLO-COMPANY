import { useState } from 'react';
import { Check, Loader2, KeyRound, Building2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Badge } from '../components/common';
import { PLATFORMS } from '@/services/mock';
import { configStore, useAppConfig, type LLMProvider } from '@/services/config';
import { pingLLM } from '@/services/llm';

const PROVIDER_PRESETS: Array<{
  id: LLMProvider;
  label: string;
  baseUrl: string;
  defaultModel: string;
  keyHint: string;
}> = [
  { id: 'openai',    label: 'OpenAI',    baseUrl: 'https://api.openai.com/v1',         defaultModel: 'gpt-4o-mini',          keyHint: 'sk-...' },
  { id: 'deepseek',  label: 'DeepSeek',  baseUrl: 'https://api.deepseek.com/v1',       defaultModel: 'deepseek-chat',        keyHint: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1',      defaultModel: 'claude-3-5-sonnet',    keyHint: 'sk-ant-...' },
  { id: 'custom',    label: '自定义',     baseUrl: '',                                  defaultModel: '',                     keyHint: '——' },
];

const TONE_OPTIONS = ['真诚 · 专业', '活泼 · 年轻', '权威 · 严谨', '幽默 · 轻松'];

export function SettingsPage() {
  const cfg = useAppConfig();
  const [revealKey, setRevealKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  function chooseProvider(id: LLMProvider) {
    const preset = PROVIDER_PRESETS.find((p) => p.id === id)!;
    configStore.patchLLM({
      provider: id,
      baseUrl: id === 'custom' ? cfg.llm.baseUrl : preset.baseUrl,
      model:   id === 'custom' ? cfg.llm.model   : preset.defaultModel,
    });
    setTestResult(null);
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    const ok = await pingLLM();
    setTesting(false);
    setTestResult(ok ? 'ok' : 'fail');
    if (ok) toast.success('API 连接成功');
    else toast.error('API 连接失败：请检查 Base URL / Key / 模型');
  }

  function maskedKey(k: string) {
    if (!k) return '';
    if (k.length <= 8) return '•'.repeat(k.length);
    return k.slice(0, 4) + '•'.repeat(Math.max(4, k.length - 8)) + k.slice(-4);
  }

  return (
    <div className="page-shell" data-testid="page-settings">
      <div className="page-inner">
        <PageHeader
          title="设置"
          description="平台账号 · API Key · 品牌资料。配置后立即生效，所有数据保存在本机。"
        />

        {/* ─── LLM API ──────────────────────────────────────── */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4" />
              <h3 className="text-[13px] font-semibold tracking-wide uppercase" style={{ letterSpacing: '0.06em' }}>
                AI Provider
              </h3>
            </div>
            <span className="label-caps">兼容协议</span>
          </div>

          {/* Provider tabs */}
          <div className="flex flex-wrap gap-0 mb-5 -mx-px" style={{ borderTop: '1px solid var(--panel-border-soft)', borderBottom: '1px solid var(--panel-border-soft)' }}>
            {PROVIDER_PRESETS.map((p) => {
              const active = cfg.llm.provider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => chooseProvider(p.id)}
                  className="px-4 py-2 text-[12px] font-medium transition border-l first:border-l-0"
                  style={{
                    borderColor: 'var(--panel-border-soft)',
                    background: active ? 'var(--foreground)' : 'transparent',
                    color: active ? 'var(--background)' : 'var(--foreground)',
                  }}
                  data-testid={`llm-provider-${p.id}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="label-caps">Base URL</label>
              <input
                value={cfg.llm.baseUrl}
                onChange={(e) => configStore.patchLLM({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="input-field mt-2 num"
                data-testid="llm-base-url"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label-caps">API Key</label>
              <div className="flex gap-0 mt-2">
                <input
                  type={revealKey ? 'text' : 'password'}
                  value={cfg.llm.apiKey}
                  onChange={(e) => configStore.patchLLM({ apiKey: e.target.value })}
                  placeholder={PROVIDER_PRESETS.find((p) => p.id === cfg.llm.provider)?.keyHint ?? 'sk-...'}
                  className="input-field flex-1 num"
                  style={{ borderRight: 'none' }}
                  data-testid="llm-api-key"
                />
                <button
                  type="button"
                  onClick={() => setRevealKey((v) => !v)}
                  className="btn-secondary"
                  style={{ borderLeft: 'none' }}
                >
                  {revealKey ? '隐藏' : '显示'}
                </button>
                <button
                  type="button"
                  onClick={() => { configStore.patchLLM({ apiKey: '' }); toast('已清除 API Key'); }}
                  className="btn-secondary"
                  style={{ borderLeft: 'none' }}
                  title="清除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {cfg.llm.apiKey && !revealKey && (
                <div className="mt-1.5 text-[11px] num text-[color:var(--muted-foreground)]">
                  当前：{maskedKey(cfg.llm.apiKey)}
                </div>
              )}
            </div>

            <div>
              <label className="label-caps">模型</label>
              <input
                value={cfg.llm.model}
                onChange={(e) => configStore.patchLLM({ model: e.target.value })}
                placeholder="gpt-4o-mini"
                className="input-field mt-2 num"
                data-testid="llm-model"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={runTest}
                disabled={!cfg.llm.apiKey || !cfg.llm.baseUrl || testing}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="llm-test-btn"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    测试中
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    测试连通性
                  </>
                )}
              </button>
              {testResult === 'ok' && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--success)' }}>
                  <Check className="h-3.5 w-3.5" /> 连接正常
                </span>
              )}
              {testResult === 'fail' && (
                <span className="text-[12px] font-medium" style={{ color: 'var(--destructive)' }}>
                  连接失败
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── 已绑定平台 ───────────────────────────────────── */}
        <div className="panel p-6">
          <h3 className="text-[13px] font-semibold tracking-wide uppercase mb-4" style={{ letterSpacing: '0.06em' }}>
            已绑定平台
          </h3>
          <div>
            {PLATFORMS.map((p, i) => {
              const auth = cfg.platforms[p.id] ?? { connected: false };
              const isLast = i === PLATFORMS.length - 1;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 py-3.5"
                  style={{ borderBottom: isLast ? 'none' : '1px solid var(--panel-border-soft)' }}
                >
                  <div
                    className="h-9 w-9 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: p.color }}
                  >
                    {p.shortLabel.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{p.name}</div>
                    <div className="text-[11px] text-[color:var(--muted-foreground)] num mt-0.5">
                      {auth.connected
                        ? `已授权 · 有效期至 ${auth.expiresAt ?? '——'}`
                        : '未授权'}
                    </div>
                  </div>
                  <Badge color={auth.connected ? 'green' : 'gray'} dot>
                    {auth.connected ? 'connected' : 'disconnected'}
                  </Badge>
                  <button
                    onClick={() => {
                      configStore.setPlatform(p.id, {
                        connected: !auth.connected,
                        expiresAt: !auth.connected ? '2026-12-31' : undefined,
                      });
                      toast.success(auth.connected ? `${p.name} 已重新授权` : `${p.name} 已连接（演示）`);
                    }}
                    className="btn-secondary"
                  >
                    {auth.connected ? '重新授权' : '立即授权'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-[color:var(--muted-foreground)] leading-relaxed">
            说明：平台 OAuth 鉴权需各平台开放平台账号；当前界面演示连接状态，实际发布将通过对应 SDK / API 桥接。
          </div>
        </div>

        {/* ─── 品牌资料 ────────────────────────────────────── */}
        <div className="panel p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Building2 className="h-4 w-4" />
            <h3 className="text-[13px] font-semibold tracking-wide uppercase" style={{ letterSpacing: '0.06em' }}>
              品牌资料
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label-caps">品牌名</label>
              <input
                value={cfg.brand.name}
                onChange={(e) => configStore.patchBrand({ name: e.target.value })}
                className="input-field mt-2"
                data-testid="brand-name"
              />
            </div>
            <div>
              <label className="label-caps">语气</label>
              <select
                value={cfg.brand.tone}
                onChange={(e) => configStore.patchBrand({ tone: e.target.value })}
                className="input-field mt-2"
                data-testid="brand-tone"
              >
                {TONE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label-caps">Slogan</label>
              <input
                value={cfg.brand.slogan}
                onChange={(e) => configStore.patchBrand({ slogan: e.target.value })}
                className="input-field mt-2"
                data-testid="brand-slogan"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => toast.success('设置已保存')}
              className="btn-primary"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
