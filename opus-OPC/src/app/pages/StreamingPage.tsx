import { useState } from 'react';
import { Radio, Eye, Wifi, Copy } from 'lucide-react';
import { PageHeader, Badge, StatCard } from '../components/common';
import { STREAM_TARGETS, PLATFORMS } from '@/services/mock';
import { toast } from 'sonner';

export function StreamingPage() {
  const [live, setLive] = useState(true);
  const totalViewers = STREAM_TARGETS.reduce((acc, t) => acc + t.viewers, 0);

  return (
    <div className="page-shell" data-testid="page-streaming">
      <div className="page-inner">
        <PageHeader
          title="直播推流 Streaming"
          description="一次开播，多平台同步：管理 RTMP 目标、码率、弹幕。"
          actions={
            <button
              onClick={() => {
                setLive(!live);
                toast(live ? '已下播' : '已开播');
              }}
              className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
              style={{ background: live ? 'var(--destructive)' : 'var(--success)' }}
            >
              <Radio className="h-3.5 w-3.5" />
              {live ? '结束直播' : '开始直播'}
            </button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="状态"
            value={live ? 'LIVE' : '离线'}
            delta={live ? '推流中' : '—'}
            accent={live ? 'var(--destructive)' : 'var(--muted-foreground)'}
          />
          <StatCard label="总观看" value={totalViewers.toLocaleString()} delta="+128 / 分钟" />
          <StatCard label="码率" value="6.2 Mbps" delta="稳定" />
          <StatCard label="延迟" value="2.1s" delta="健康" />
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">推流目标</h3>
            <button className="text-xs text-[color:var(--primary)]">+ 添加平台</button>
          </div>
          <div className="space-y-3">
            {STREAM_TARGETS.map((t) => {
              const p = PLATFORMS.find((x) => x.id === t.platform);
              return (
                <div
                  key={t.id}
                  className="rounded-lg p-3 border flex items-center gap-4"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  <div
                    className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: p?.color ?? '#888' }}
                  >
                    {p?.shortLabel.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{t.name}</span>
                      <Badge color={t.status === 'connected' ? 'green' : 'gray'}>
                        {t.status === 'connected' ? (
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            connected
                          </span>
                        ) : (
                          'idle'
                        )}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-[color:var(--muted-foreground)] flex items-center gap-2">
                      <code className="truncate">{t.rtmp}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(t.rtmp + t.key);
                          toast.success('RTMP 地址已复制');
                        }}
                        className="hover:text-[color:var(--primary)]"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold flex items-center gap-1 justify-end">
                      <Eye className="h-3.5 w-3.5" />
                      {t.viewers}
                    </div>
                    <div className="text-[10px] text-[color:var(--muted-foreground)]">观看中</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">弹幕聚合</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[
                { plat: '抖音', user: '小琪', msg: '主播好可爱呀～' },
                { plat: 'B站', user: 'tech_fan', msg: '这个工具栈值得关注' },
                { plat: '抖音', user: '匿名 1024', msg: '链接呢链接呢' },
                { plat: 'YouTube', user: 'JohnDoe', msg: 'Greetings from US 🇺🇸' },
                { plat: '小红书', user: '阿茄', msg: '已下单！' },
                { plat: '抖音', user: 'lucky_8', msg: '老粉来了' },
              ].map((c, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <Badge color="indigo">{c.plat}</Badge>
                  <span className="font-medium">{c.user}</span>
                  <span className="text-[color:var(--muted-foreground)]">: {c.msg}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-3">推流参数</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['分辨率', '1920×1080'],
                ['帧率', '30 fps'],
                ['编码器', 'H.264'],
                ['码率模式', 'CBR'],
                ['关键帧间隔', '2s'],
                ['音频采样', '48 kHz'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[color:var(--muted-foreground)]">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
