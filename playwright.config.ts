import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置。
 *
 * 使用前：
 *   1. npm install -D @playwright/test
 *   2. npx playwright install chromium  # 下载浏览器（约 150MB）
 *   3. npm run build && npm run preview  # 启动生产构建预览
 *   4. npx playwright test               # 另开终端运行 E2E
 *
 * 或直接：npx playwright test --webServer Command= 启动自带 dev server
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
