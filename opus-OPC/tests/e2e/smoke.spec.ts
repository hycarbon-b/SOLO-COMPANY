import { test, expect } from '@playwright/test';

const ROUTES: Array<{ path: string; testid: string; titleContains: string }> = [
  { path: '/', testid: 'page-dashboard', titleContains: '总览' },
  { path: '/studio', testid: 'page-studio', titleContains: '内容创作' },
  { path: '/library', testid: 'page-library', titleContains: '素材库' },
  { path: '/distribute', testid: 'page-distribute', titleContains: '分发中心' },
  { path: '/schedule', testid: 'page-schedule', titleContains: '排程日历' },
  { path: '/streaming', testid: 'page-streaming', titleContains: '直播推流' },
  { path: '/analytics', testid: 'page-analytics', titleContains: '数据分析' },
  { path: '/agents', testid: 'page-agents', titleContains: 'AI 代理' },
  { path: '/settings', testid: 'page-settings', titleContains: '设置' },
];

test.describe('OPUS-OPC smoke', () => {
  test('app shell renders and sidebar shows all 9 nav items', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-sidebar')).toBeVisible();
    await expect(page.getByTestId('app-sidebar').locator('a')).toHaveCount(9);
    await expect(page.getByTestId('page-dashboard')).toBeVisible();
  });

  for (const r of ROUTES) {
    test(`route ${r.path} renders`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(r.path);
      await expect(page.getByTestId(r.testid)).toBeVisible();
      await expect(page.getByTestId('page-title')).toContainText(r.titleContains);

      // Filter benign errors (e.g. 404 favicon) — fail only on real script errors.
      const fatal = errors.filter(
        (e) => !/favicon|net::ERR_|404/i.test(e)
      );
      expect(fatal, `Console errors on ${r.path}:\n${fatal.join('\n')}`).toEqual([]);
    });
  }

  test('studio editor accepts input and chat sends a message', async ({ page }) => {
    await page.goto('/studio');
    const editor = page.getByTestId('studio-editor');
    await editor.click();
    await editor.fill('# Hello from playwright');
    await expect(editor).toHaveValue(/Hello from playwright/);

    const input = page.getByPlaceholder('告诉 Agent 你的需求...');
    await input.fill('改写成小红书风格');
    await input.press('Enter');
    await expect(page.getByText('改写成小红书风格').first()).toBeVisible();
    await expect(input).toHaveValue('');
  });
});
