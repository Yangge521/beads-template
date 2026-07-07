import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/registerSW'
import { initPerfMonitor } from './utils/perfMonitor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 注册 Service Worker（生产环境），通过自定义事件通知 App 层显示更新提示
registerServiceWorker(() => {
  window.dispatchEvent(new CustomEvent('sw:update-available'));
});

// 初始化 Web Vitals 监控（仅生产环境，控制台输出 LCP/CLS/FID/TTFB）
initPerfMonitor();
