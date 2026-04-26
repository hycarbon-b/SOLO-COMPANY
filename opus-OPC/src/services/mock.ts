// Centralized mock data for the OPUS-OPC workstation.

export const PLATFORMS = [
  { id: 'wechat', name: '微信公众号', color: '#07C160', shortLabel: '公众号' },
  { id: 'xiaohongshu', name: '小红书', color: '#FE2C55', shortLabel: '小红书' },
  { id: 'douyin', name: '抖音', color: '#000000', shortLabel: '抖音' },
  { id: 'bilibili', name: 'B站', color: '#00A1D6', shortLabel: 'B站' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', shortLabel: 'YouTube' },
  { id: 'x', name: 'X (Twitter)', color: '#0F1419', shortLabel: 'X' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', shortLabel: 'LinkedIn' },
];

export const KPI = [
  { label: '今日发布', value: 12, delta: '+3', trend: 'up' as const },
  { label: '本周触达', value: '38.6k', delta: '+12.4%', trend: 'up' as const },
  { label: '直播在播', value: 1, delta: 'LIVE', trend: 'flat' as const },
  { label: 'Agent 任务', value: 7, delta: '2 运行中', trend: 'flat' as const },
];

export const FOLLOWER_TREND = [
  { date: '04/19', wechat: 1240, xiaohongshu: 980, douyin: 2100, bilibili: 760 },
  { date: '04/20', wechat: 1265, xiaohongshu: 1020, douyin: 2180, bilibili: 790 },
  { date: '04/21', wechat: 1290, xiaohongshu: 1090, douyin: 2260, bilibili: 815 },
  { date: '04/22', wechat: 1325, xiaohongshu: 1140, douyin: 2310, bilibili: 850 },
  { date: '04/23', wechat: 1360, xiaohongshu: 1210, douyin: 2400, bilibili: 880 },
  { date: '04/24', wechat: 1395, xiaohongshu: 1280, douyin: 2480, bilibili: 905 },
  { date: '04/25', wechat: 1432, xiaohongshu: 1356, douyin: 2570, bilibili: 942 },
];

export type DraftStatus = 'draft' | 'queued' | 'published' | 'failed';

export interface ContentDraft {
  id: string;
  title: string;
  excerpt: string;
  type: 'article' | 'short-video' | 'image-set' | 'tweet';
  platforms: string[];
  scheduledAt: string;
  status: DraftStatus;
  cover?: string;
}

export const DRAFTS: ContentDraft[] = [
  {
    id: 'd-001',
    title: '一人公司启动指南：从 0 到 1 的 7 个动作',
    excerpt: '过去 30 天我亲测了 7 个动作，把启动周期从 90 天压缩到 21 天……',
    type: 'article',
    platforms: ['wechat', 'xiaohongshu', 'linkedin'],
    scheduledAt: '今天 18:00',
    status: 'queued',
  },
  {
    id: 'd-002',
    title: 'AI 工具栈拆解 · 2026',
    excerpt: '作为 Solo founder，我把每月 28 美元的 AI 订阅打包成一张表……',
    type: 'short-video',
    platforms: ['douyin', 'bilibili', 'youtube'],
    scheduledAt: '明天 09:30',
    status: 'draft',
  },
  {
    id: 'd-003',
    title: '副业转主业的三组现金流',
    excerpt: '分享一下我从月入 0 到月入 5 万的现金流结构……',
    type: 'article',
    platforms: ['wechat', 'x'],
    scheduledAt: '04/26 21:00',
    status: 'published',
  },
  {
    id: 'd-004',
    title: '直播切片 #14 · 选品 SOP',
    excerpt: '根据昨晚直播 2 小时切了 6 段，配字幕已生成……',
    type: 'image-set',
    platforms: ['xiaohongshu', 'douyin'],
    scheduledAt: '04/27 12:00',
    status: 'queued',
  },
  {
    id: 'd-005',
    title: '今日实验：用 GPT 写带货文案',
    excerpt: '一条文案改 7 次，转化从 1.8% 提升到 3.6%……',
    type: 'tweet',
    platforms: ['x', 'linkedin'],
    scheduledAt: '已发布 · 04/24',
    status: 'failed',
  },
];

export const ASSETS = [
  { id: 'a1', name: '品牌主视觉_v3.png', kind: 'image', size: '2.4MB', updated: '2 小时前' },
  { id: 'a2', name: '直播开场白脚本.md', kind: 'doc', size: '12KB', updated: '昨天' },
  { id: 'a3', name: '产品介绍_60s.mp4', kind: 'video', size: '48MB', updated: '3 天前' },
  { id: 'a4', name: 'BGM_lofi_loop.wav', kind: 'audio', size: '8.2MB', updated: '1 周前' },
  { id: 'a5', name: '小红书封面_模板A.fig', kind: 'template', size: '—', updated: '今天' },
  { id: 'a6', name: '客户证言_合集.pdf', kind: 'doc', size: '3.1MB', updated: '4 天前' },
  { id: 'a7', name: '产品演示_横版.mov', kind: 'video', size: '120MB', updated: '5 天前' },
  { id: 'a8', name: 'Logo_白底.svg', kind: 'image', size: '24KB', updated: '一个月前' },
];

export const STREAM_TARGETS = [
  { id: 's1', platform: 'douyin', name: '抖音直播', rtmp: 'rtmp://push.douyin.com/live/', key: 'dy_xxxx_yyyy', status: 'connected', viewers: 1284 },
  { id: 's2', platform: 'bilibili', name: 'B站直播', rtmp: 'rtmp://push.bilivideo.com/live-bvc/', key: 'bili_zzzz', status: 'connected', viewers: 412 },
  { id: 's3', platform: 'youtube', name: 'YouTube Live', rtmp: 'rtmp://a.rtmp.youtube.com/live2', key: 'yt_aaaa-bbbb-cccc', status: 'idle', viewers: 0 },
  { id: 's4', platform: 'xiaohongshu', name: '小红书直播', rtmp: 'rtmp://live-push.xhscdn.com/live/', key: 'xhs_abcd', status: 'idle', viewers: 0 },
];

export const AGENTS = [
  { id: 'ag1', name: '选题侦察兵', role: '每日扫描热点 + 竞品并产出选题', status: 'running', lastRun: '5 分钟前' },
  { id: 'ag2', name: '文案改写师', role: '将一篇长文改写成 6 个平台版本', status: 'running', lastRun: '12 分钟前' },
  { id: 'ag3', name: '配图设计师', role: '基于文章自动生成 1:1 / 16:9 / 9:16 封面', status: 'idle', lastRun: '2 小时前' },
  { id: 'ag4', name: '直播切片师', role: '从直播录像中切出短视频', status: 'idle', lastRun: '昨天' },
  { id: 'ag5', name: '评论回复官', role: '每日合并多平台评论并草拟回复', status: 'error', lastRun: '今晨 · 失败' },
];

export const SCHEDULE_ITEMS = [
  { date: '2026-04-26', items: [{ time: '09:00', title: '早报推送', platform: 'wechat' }, { time: '18:00', title: '一人公司启动指南', platform: 'xiaohongshu' }] },
  { date: '2026-04-27', items: [{ time: '12:00', title: '直播切片 #14', platform: 'douyin' }] },
  { date: '2026-04-28', items: [{ time: '20:00', title: 'AI 工具栈拆解', platform: 'bilibili' }, { time: '20:00', title: '直播开播', platform: 'douyin' }] },
  { date: '2026-04-29', items: [{ time: '09:30', title: '周报', platform: 'linkedin' }] },
];

export const ENGAGEMENT_BAR = [
  { name: '微信', impressions: 12400, engagement: 820 },
  { name: '小红书', impressions: 18600, engagement: 2310 },
  { name: '抖音', impressions: 42300, engagement: 5102 },
  { name: 'B站', impressions: 9800, engagement: 1240 },
  { name: 'YouTube', impressions: 7200, engagement: 540 },
  { name: 'X', impressions: 3100, engagement: 280 },
];

// Multi-platform repurpose config (char limits + style hints)
export const PLATFORM_REPURPOSE_CONFIG = [
  { id: 'wechat', name: '微信公众号', color: '#07C160', limit: 20000, hint: '正式·深度阅读' },
  { id: 'xiaohongshu', name: '小红书', color: '#FE2C55', limit: 1000, hint: '亲切·表情·话题标签' },
  { id: 'douyin', name: '抖音脚本', color: '#161823', limit: 300, hint: 'Hook≤15字·口语化' },
  { id: 'bilibili', name: 'B站', color: '#00A1D6', limit: 500, hint: '标题+简介+tag' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', limit: 5000, hint: '英文·关键词·章节' },
  { id: 'x', name: 'X / Twitter', color: '#0F1419', limit: 280, hint: '≤280字或Thread' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', limit: 1300, hint: '职场腔·商业洞察' },
];

// Activity feed for dashboard
export const ACTIVITY_FEED = [
  { id: 'af1', type: 'publish', text: '《一人公司启动指南》已发布到微信公众号', time: '2 分钟前', icon: '📱' },
  { id: 'af2', type: 'agent', text: '选题侦察兵完成今日扫描，产出 8 条选题', time: '5 分钟前', icon: '🤖' },
  { id: 'af3', type: 'publish', text: '抖音切片 #14 排程成功（04/27 12:00）', time: '18 分钟前', icon: '🎬' },
  { id: 'af4', type: 'comment', text: '小红书新增 23 条评论待回复', time: '32 分钟前', icon: '💬' },
  { id: 'af5', type: 'agent', text: '文案改写师完成 B站版本改写', time: '1 小时前', icon: '✍️' },
  { id: 'af6', type: 'publish', text: '《AI工具栈》LinkedIn 版本已发布', time: '2 小时前', icon: '💼' },
];

// Agent run logs (keyed by agent id)
export const AGENT_LOGS: Record<string, { time: string; event: string; status: 'ok' | 'warn' | 'error' }[]> = {
  ag1: [
    { time: '09:02', event: '启动选题扫描任务', status: 'ok' },
    { time: '09:05', event: '抓取微博热搜 TOP50', status: 'ok' },
    { time: '09:08', event: '分析竞品账号更新 (12 个账号)', status: 'ok' },
    { time: '09:12', event: '生成选题列表 8 条，已推送到收件箱', status: 'ok' },
  ],
  ag2: [
    { time: '09:20', event: '接收改写任务: 一人公司启动指南', status: 'ok' },
    { time: '09:21', event: '生成微信公众号版本 (1820 字)', status: 'ok' },
    { time: '09:22', event: '生成小红书版本 (850 字)', status: 'ok' },
    { time: '09:23', event: '生成抖音脚本 (240 字)', status: 'ok' },
    { time: '09:24', event: '生成 B站简介 (480 字)', status: 'ok' },
    { time: '09:25', event: '任务完成，共 4 个版本', status: 'ok' },
  ],
  ag3: [
    { time: '07:00', event: '检测到 2 篇新文章，开始生成封面', status: 'ok' },
    { time: '07:02', event: '生成 1:1 封面图 × 2', status: 'ok' },
    { time: '07:03', event: '生成 9:16 竖版封面 × 2', status: 'ok' },
    { time: '07:04', event: '图片已写入素材库', status: 'ok' },
  ],
  ag4: [
    { time: '昨天 22:00', event: '直播结束，开始切片分析', status: 'ok' },
    { time: '昨天 22:15', event: '识别 6 个高光时刻', status: 'ok' },
    { time: '昨天 22:30', event: '生成字幕文件 (SRT)', status: 'ok' },
    { time: '昨天 22:45', event: '6 个切片已就绪，等待审核', status: 'warn' },
  ],
  ag5: [
    { time: '06:00', event: '合并多平台评论任务开始', status: 'ok' },
    { time: '06:01', event: 'API 鉴权失败: 小红书 token 已过期', status: 'error' },
    { time: '06:01', event: '任务异常终止，请前往设置刷新 Token', status: 'error' },
  ],
};
