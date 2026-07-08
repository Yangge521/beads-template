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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      // 覆盖率阈值门禁（防止覆盖率劣化）
      thresholds: {
        // 当前覆盖率基线：hooks 已有较好覆盖，其他模块逐步提升
        statements: 30,
        branches: 25,
        functions: 25,
        lines: 30,
      },
      // 仅统计 src 目录下的业务代码
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
});
