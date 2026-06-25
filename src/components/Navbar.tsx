import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Heart, Sun, Moon, X } from 'lucide-react';

interface NavbarProps {
  onSearch: (q: string) => void;
  onToggleTheme: () => void;
  theme: string;
  favoritesCount: number;
  onNavigateFavorites: () => void;
  onNavigateHome: () => void;
  searchQuery: string;
}

export default function Navbar({
  onSearch,
  onToggleTheme,
  theme,
  favoritesCount,
  onNavigateFavorites,
  onNavigateHome,
  searchQuery,
}: NavbarProps) {
  const [query, setQuery] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当外部 searchQuery 变化时（如导航返回/清除筛选），同步内部输入框
  useEffect(() => {
    setQuery(searchQuery);
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
        <span className="navbar__logo">🔴</span>
        <span className="navbar__title">拼豆收集</span>
      </button>

      <div className="navbar__search">
        <Search size={16} className="navbar__search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="navbar__search-input"
          placeholder="搜索模板..."
          value={query}
          onChange={handleChange}
          aria-label="搜索模板"
        />
        {!query && (
          <kbd className="navbar__search-hint" aria-hidden="true">/</kbd>
        )}
        {query && (
          <button type="button" className="navbar__search-clear" onClick={handleClear} aria-label="清除搜索">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="navbar__actions">
        <button
          type="button"
          className="navbar__action-btn"
          onClick={onNavigateFavorites}
          aria-label={`收藏 (${favoritesCount})`}
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
          aria-label={`切换${theme === 'dark' ? '明亮' : '深色'}主题`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </nav>
  );
}
