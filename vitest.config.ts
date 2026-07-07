import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // 排除 Playwright E2E 目录，由 playwright test 单独运行
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
