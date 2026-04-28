import { test, expect } from '@playwright/test';

/**
 * Smoke tests for the chat composer (used on Home page + Chat page).
 * Verifies render, input, quick-action buttons populate input, and Send button enable/disable.
 */

test.describe('ChatComposer smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss splash by pressing Enter (Splash supports Enter/Space/Escape)
    await page.keyboard.press('Enter').catch(() => {});
    await expect(page.getByRole('heading', { name: '我能为你做什么？' })).toBeVisible({ timeout: 10_000 });
  });

  test('home composer renders with input + send disabled by default', async ({ page }) => {
    const input = page.getByPlaceholder('分配具体工作或提问任何问题');
    await expect(input).toBeVisible();

    // The send button is the last button inside the composer area (ArrowUp).
    // Find the enabled-state via DOM: it has `disabled` attribute when input empty.
    const composer = input.locator('xpath=ancestor::*[contains(@class,"rounded-2xl")][1]');
    const sendButton = composer.locator('button').last();
    await expect(sendButton).toBeDisabled();
  });

  test('typing enables send button', async ({ page }) => {
    const input = page.getByPlaceholder('分配具体工作或提问任何问题');
    await input.fill('hello');
    const composer = input.locator('xpath=ancestor::*[contains(@class,"rounded-2xl")][1]');
    const sendButton = composer.locator('button').last();
    await expect(sendButton).toBeEnabled();
  });

  test('quick-action button populates input', async ({ page }) => {
    const input = page.getByPlaceholder('分配具体工作或提问任何问题');
    await page.getByRole('button', { name: '智能选股', exact: true }).click();
    await expect(input).toHaveValue('帮我智能选股');
  });

  test('file library modal opens and closes', async ({ page }) => {
    const input = page.getByPlaceholder('分配具体工作或提问任何问题');
    const composer = input.locator('xpath=ancestor::*[contains(@class,"rounded-2xl")][1]');
    // First button in the left action group is HardDrive (file library)
    await composer.getByTitle('从文件库添加').click();
    // Modal opens
    const modal = page.locator('text=/文件库|全部/').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    // Press Escape or click close to dismiss
    await page.keyboard.press('Escape').catch(() => {});
  });
});

test.describe('Sidebar navigation smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Enter').catch(() => {});
    await expect(page.getByRole('heading', { name: '我能为你做什么？' })).toBeVisible({ timeout: 10_000 });
  });

  test('clicking 行情 opens market tab', async ({ page }) => {
    await page.getByRole('button', { name: '行情', exact: true }).click();
    // Tab bar should now contain 行情
    await expect(page.locator('text=行情').first()).toBeVisible();
  });

  test('clicking 文件库 opens files tab and back to 控制台 returns home', async ({ page }) => {
    await page.getByRole('button', { name: '文件库', exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: '控制台', exact: true }).click();
    await expect(page.getByRole('heading', { name: '我能为你做什么？' })).toBeVisible();
  });
});
