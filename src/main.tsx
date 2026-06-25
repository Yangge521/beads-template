import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/registerSW'

function handleSkip() {
  const el = document.getElementById('main-content');
  if (el) {
    el.focus();
    el.scrollIntoView({ block: 'start' });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <button type="button" className="skip-link" onClick={handleSkip}>跳到主内容</button>
    <App />
  </StrictMode>,
)

// 注册 Service Worker（生产环境），通过自定义事件通知 App 层显示更新提示
registerServiceWorker(() => {
  window.dispatchEvent(new CustomEvent('sw:update-available'));
});
