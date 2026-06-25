import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a href="#main-content" className="skip-link">跳到主内容</a>
    <App />
  </StrictMode>,
)
