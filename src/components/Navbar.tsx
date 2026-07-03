import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Heart, Sun, Moon, X, Palette, Upload, Clock, Trash2, Pencil, Sparkles, Share2 } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { useSearchHistory } from '../hooks/useSearchHistory';

interface NavbarProps {
  onSearch: (q: string) => void;
  onToggleTheme: () => void;
  theme: string;
  favoritesCount: number;
  onNavigateFavorites: () => void;
  onNavigateColorRef: () => void;
  onNavigateUpload: () => void;
  onNavigateEditor: () => void;
  onNavigateAi: () => void;
  onNavigateCommunity: () => void;
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
  onNavigateEditor,
  onNavigateAi,
  onNavigateCommunity,
  onNavigateHome,
  searchQuery,
}: NavbarProps) {
  const [query, setQuery] = useState(searchQuery);
  const [historyOpen, setHistoryOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const { lang, toggleLang, t } = useTranslation();
  const { history, addQuery, removeQuery, clearHistory } = useSearchHistory();

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

  // 点击搜索框外部时关闭历史下拉
  useEffect(() => {
    if (!historyOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHistoryOpen(false);
        // 阻止冒泡到 window，避免 App 的全局 ESC 处理器误触发返回首页
        e.stopPropagation();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [historyOpen]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onSearch(value);
        if (value.trim()) addQuery(value.trim());
      }, 600);
    },
    [onSearch, addQuery]
  );

  const handleClear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQuery('');
    onSearch('');
  }, [onSearch]);

  // 从历史选择一个词：立即触发搜索并关闭下拉
  const handlePickHistory = useCallback((q: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQuery(q);
    onSearch(q);
    setHistoryOpen(false);
  }, [onSearch]);

  return (
    <nav className="navbar">
      <button type="button" className="navbar__brand" onClick={onNavigateHome}>
        <span className="navbar__logo" aria-hidden="true">🔴</span>
        <span className="navbar__title">{t('nav.brand')}</span>
      </button>

      <div className="navbar__search" ref={searchWrapRef}>
        <Search size={16} className="navbar__search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="navbar__search-input"
          placeholder={t('nav.search.placeholder')}
          value={query}
          onChange={handleChange}
          onFocus={() => setHistoryOpen(true)}
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

        {historyOpen && history.length > 0 && (
          <div className="search-history" role="listbox" aria-label={t('nav.search.history.ariaLabel')}>
            <div className="search-history__header">
              <span className="search-history__title">
                <Clock size={12} aria-hidden="true" />
                {t('nav.search.history.title')}
              </span>
              <button
                type="button"
                className="search-history__clear"
                onClick={clearHistory}
                aria-label={t('nav.search.history.clear')}
              >
                {t('nav.search.history.clear')}
              </button>
            </div>
            <ul className="search-history__list">
              {history.map(h => (
                <li key={h} className="search-history__item">
                  <button
                    type="button"
                    className="search-history__pick"
                    onClick={() => handlePickHistory(h)}
                    role="option"
                    aria-selected="false"
                  >
                    <Clock size={12} aria-hidden="true" />
                    <span className="search-history__text">{h}</span>
                  </button>
                  <button
                    type="button"
                    className="search-history__remove"
                    onClick={() => removeQuery(h)}
                    aria-label={t('nav.search.history.remove', { query: h })}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="navbar__actions">
        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateAi}
          aria-label={t('nav.ai.ariaLabel')}
          title={t('nav.ai.title')}
        >
          <Sparkles size={20} />
        </button>

        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateCommunity}
          aria-label={t('nav.community.ariaLabel')}
          title={t('nav.community.title')}
        >
          <Share2 size={20} />
        </button>

        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateEditor}
          aria-label={t('nav.editor.ariaLabel')}
          title={t('nav.editor.title')}
        >
          <Pencil size={20} />
        </button>

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
