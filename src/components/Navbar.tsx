import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Heart, Sun, Moon, X, Palette, Upload } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface NavbarProps {
  onSearch: (q: string) => void;
  onToggleTheme: () => void;
  theme: string;
  favoritesCount: number;
  onNavigateFavorites: () => void;
  onNavigateColorRef: () => void;
  onNavigateUpload: () => void;
  onNavigateHome: () => void;
  searchQuery: string;
}

export default function Navbar({
  onSearch,
  onToggleTheme,
  theme,
  favoritesCount,
  onNavigateFavorites,
  onNavigateColorRef,
  onNavigateUpload,
  onNavigateHome,
  searchQuery,
}: NavbarProps) {
  const [query, setQuery] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang, toggleLang, t } = useTranslation();

  // 当外部 searchQuery 变化时（如导航返回/清除筛选），同步内部输入框
  // 同时清除可能残留的防抖定时器，避免旧值回灌
  useEffect(() => {
    setQuery(searchQuery);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [searchQuery]);

  // 按 / 键聚焦搜索框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 组件卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  const handleClear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <nav className="navbar">
      <button type="button" className="navbar__brand" onClick={onNavigateHome}>
        <span className="navbar__logo" aria-hidden="true">🔴</span>
        <span className="navbar__title">{t('nav.brand')}</span>
      </button>

      <div className="navbar__search">
        <Search size={16} className="navbar__search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="navbar__search-input"
          placeholder={t('nav.search.placeholder')}
          value={query}
          onChange={handleChange}
          aria-label={t('nav.search.ariaLabel')}
        />
        {!query && (
          <kbd className="navbar__search-hint" aria-hidden="true">/</kbd>
        )}
        {query && (
          <button type="button" className="navbar__search-clear" onClick={handleClear} aria-label={t('nav.search.clear')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="navbar__actions">
        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateUpload}
          aria-label={t('nav.upload.ariaLabel')}
          title={t('nav.upload.title')}
        >
          <Upload size={20} />
        </button>

        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateColorRef}
          aria-label={t('nav.colorRef.ariaLabel')}
          title={t('nav.colorRef.title')}
        >
          <Palette size={20} />
        </button>

        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateFavorites}
          aria-label={t('nav.favorites.ariaLabel', { count: favoritesCount })}
        >
          <Heart size={20} fill={favoritesCount > 0 ? '#ef4444' : 'none'} />
          {favoritesCount > 0 && (
            <span className="navbar__badge">{favoritesCount}</span>
          )}
        </button>

        <button
          type="button"
          className="navbar__action-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('nav.theme.toggleToLight') : t('nav.theme.toggleToDark')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          type="button"
          className="navbar__action-btn navbar__lang-btn"
          onClick={toggleLang}
          aria-label={t('nav.lang.ariaLabel')}
          title={t('nav.lang.title')}
        >
          {lang === 'zh' ? t('nav.lang.labelToEn') : t('nav.lang.labelToZh')}
        </button>
      </div>
    </nav>
  );
}
