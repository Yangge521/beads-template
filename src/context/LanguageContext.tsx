import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../i18n/translations';
import type { Language, TranslationParams, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  /** 翻译函数：t('home.hero.title') 或带插值 t('nav.favorites.ariaLabel', { count: 3 }) */
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (k: TranslationKey) => k,
});

const STORAGE_KEY = 'beads-lang';

function detectInitialLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === 'zh' || stored === 'en') return stored;
  } catch { /* 隐私模式忽略 */ }
  // 首次访问：跟随浏览器语言（与 ThemeContext 跟随系统主题的思路一致）
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'zh';
}

/**
 * 轻量 ICU 复数支持：处理 {count, plural, =0{无} one{# 颗} other{# 颗}} 语法
 * 不引入完整 ICU 库，仅支持简单的 plural/select 语法
 */
function applyICU(str: string, params: TranslationParams): string {
  // 处理 {varName, plural, =0{...} one{...} other{...}}
  return str.replace(/\{(\w+),\s*plural,\s*([^}]+(?:\{[^}]*\}[^}]*)+)\}/g, (_match, varName: string, body: string) => {
    const count = Number(params[varName] ?? 0);
    // 匹配 =N{...} one{...} other{...}
    const exactMatch = body.match(new RegExp(`=${count}\\{([^}]*)\\}`));
    if (exactMatch) return exactMatch[1].replace(/#/g, String(count));
    if (count === 1) {
      const oneMatch = body.match(/one\{([^}]*)\}/);
      if (oneMatch) return oneMatch[1].replace(/#/g, String(count));
    }
    const otherMatch = body.match(/other\{([^}]*)\}/);
    if (otherMatch) return otherMatch[1].replace(/#/g, String(count));
    return String(count);
  });
}

function translate(lang: Language, key: TranslationKey, params?: TranslationParams): string {
  const dict = translations[lang] as Record<string, string>;
  // 1) 当前语言命中；2) 回退到 zh；3) 再回退到 key 本身，便于发现遗漏
  const fallbackKey = key as string;
  let str = dict[fallbackKey] ?? (translations.zh as Record<string, string>)[fallbackKey] ?? fallbackKey;
  if (params) {
    // 先处理 ICU 复数语法
    str = applyICU(str, params);
    // 再处理普通 {varName} 占位符
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
    } catch { /* 隐私模式忽略 */ }
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  // 初始挂载及语言变化时同步 <html lang>，供无障碍与 SEO
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  // 同步 SEO meta 标签与文档语言一致（index.html 中的静态中文标签会被覆盖为当前语言）
  useEffect(() => {
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', translate(lang, 'meta.description'));
    setMeta('meta[name="keywords"]', 'content', translate(lang, 'meta.keywords'));
    setMeta('meta[property="og:title"]', 'content', translate(lang, 'meta.ogTitle'));
    setMeta('meta[property="og:description"]', 'content', translate(lang, 'meta.ogDescription'));
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
    (key: TranslationKey, params?: TranslationParams) => translate(lang, key, params),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
