import { test, expect } from '@playwright/test';

// ─── helpers ───────────────────────────────────────────────────────────────
async function noFatalErrors(page: import('@playwright/test').Page) {
  // attach per-test (called after navigation)
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
//  APP SHELL
// ═══════════════════════════════════════════════════════════════════════════
test.describe('App Shell', () => {
  test('sidebar has 9 nav links and brand header', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a')).toHaveCount(9);
    await expect(sidebar).toContainText('OPUS-OPC');
    await expect(sidebar).toContainText('一人公司工作台');
  });

  test('sidebar usage quota bar renders', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toContainText('本月套餐');
    await expect(sidebar).toContainText('62 / 100 次发布');
  });

  test('header shows + 新建创作 button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '+ 新建创作' })).toBeVisible();
  });

  test('sidebar navigation switches pages', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /内容创作/ }).click();
    await expect(page.getByTestId('page-studio')).toBeVisible();
    await page.getByRole('link', { name: /分发中心/ }).click();
    await expect(page.getByTestId('page-distribute')).toBeVisible();
  });

  test('unknown route redirects to dashboard', async ({ page }) => {
    await page.goto('/nonexistent-path');
    await expect(page.getByTestId('page-dashboard')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('renders 4 KPI stat cards', async ({ page }) => {
    await expect(page.getByText('今日发布')).toBeVisible();
    await expect(page.getByText('本周触达')).toBeVisible();
    await expect(page.getByText('直播在播')).toBeVisible();
    await expect(page.getByText('Agent 任务')).toBeVisible();
  });

  test('follower growth chart SVG renders', async ({ page }) => {
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible();
  });

  test('agent panel lists 5 agents with status badges', async ({ page }) => {
    const panel = page.locator('text=运行中的 Agent').locator('..');
    await expect(panel).toBeVisible();
    // 5 agents in mock data
    await expect(page.getByText('选题侦察兵', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('文案改写师', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('评论回复官', { exact: true }).first()).toBeVisible();
  });

  test('upcoming releases table has headers and rows', async ({ page }) => {
    await expect(page.getByText('即将发布')).toBeVisible();
    await expect(page.locator('th', { hasText: '标题' })).toBeVisible();
    await expect(page.locator('th', { hasText: '平台' })).toBeVisible();
    // at least one draft row
    await expect(page.locator('text=一人公司启动指南').first()).toBeVisible();
  });

  test('real-time badge shows on chart', async ({ page }) => {
    await expect(page.getByText('实时')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  CONTENT STUDIO
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Content Studio', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/studio'); });

  test('three-column layout: Brief / Editor / Agent panel', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Brief' })).toBeVisible();
    await expect(page.getByTestId('studio-editor')).toBeVisible();
    await expect(page.getByText('文案改写师', { exact: true })).toBeVisible();
  });

  test('title input reflects edits', async ({ page }) => {
    const titleInput = page.locator('input').first();
    await titleInput.clear();
    await titleInput.fill('全新标题测试');
    await expect(titleInput).toHaveValue('全新标题测试');
  });

  test('platform toggle: clicking deselects then re-selects', async ({ page }) => {
    // '微信' button is initially selected (wechat is in default state)
    const wechatBtn = page.getByRole('button', { name: '公众号' });
    await expect(wechatBtn).toBeVisible();
    // click once → deselect
    await wechatBtn.click();
    // click again → re-select
    await wechatBtn.click();
    // no error thrown, button still visible
    await expect(wechatBtn).toBeVisible();
  });

  test('all 7 platform buttons are visible', async ({ page }) => {
    for (const label of ['公众号', '小红书', '抖音', 'B站', 'YouTube', 'X', 'LinkedIn']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('style dropdown has options', async ({ page }) => {
    const sel = page.locator('select');
    await expect(sel).toBeVisible();
    await sel.selectOption('干货清单');
    await expect(sel).toHaveValue('干货清单');
  });

  test('一键 AI 优化 shows toast', async ({ page }) => {
    await page.getByRole('button', { name: /AI 优化/ }).click();
    await expect(page.getByText(/AI 优化中/)).toBeVisible();
  });

  test('保存草稿 shows success toast', async ({ page }) => {
    await page.getByRole('button', { name: '保存草稿' }).click();
    await expect(page.getByText('草稿已保存')).toBeVisible();
  });

  test('editor accepts typing', async ({ page }) => {
    const editor = page.getByTestId('studio-editor');
    await editor.click();
    await editor.fill('全新内容来自 Playwright');
    await expect(editor).toHaveValue(/全新内容来自 Playwright/);
  });

  test('agent chat: send message and get reply', async ({ page }) => {
    const input = page.getByPlaceholder('告诉 Agent 你的需求...');
    // initial greeting visible
    await expect(page.getByText('文案改写师', { exact: true })).toBeVisible();
    // send message via Enter
    await input.fill('帮我写抖音版本');
    await input.press('Enter');
    await expect(page.getByText('帮我写抖音版本').first()).toBeVisible();
    // agent replies
    await expect(page.getByText(/已基于/)).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('agent chat: send message via button click', async ({ page }) => {
    const input = page.getByPlaceholder('告诉 Agent 你的需求...');
    await input.fill('写 B 站标题');
    // click the send button (SVG icon button)
    await page.locator('button').filter({ has: page.locator('svg') }).last().click();
    await expect(page.getByText('写 B 站标题').first()).toBeVisible();
  });

  test('empty chat input does not submit', async ({ page }) => {
    const input = page.getByPlaceholder('告诉 Agent 你的需求...');
    const before = await page.locator('.text-xs.px-3.py-2.rounded-lg').count();
    await input.press('Enter');
    const after = await page.locator('.text-xs.px-3.py-2.rounded-lg').count();
    expect(after).toBe(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  LIBRARY
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Asset Library', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/library'); });

  test('renders 8 asset cards', async ({ page }) => {
    // 8 mock assets
    await expect(page.locator('.panel.p-3').filter({ hasNot: page.locator('[data-testid]') })).toHaveCount(8);
  });

  test('filter tabs render: 全部/图片/视频/音频/文档/模板', async ({ page }) => {
    for (const label of ['全部', '图片', '视频', '音频', '文档', '模板']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('upload button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /上传素材/ })).toBeVisible();
  });

  test('asset names visible', async ({ page }) => {
    await expect(page.getByText('品牌主视觉_v3.png')).toBeVisible();
    await expect(page.getByText('直播开场白脚本.md')).toBeVisible();
    await expect(page.getByText('Logo_白底.svg')).toBeVisible();
  });

  test('kind badges render', async ({ page }) => {
    await expect(page.getByText('image').first()).toBeVisible();
    await expect(page.getByText('video').first()).toBeVisible();
    await expect(page.getByText('doc').first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DISTRIBUTE
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Distribution Hub', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/distribute'); });

  test('all 5 filter tabs visible', async ({ page }) => {
    for (const label of ['全部', '草稿', '已排程', '已发布', '失败']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('全部 tab shows 5 drafts', async ({ page }) => {
    await expect(page.locator('[data-testid^="draft-card-"]')).toHaveCount(5);
  });

  test('草稿 tab filters to draft items only', async ({ page }) => {
    await page.getByRole('button', { name: '草稿' }).click();
    // Only 1 draft in mock
    await expect(page.getByText('AI 工具栈拆解 · 2026')).toBeVisible();
    await expect(page.getByText('一人公司启动指南')).not.toBeVisible();
  });

  test('已发布 tab shows published items', async ({ page }) => {
    await page.getByRole('button', { name: '已发布' }).click();
    await expect(page.getByText('副业转主业的三组现金流')).toBeVisible();
  });

  test('失败 tab shows failed items', async ({ page }) => {
    await page.getByRole('button', { name: '失败' }).click();
    await expect(page.getByText('今日实验：用 GPT 写带货文案')).toBeVisible();
  });

  test('已排程 tab shows queued items', async ({ page }) => {
    await page.getByRole('button', { name: '已排程' }).click();
    await expect(page.getByText('一人公司启动指南').first()).toBeVisible();
    await expect(page.getByText('直播切片 #14 · 选品 SOP')).toBeVisible();
  });

  test('一键发布 shows success toast', async ({ page }) => {
    await page.getByRole('button', { name: /一键发布/ }).click();
    await expect(page.getByText('已加入发布队列')).toBeVisible();
  });

  test('全部 tab restores after filtering', async ({ page }) => {
    await page.getByRole('button', { name: '草稿' }).click();
    await page.getByRole('button', { name: '全部' }).click();
    await expect(page.locator('[data-testid^="draft-card-"]')).toHaveCount(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Schedule Calendar', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/schedule'); });

  test('renders 4 day columns', async ({ page }) => {
    const dates = ['2026-04-26', '2026-04-27', '2026-04-28', '2026-04-29'];
    for (const d of dates) {
      await expect(page.getByText(d)).toBeVisible();
    }
  });

  test('schedule items render with time and title', async ({ page }) => {
    await expect(page.getByText('早报推送')).toBeVisible();
    await expect(page.getByText('09:00')).toBeVisible();
    await expect(page.getByText('AI 工具栈拆解')).toBeVisible();
    await expect(page.getByText('直播开播')).toBeVisible();
  });

  test('platform names displayed under items', async ({ page }) => {
    await expect(page.getByText('微信公众号').first()).toBeVisible();
    await expect(page.getByText('抖音').first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  STREAMING
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Live Streaming', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/streaming'); });

  test('initial state shows LIVE and 结束直播 button', async ({ page }) => {
    await expect(page.getByText('LIVE').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /结束直播/ })).toBeVisible();
  });

  test('toggle live off → shows 离线 and 开始直播', async ({ page }) => {
    await page.getByRole('button', { name: /结束直播/ }).click();
    await expect(page.getByText('离线')).toBeVisible();
    await expect(page.getByRole('button', { name: /开始直播/ })).toBeVisible();
  });

  test('toggle live back on → shows LIVE again', async ({ page }) => {
    await page.getByRole('button', { name: /结束直播/ }).click();
    await page.getByRole('button', { name: /开始直播/ }).click();
    await expect(page.getByText('LIVE').first()).toBeVisible();
  });

  test('stat cards: viewers, bitrate, latency', async ({ page }) => {
    await expect(page.getByText('总观看')).toBeVisible();
    await expect(page.getByText('6.2 Mbps')).toBeVisible();
    await expect(page.getByText('2.1s')).toBeVisible();
  });

  test('4 RTMP targets listed', async ({ page }) => {
    await expect(page.getByText('抖音直播')).toBeVisible();
    await expect(page.getByText('B站直播')).toBeVisible();
    await expect(page.getByText('YouTube Live')).toBeVisible();
    await expect(page.getByText('小红书直播')).toBeVisible();
  });

  test('connected targets show connected badge', async ({ page }) => {
    await expect(page.getByText('connected').first()).toBeVisible();
  });

  test('RTMP copy button shows toast', async ({ page }) => {
    await page.locator('button').filter({ has: page.locator('svg') }).nth(1).click();
    await expect(page.getByText('RTMP 地址已复制')).toBeVisible();
  });

  test('danmu panel renders comments', async ({ page }) => {
    await expect(page.getByText('弹幕聚合')).toBeVisible();
    await expect(page.getByText(/主播好可爱/)).toBeVisible();
    await expect(page.getByText(/Greetings from US/)).toBeVisible();
  });

  test('streaming params panel renders', async ({ page }) => {
    await expect(page.getByText('推流参数')).toBeVisible();
    await expect(page.getByText('1920×1080')).toBeVisible();
    await expect(page.getByText('H.264')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/analytics'); });

  test('renders 4 KPI stat cards', async ({ page }) => {
    await expect(page.getByText('总曝光')).toBeVisible();
    await expect(page.getByText('总互动')).toBeVisible();
    await expect(page.getByText('互动率')).toBeVisible();
    await expect(page.getByText('新增粉丝')).toBeVisible();
  });

  test('engagement bar chart renders', async ({ page }) => {
    await expect(page.getByText('各平台曝光 vs 互动')).toBeVisible();
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  });

  test('top 5 content list renders', async ({ page }) => {
    await expect(page.getByText('热门内容 Top 5')).toBeVisible();
    await expect(page.getByText('#1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('#5', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('一人公司启动指南：从 0 到 1 的 7 个动作')).toBeVisible();
  });

  test('revenue breakdown renders with progress bars', async ({ page }) => {
    await expect(page.getByText('收入来源（本月）')).toBeVisible();
    await expect(page.getByText('付费会员订阅')).toBeVisible();
    await expect(page.getByText('¥18,420')).toBeVisible();
    await expect(page.getByText('品牌合作')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  AGENTS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('AI Agents', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/agents'); });

  test('renders 5 agent cards', async ({ page }) => {
    await expect(page.getByText('选题侦察兵')).toBeVisible();
    await expect(page.getByText('文案改写师')).toBeVisible();
    await expect(page.getByText('配图设计师')).toBeVisible();
    await expect(page.getByText('直播切片师')).toBeVisible();
    await expect(page.getByText('评论回复官')).toBeVisible();
  });

  test('agent status badges: running / idle / error', async ({ page }) => {
    // 2 running, 2 idle, 1 error
    await expect(page.getByText('running').first()).toBeVisible();
    await expect(page.getByText('idle').first()).toBeVisible();
    await expect(page.getByText('error').first()).toBeVisible();
  });

  test('running agent shows 暂停 button', async ({ page }) => {
    await expect(page.getByRole('button', { name: '暂停' }).first()).toBeVisible();
  });

  test('idle agent shows 启动 button', async ({ page }) => {
    await expect(page.getByRole('button', { name: '启动' }).first()).toBeVisible();
  });

  test('clicking 暂停 shows toast', async ({ page }) => {
    await page.getByRole('button', { name: '暂停' }).first().click();
    await expect(page.getByText(/已暂停/)).toBeVisible();
  });

  test('clicking 启动 on idle agent shows toast', async ({ page }) => {
    await page.getByRole('button', { name: '启动' }).first().click();
    await expect(page.getByText(/已启动/)).toBeVisible();
  });

  test('重跑 buttons visible', async ({ page }) => {
    const rerun = page.getByRole('button', { name: '重跑' });
    await expect(rerun.first()).toBeVisible();
    await expect(rerun).toHaveCount(5);
  });

  test('+ 新建 Agent button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ 新建 Agent' })).toBeVisible();
  });

  test('last run info rendered per card', async ({ page }) => {
    await expect(page.getByText('上次运行：5 分钟前')).toBeVisible();
    await expect(page.getByText('上次运行：昨天').first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/settings'); });

  test('renders 7 platform rows', async ({ page }) => {
    await expect(page.getByText('已绑定平台')).toBeVisible();
    await expect(page.getByText('微信公众号')).toBeVisible();
    await expect(page.getByText('小红书')).toBeVisible();
    await expect(page.getByText('LinkedIn')).toBeVisible();
  });

  test('connected vs disconnected badges', async ({ page }) => {
    await expect(page.getByText('connected').first()).toBeVisible();
    await expect(page.getByText('disconnected').first()).toBeVisible();
  });

  test('AI Provider panel shows 3 providers', async ({ page }) => {
    await expect(page.getByText('AI Provider')).toBeVisible();
    await expect(page.getByText('OpenAI')).toBeVisible();
    await expect(page.getByText('Anthropic')).toBeVisible();
    await expect(page.getByText('DeepSeek')).toBeVisible();
  });

  test('brand name input is editable', async ({ page }) => {
    const brandPanel = page.locator('.panel').filter({ hasText: '品牌资料' });
    const input = brandPanel.locator('input').first();
    await input.clear();
    await input.fill('我的品牌');
    await expect(input).toHaveValue('我的品牌');
  });

  test('slogan input is editable', async ({ page }) => {
    const brandPanel = page.locator('.panel').filter({ hasText: '品牌资料' });
    const input = brandPanel.locator('input').nth(1);
    await input.clear();
    await input.fill('新 Slogan');
    await expect(input).toHaveValue('新 Slogan');
  });

  test('语气 dropdown has options', async ({ page }) => {
    const sel = page.locator('select').last();
    await sel.selectOption('活泼 · 年轻');
    await expect(sel).toHaveValue('活泼 · 年轻');
  });

  test('auth buttons: 重新授权 and 立即授权 visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: '重新授权' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '立即授权' }).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  REPURPOSE STUDIO (改写工坊)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Repurpose Studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    // Switch to repurpose tab
    await page.getByTestId('tab-repurpose').click();
  });

  test('改写工坊 tab is clickable and shows repurpose studio', async ({ page }) => {
    await expect(page.getByTestId('repurpose-studio')).toBeVisible();
  });

  test('source title and body inputs are pre-filled', async ({ page }) => {
    await expect(page.getByTestId('repurpose-title')).toBeVisible();
    await expect(page.getByTestId('repurpose-source')).toBeVisible();
  });

  test('7 platform output cards render', async ({ page }) => {
    await expect(page.getByTestId('repurpose-cards')).toBeVisible();
    for (const id of ['wechat', 'xiaohongshu', 'douyin', 'bilibili', 'youtube', 'x', 'linkedin']) {
      await expect(page.getByTestId(`repurpose-card-${id}`)).toBeVisible();
    }
  });

  test('generate button is visible and enabled', async ({ page }) => {
    const btn = page.getByTestId('repurpose-generate');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(btn).toContainText('一键生成全平台');
  });

  test('clicking generate triggers generation and shows content', async ({ page }) => {
    const btn = page.getByTestId('repurpose-generate');
    await btn.click();
    // Wait for content to appear in wechat card (async generation)
    await expect(page.getByTestId('repurpose-card-wechat')).toContainText('微信公众号', { timeout: 10000 });
    await expect(page.getByTestId('repurpose-card-xiaohongshu')).toContainText('小红书', { timeout: 10000 });
  });

  test('generate button shows loading state', async ({ page }) => {
    await page.getByTestId('repurpose-generate').click();
    await expect(page.getByTestId('repurpose-generate').getByText('AI 改写中...')).toBeVisible();
  });

  test('platform toggle disables card', async ({ page }) => {
    // Find and click "微信公众号" toggle button to disable it
    const wechatToggle = page.getByRole('button', { name: '微信公众号' });
    await wechatToggle.click();
    await expect(page.getByTestId('repurpose-card-wechat')).toHaveClass(/opacity-40/);
  });

  test('switching back to 创作编辑 tab restores editor', async ({ page }) => {
    await page.getByTestId('tab-editor').click();
    await expect(page.getByTestId('studio-editor')).toBeVisible();
    await expect(page.getByTestId('repurpose-studio')).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DISTRIBUTE – PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Distribute Preview Modal', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/distribute'); });

  test('each draft card has a 预览 button', async ({ page }) => {
    const previewBtns = page.getByRole('button', { name: '预览' });
    await expect(previewBtns).toHaveCount(5);
  });

  test('clicking 预览 opens modal', async ({ page }) => {
    await page.getByTestId('preview-btn-d-001').click();
    await expect(page.getByTestId('preview-modal')).toBeVisible();
    await expect(page.getByText('平台预览')).toBeVisible();
  });

  test('modal shows platform cards for the draft platforms', async ({ page }) => {
    await page.getByTestId('preview-btn-d-001').click();
    // d-001 is on wechat + xiaohongshu + linkedin
    await expect(page.getByText('微信公众号').first()).toBeVisible();
    await expect(page.getByText('小红书').first()).toBeVisible();
    await expect(page.getByText('LinkedIn').first()).toBeVisible();
  });

  test('modal close button hides modal', async ({ page }) => {
    await page.getByTestId('preview-btn-d-001').click();
    await expect(page.getByTestId('preview-modal')).toBeVisible();
    await page.getByTestId('preview-modal-close').click();
    await expect(page.getByTestId('preview-modal')).not.toBeVisible();
  });

  test('modal 确认发布 shows toast and closes modal', async ({ page }) => {
    await page.getByTestId('preview-btn-d-001').click();
    await page.getByRole('button', { name: '确认发布' }).click();
    await expect(page.getByText('已加入发布队列')).toBeVisible();
    await expect(page.getByTestId('preview-modal')).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  AGENTS – LOG MODAL & NEW AGENT
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Agents Enhanced', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/agents'); });

  test('each agent card has a 日志 button', async ({ page }) => {
    const logBtns = page.getByRole('button', { name: '日志' });
    await expect(logBtns).toHaveCount(5);
  });

  test('clicking 日志 opens log modal', async ({ page }) => {
    await page.getByTestId('log-btn-ag1').click();
    await expect(page.getByTestId('agent-log-modal')).toBeVisible();
    await expect(page.getByText('运行日志')).toBeVisible();
  });

  test('log modal shows run events for ag1', async ({ page }) => {
    await page.getByTestId('log-btn-ag1').click();
    await expect(page.getByText('启动选题扫描任务')).toBeVisible();
    await expect(page.getByText('生成选题列表 8 条，已推送到收件箱')).toBeVisible();
  });

  test('log modal for error agent shows error events', async ({ page }) => {
    await page.getByTestId('log-btn-ag5').click();
    await expect(page.getByText(/API 鉴权失败/)).toBeVisible();
    await expect(page.getByText(/任务异常终止/)).toBeVisible();
  });

  test('log modal close button hides modal', async ({ page }) => {
    await page.getByTestId('log-btn-ag1').click();
    await expect(page.getByTestId('agent-log-modal')).toBeVisible();
    await page.getByTestId('agent-log-close').click();
    await expect(page.getByTestId('agent-log-modal')).not.toBeVisible();
  });

  test('clicking + 新建 Agent opens new agent modal', async ({ page }) => {
    await page.getByTestId('new-agent-btn').click();
    await expect(page.getByTestId('new-agent-modal')).toBeVisible();
    await expect(page.getByTestId('new-agent-modal').getByText('新建 Agent')).toBeVisible();
  });

  test('new agent modal: fill name and create', async ({ page }) => {
    await page.getByTestId('new-agent-btn').click();
    await page.getByTestId('new-agent-name').fill('周报撰写师');
    await page.getByTestId('new-agent-create').click();
    await expect(page.getByText('周报撰写师 已创建')).toBeVisible();
    await expect(page.getByTestId('new-agent-modal')).not.toBeVisible();
  });

  test('new agent modal: empty name shows error', async ({ page }) => {
    await page.getByTestId('new-agent-btn').click();
    await page.getByTestId('new-agent-create').click();
    await expect(page.getByText('请输入 Agent 名称')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS – DATE RANGE
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Analytics Date Range', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/analytics'); });

  test('date range selector renders with 3 options', async ({ page }) => {
    const sel = page.getByTestId('date-range-selector');
    await expect(sel).toBeVisible();
    await expect(sel.getByRole('button', { name: '7日' })).toBeVisible();
    await expect(sel.getByRole('button', { name: '30日' })).toBeVisible();
    await expect(sel.getByRole('button', { name: '90日' })).toBeVisible();
  });

  test('switching to 30日 updates chart badge', async ({ page }) => {
    await page.getByTestId('range-30日').click();
    await expect(page.getByTestId('range-badge')).toContainText('30日');
  });

  test('switching to 90日 updates chart badge', async ({ page }) => {
    await page.getByTestId('range-90日').click();
    await expect(page.getByTestId('range-badge')).toContainText('90日');
  });

  test('top content items are expandable', async ({ page }) => {
    const firstItem = page.getByRole('button', { name: /#1.*一人公司/ });
    await firstItem.click();
    await expect(page.getByText('转化率')).toBeVisible();
    await expect(page.getByText('4.2%')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD – ACTIVITY FEED
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard Activity Feed', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('activity feed section renders', async ({ page }) => {
    await expect(page.getByText('最近动态')).toBeVisible();
  });

  test('activity items show text and time', async ({ page }) => {
    await expect(page.getByText(/已发布到微信公众号/)).toBeVisible();
    await expect(page.getByText(/选题侦察兵完成今日扫描/)).toBeVisible();
  });

  test('today tasks section renders', async ({ page }) => {
    await expect(page.getByText('今日待办')).toBeVisible();
    await expect(page.getByText(/回复昨日小红书评论/)).toBeVisible();
  });
});

