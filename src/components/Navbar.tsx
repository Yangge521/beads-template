import { useState, useCallback, useRef } from 'react';
import { Search, Heart, Sun, Moon, X } from 'lucide-react';

interface NavbarProps {
  onSearch: (q: string) => void;
  onToggleTheme: () => void;
  theme: string;
  favoritesCount: number;
  onNavigateFavorites: () => void;
  onNavigateHome: () => void;
}

export default function Navbar({
  onSearch,
  onToggleTheme,
  theme,
  favoritesCount,
  onNavigateFavorites,
  onNavigateHome,
}: NavbarProps) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <button className="navbar__brand" onClick={onNavigateHome}>
        <span className="navbar__logo">🔴</span>
        <span className="navbar__title">拼豆收集</span>
      </button>

      <div className="navbar__search">
        <Search size={16} className="navbar__search-icon" />
        <input
          type="text"
          className="navbar__search-input"
          placeholder="搜索模板..."
          value={query}
          onChange={handleChange}
        />
        {query && (
          <button className="navbar__search-clear" onClick={handleClear} aria-label="清除搜索">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="navbar__actions">
        <button
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
