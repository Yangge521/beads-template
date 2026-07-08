import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 生产环境移除 console.log/debug（保留 console.error/warn）
    {
      name: 'remove-console',
      apply: 'build',
      renderChunk(code) {
        if (process.env.NODE_ENV !== 'production') return null;
        // 将 console.log/console.debug 调用替换为 void 0
        const transformed = code
          .replace(/console\.(log|debug)\(/g, 'void(')
          .replace(/\/\/# sourceMappingURL=/g, '//# sourceMappingURL=');
        return { code: transformed, map: null };
      },
    },
  ],
  // 部署到 GitHub Pages 项目站点 https://yangge521.github.io/beads-template/
  // 本地开发时 dev server 自动忽略 base，访问 http://localhost:5173 正常
  base: '/beads-template/',
  build: {
    // 生产环境生成隐藏的 sourcemap 用于错误监控（不影响生产体积）
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // 拆分第三方依赖为独立 chunk，提升缓存命中率
        manualChunks(id) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/pinyin-pro')) {
            return 'pinyin';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // PDF 导出库独立 chunk，按需加载
          if (id.includes('node_modules/jspdf')) {
            return 'jspdf';
          }
          // html2canvas 独立 chunk
          if (id.includes('node_modules/html2canvas')) {
            return 'html2canvas';
          }
        },
      },
    },
  },
})
