import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../i18n/translations';
import type { Language, TranslationParams } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  /** 翻译函数：t('home.hero.title') 或带插值 t('nav.favorites.ariaLabel', { count: 3 }) */
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = 'beads-lang';

function detectInitialLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {}
  // 首次访问：跟随浏览器语言（与 ThemeContext 跟随系统主题的思路一致）
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'zh';
}

function translate(lang: Language, key: string, params?: TranslationParams): string {
  const dict = translations[lang] as Record<string, string>;
  // 1) 当前语言命中；2) 回退到 zh；3) 再回退到 key 本身，便于发现遗漏
  let str = dict[key] ?? (translations.zh as Record<string, string>)[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectInitialLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  // 初始挂载及语言变化时同步 <html lang>，供无障碍与 SEO
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  // 跨标签页同步（与 ThemeContext 一致）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'zh' || e.newValue === 'en')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(lang, key, params),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
