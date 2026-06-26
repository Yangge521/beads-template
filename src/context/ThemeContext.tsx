import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '../types/bead';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'beads-theme';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    // 首次访问：跟随系统主题；已设置过：用存储的值
    return stored ?? getSystemTheme();
  } catch {
    return getSystemTheme();
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(loadTheme);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  // 当用户未手动设置过主题时，跟随系统主题变化
  // 注意：onChange 内再次读取 localStorage，避免用户手动切换后
  // 仍被系统主题变化覆盖（effect 仅挂载时注册一次监听）
  useEffect(() => {
    let hasUserPreference = false;
    try {
      hasUserPreference = localStorage.getItem(STORAGE_KEY) !== null;
    } catch {}

    if (hasUserPreference) return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY) !== null) return;
      } catch {}
      setTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // 跨标签页同步：监听 storage 事件
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const stored = e.newValue as ThemeMode | null;
        if (stored === 'light' || stored === 'dark') {
          setTheme(stored);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
