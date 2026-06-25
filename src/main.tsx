import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
