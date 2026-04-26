import { useState } from 'react';
import { Copy, Loader2, Zap, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PLATFORM_REPURPOSE_CONFIG } from '@/services/mock';

// --- Mock AI generation per platform ---
function generatePlatformContent(id: string, title: string, body: string): string {
  const clean = body.replace(/^#+\s*/gm, '').replace(/\n\n+/g, '\n\n').trim();
  const s200 = clean.slice(0, 200).trim();
  const s400 = clean.slice(0, 400).trim();
  const s600 = clean.slice(0, 600).trim();

  const generators: Record<string, () => string> = {
    wechat: () =>
      `**${title}**\n\n${s600}\n\n---\n\n如果这篇内容对你有启发，点击右下角「在看」让更多人看到它。\n\n关注我，每周持续更新一人公司实战笔记 📖`,

    xiaohongshu: () =>
      `✨ ${title}！\n\n${s200}\n\n💡 这是我亲测有效的方法～分享给每一个想要起步的你！\n\n收藏=学习，点赞=认可 💪\n\n#一人公司 #副业创业 #自由职业 #创业干货 #独立开发者`,

    douyin: () =>
      `【钩子】"${title.slice(0, 12)}"你必须知道这几点！\n\n【脚本】\n${s200}\n\n【结尾 CTA】觉得有用就点个赞 👍，关注我每天分享一人公司干货！`,

    bilibili: () =>
      `【标题】${title} | 实操分享 ${new Date().getFullYear()}\n\n【简介】\n${s400}\n\n⏱ 视频时间轴\n00:00 开篇导入\n01:30 核心方法论\n05:00 实战案例\n08:00 总结&行动清单\n\n一键三连，这是对我最大的支持！`,

    youtube: () =>
      `📌 Title: ${title} | Solo Business Blueprint\n\n📝 Description:\n${s400}\n\nIn this video, I walk you through the exact steps to build a one-person company from scratch.\n\n⏱ Timestamps:\n0:00 - Intro\n1:30 - The Core Framework\n4:00 - Real-World Examples\n7:00 - Key Takeaways\n10:00 - Action Plan\n\n🏷️ Tags: solo business, solopreneur, entrepreneur, productivity, startup, indie hacker, content creator`,

    x: () =>
      `${title}\n\n${s200.slice(0, 200)}…\n\n🧵 完整 Thread：\n\n1/ 先说结论：${title.slice(0, 25)}…\n2/ 第一步是找到你的精准问题\n3/ 关键在于最小可行验证\n4/ 用数据决定方向，别凭感觉\n\n保存这条推文 → 以后一定用得上 👇\n\n#创业 #solopreneur #一人公司`,

    linkedin: () =>
      `🚀 ${title}\n\nAfter testing this for 30 days straight, here's what I discovered:\n\n${s400}\n\nKey takeaways:\n→ Focus on one core problem at a time\n→ Validate before spending resources\n→ Ship fast, iterate even faster\n→ Let data kill your bad ideas early\n\nWhat's your experience with this approach? Drop your thoughts below 👇\n\n#solopreneur #startup #entrepreneurship #productivityhacks #growthmindset`,
  };

  return (generators[id] ?? (() => s400))();
}

// --- Component ---
export function RepurposeStudio() {
  const [title, setTitle] = useState('一人公司启动指南：从 0 到 1 的 7 个动作');
  const [body, setBody] = useState(
    '## 引子\n\n过去 30 天我亲测了 7 个动作，把启动周期从 90 天压缩到 21 天。\n\n## 七个动作\n\n1. 找到一个能向 100 个人讲清楚的小问题\n2. 用 48 小时做出最小验证原型\n3. 在三个平台同步发布测试内容\n4. 用数据决定哪个渠道值得加码\n5. 将第一个付费用户的故事写成案例\n6. 建立一套可复用的内容生产流水线\n7. 每月一次复盘，淘汰无效动作'
  );
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(PLATFORM_REPURPOSE_CONFIG.map((p) => [p.id, true]))
  );
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateAll() {
    if (!title.trim() || !body.trim()) {
      toast.error('请先填写标题和内容');
      return;
    }
    const toGenerate = PLATFORM_REPURPOSE_CONFIG.filter((p) => enabled[p.id]);
    setIsGenerating(true);
    setLoading(Object.fromEntries(toGenerate.map((p) => [p.id, true])));

    for (const platform of toGenerate) {
      await new Promise<void>((r) => setTimeout(r, 120 + Math.random() * 380));
      const content = generatePlatformContent(platform.id, title, body);
      setOutputs((prev) => ({ ...prev, [platform.id]: content }));
      setLoading((prev) => ({ ...prev, [platform.id]: false }));
    }

    setIsGenerating(false);
    toast.success(`✅ 全平台内容已生成`, {
      description: `${toGenerate.length} 个版本就绪，点击各卡片复制直接使用`,
    });
  }

  function regenerateSingle(id: string) {
    setLoading((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const content = generatePlatformContent(id, title, body);
      setOutputs((prev) => ({ ...prev, [id]: content }));
      setLoading((prev) => ({ ...prev, [id]: false }));
    }, 700);
  }

  function copyContent(id: string) {
    const content = outputs[id];
    if (!content) return;
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('已复制到剪贴板');
  }

  function togglePlatform(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const enabledCount = PLATFORM_REPURPOSE_CONFIG.filter((p) => enabled[p.id]).length;
  const generatedCount = Object.keys(outputs).filter((id) => !loading[id] && outputs[id]).length;

  return (
    <div className="grid grid-cols-12 gap-4" data-testid="repurpose-studio">
      {/* Left: Source Editor */}
      <div className="col-span-12 lg:col-span-4 panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">原始素材</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium text-indigo-600 bg-indigo-50">
            SOURCE
          </span>
        </div>

        <div>
          <label className="text-xs text-[color:var(--muted-foreground)]">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white"
            style={{ borderColor: 'var(--panel-border)' }}
            placeholder="输入内容标题..."
            data-testid="repurpose-title"
          />
        </div>

        <div className="flex-1">
          <label className="text-xs text-[color:var(--muted-foreground)]">正文内容</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white font-mono resize-none"
            style={{ borderColor: 'var(--panel-border)', minHeight: 240 }}
            placeholder="粘贴你的原始内容..."
            data-testid="repurpose-source"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[color:var(--muted-foreground)]">目标平台</label>
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              已选 {enabledCount}/{PLATFORM_REPURPOSE_CONFIG.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_REPURPOSE_CONFIG.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`text-xs px-2.5 py-1 rounded-md border transition ${
                  enabled[p.id]
                    ? 'text-white'
                    : 'text-[color:var(--muted-foreground)] hover:bg-slate-50 line-through opacity-60'
                }`}
                style={{
                  borderColor: enabled[p.id] ? 'transparent' : 'var(--panel-border)',
                  background: enabled[p.id] ? p.color : 'transparent',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generateAll}
          disabled={isGenerating || enabledCount === 0}
          className="w-full py-2.5 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2 disabled:opacity-60 transition active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
          data-testid="repurpose-generate"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              AI 改写中...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              一键生成全平台
            </>
          )}
        </button>

        {generatedCount > 0 && !isGenerating && (
          <p className="text-[10px] text-center text-[color:var(--muted-foreground)]">
            已生成 {generatedCount} 个版本 · 点击各卡片右下角复制
          </p>
        )}
      </div>

      {/* Right: Platform Output Cards */}
      <div className="col-span-12 lg:col-span-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="repurpose-cards">
          {PLATFORM_REPURPOSE_CONFIG.map((p) => {
            const content = outputs[p.id] ?? '';
            const isLoading = loading[p.id] ?? false;
            const isEnabled = enabled[p.id];
            const overLimit = content.length > p.limit;

            return (
              <div
                key={p.id}
                className={`panel flex flex-col transition-opacity ${!isEnabled ? 'opacity-40' : ''}`}
                data-testid={`repurpose-card-${p.id}`}
              >
                {/* Header */}
                <div
                  className="px-3 py-2 flex items-center justify-between rounded-t-xl"
                  style={{ background: `${p.color}15` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-xs font-semibold" style={{ color: p.color }}>
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[color:var(--muted-foreground)] truncate max-w-[120px]">
                    {p.hint}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 relative">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: p.color }} />
                      <span className="text-xs text-[color:var(--muted-foreground)]">AI 改写中...</span>
                    </div>
                  ) : (
                    <textarea
                      value={content}
                      onChange={(e) =>
                        setOutputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      className="w-full p-3 text-xs font-mono leading-relaxed bg-transparent outline-none resize-none"
                      style={{ minHeight: 130 }}
                      placeholder={`${p.name} 版本将在此生成...`}
                    />
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-3 py-2 border-t flex items-center justify-between"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      overLimit ? 'text-rose-500 font-semibold' : 'text-[color:var(--muted-foreground)]'
                    }`}
                  >
                    {content.length.toLocaleString()} / {p.limit.toLocaleString()}
                    {overLimit && ' ⚠ 超限'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => regenerateSingle(p.id)}
                      disabled={!title || isLoading || !isEnabled}
                      className="p-1 rounded hover:bg-slate-100 transition disabled:opacity-40"
                      title="重新生成"
                    >
                      <RefreshCw className="h-3 w-3 text-[color:var(--muted-foreground)]" />
                    </button>
                    <button
                      onClick={() => copyContent(p.id)}
                      disabled={!content || isLoading}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md text-white disabled:opacity-40 transition"
                      style={{ background: copied === p.id ? '#10b981' : p.color }}
                    >
                      {copied === p.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied === p.id ? '已复制' : '复制'}
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
