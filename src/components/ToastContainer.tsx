import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from 'react';
import { Check, Info, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'info' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
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
  error: AlertCircle,
};

const MAX_TOASTS = 4;
const DURATION = 2500;

export default function ToastContainer({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
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
      <div className="toast-container" role="region" aria-label="通知" aria-live="polite">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <Icon size={16} className="toast__icon" />
              <span className="toast__msg">{t.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(t.id)}
                aria-label="关闭通知"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
