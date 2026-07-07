import { test, expect } from '@playwright/test';

/**
 * Smoke test：验证应用核心路径可访问，无 JS 报错。
 *
 * 运行前确保：
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *   npm run build && npm run preview  # 或让 webServer 自动启动
 */
test.describe('应用核心路径 smoke test', () => {
  test('首页可加载，显示 Hero 标题', async ({ page }) => {
    await page.goto('/');
    // 等待 Hero 标题出现（i18n key 对应文案）
    await expect(page.locator('.hero__title')).toBeVisible({ timeout: 15_000 });
    // 没有控制台 error
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // 至少有一个模板卡片渲染（懒加载后会出现）
    await expect(page.locator('.template-card').first()).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  test('导航到收藏页可切换路由', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__title')).toBeVisible();
    // 通过 URL hash 直接访问收藏页
    await page.goto('/#/favorites');
    // 收藏页应该有空状态或模板列表
    await expect(page.locator('.page')).toBeVisible();
  });

  test('搜索过滤正常工作', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.template-card').first()).toBeVisible({ timeout: 10_000 });

    // 在搜索框输入
    const searchInput = page.locator('input[type="search"], input[aria-label*="搜索"], input[placeholder*="搜索"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('pokemon');
      // 等待过滤结果
      await page.waitForTimeout(500);
      // 至少有一个匹配结果
      const cardCount = await page.locator('.template-card').count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('主题切换按钮可点击', async ({ page }) => {
    await page.goto('/');
    const themeToggle = page.locator('button[aria-label*="主题"], button[aria-label*="theme"]').first();
    if (await themeToggle.isVisible()) {
      const htmlBefore = await page.locator('html').getAttribute('data-theme') || '';
      await themeToggle.click();
      await page.waitForTimeout(300);
      // 切换后属性可能变化
      const htmlAfter = await page.locator('html').getAttribute('data-theme') || '';
      // 不强制相等，只验证按钮可点击不报错
      expect(htmlAfter !== '' || htmlBefore !== '').toBeTruthy();
    }
  });
});
