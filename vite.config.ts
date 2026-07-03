import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 部署到 GitHub Pages 项目站点 https://yangge521.github.io/beads-template/
  // 本地开发时 dev server 自动忽略 base，访问 http://localhost:5173 正常
  base: '/beads-template/',
})
