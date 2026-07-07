import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from 'react';
import { Check, Info, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  /** 是否正在退出（用于淡出动画） */
  leaving?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastContainer');
  return ctx;
}

const icons: Record<ToastType, typeof Check> = {
  success: Check,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

/** 按类型决定 aria-live：error/warning 需要立即插播 */
const liveByType: Record<ToastType, 'polite' | 'assertive'> = {
  success: 'polite',
  info: 'polite',
  warning: 'assertive',
  error: 'assertive',
};

const MAX_TOASTS = 4;
const DURATION = 2500;
const EXIT_ANIMATION_MS = 200;

export default function ToastContainer({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const { t } = useTranslation();

  const dismiss = useCallback((id: number) => {
    // 先标记为 leaving 触发淡出动画，动画结束后再移除
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    const exitTimer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, EXIT_ANIMATION_MS);
    timersRef.current.set(id, exitTimer);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      // 超出上限时，主动清理被剔除 toast 的定时器，避免泄漏
      if (next.length > MAX_TOASTS) {
        const evicted = next.slice(0, next.length - MAX_TOASTS);
        for (const t of evicted) {
          const timer = timersRef.current.get(t.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(t.id);
          }
        }
        return next.slice(-MAX_TOASTS);
      }
      return next;
    });
    const timer = setTimeout(() => dismiss(id), DURATION);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 容器保持 polite，每条 toast 自己按类型设置 role */}
      <div className="toast-container" role="region" aria-label={t('common.toast.region')}>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          const live = liveByType[toast.type];
          return (
            <div
              key={toast.id}
              className={`toast toast--${toast.type}${toast.leaving ? ' toast--leaving' : ''}`}
              role={live === 'assertive' ? 'alert' : 'status'}
              aria-live={live}
            >
              <Icon size={16} className="toast__icon" aria-hidden="true" />
              <span className="toast__msg">{toast.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(toast.id)}
                aria-label={t('common.close')}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
