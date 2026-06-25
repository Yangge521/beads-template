import { useState, useCallback, useEffect, useMemo } from 'react';
import HomePage, { type SortKey, type DifficultyFilter, type GridSizeFilter } from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ColorReferencePage from './pages/ColorReferencePage';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer, { useToast } from './components/ToastContainer';
import ShortcutHelp from './components/ShortcutHelp';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useFavorites } from './hooks/useFavorites';
import { useRecentlyViewed } from './hooks/useRecentlyViewed';
import { CATEGORIES } from './categories';
import type { BeadTemplate } from './types/bead';
import animeData from './data/anime.json';
import pokemonData from './data/pokemon.json';
import celebrityData from './data/celebrity.json';
import foodData from './data/food.json';
import animalsData from './data/animals.json';
import holidayData from './data/holiday.json';
import kawaiiData from './data/kawaii.json';
import pixel3dData from './data/pixel3d.json';
import emojiData from './data/emoji.json';

const allTemplates: BeadTemplate[] = [
  ...animeData,
  ...pokemonData,
  ...celebrityData,
  ...foodData,
  ...animalsData,
  ...holidayData,
  ...kawaiiData,
  ...pixel3dData,
  ...emojiData,
] as BeadTemplate[];

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { favorites, isFavorite, toggleFavorite: toggleFav, clearFavorites } = useFavorites();
  const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed();
  const { showToast } = useToast();

  const toggleFavorite = useCallback((id: string) => {
    const willAdd = !isFavorite(id);
    toggleFav(id);
    showToast(willAdd ? '已加入收藏' : '已取消收藏', willAdd ? 'success' : 'info');
  }, [isFavorite, toggleFav, showToast]);

  const handleClearFavoritesWithToast = useCallback(() => {
    clearFavorites();
    showToast('已清空收藏', 'info');
  }, [clearFavorites, showToast]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // 提升到 App 层：导航到详情/收藏页再返回时，筛选/排序状态得以保留
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [gridSize, setGridSize] = useState<GridSizeFilter>('all');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Listen for hash changes to trigger re-renders on navigation
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goHome = useCallback(() => {
    // 使用 replaceState 避免 URL 残留 # 号，且不增加历史栈
    history.replaceState(null, '', location.pathname);
    setHash('/');
  }, []);

  // ESC key to go back from detail/favorites pages
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hash !== '/') {
        goHome();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hash, goHome]);

  const handleCategorySelect = useCallback((id: string) => {
    setActiveCategory(id);
  }, []);

  const handleNavigate = useCallback((targetHash: string) => {
    window.location.hash = targetHash;
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleNavigateFavorites = useCallback(() => {
    window.location.hash = 'favorites';
  }, []);

  const handleNavigateColorRef = useCallback(() => {
    window.location.hash = 'colors';
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveCategory('all');
    setSearchQuery('');
    setSortKey('default');
    setDifficulty('all');
    setGridSize('all');
  }, []);

  // Parse route
  const routeParts = hash.split('/').filter(Boolean);
  const templateId = routeParts[0] === 'template' ? routeParts[1] : undefined;
  const currentTemplate = templateId
    ? allTemplates.find(t => t.id === templateId) || null
    : null;

  // 计算上一个/下一个模板（基于全量列表顺序）
  const currentIdx = currentTemplate
    ? allTemplates.findIndex(t => t.id === currentTemplate.id)
    : -1;
  const prevTemplate = currentIdx > 0 ? allTemplates[currentIdx - 1] : null;
  const nextTemplate =
    currentIdx >= 0 && currentIdx < allTemplates.length - 1
      ? allTemplates[currentIdx + 1]
      : null;

  // 相似模板推荐：基于共同标签，排除当前模板，最多 4 个
  const relatedTemplates = useMemo(() => {
    if (!currentTemplate) return [];
    const tags = new Set(currentTemplate.tags);
    return allTemplates
      .filter(t => t.id !== currentTemplate.id)
      .map(t => ({
        template: t,
        score: t.tags.filter(tag => tags.has(tag)).length
            + (t.category === currentTemplate.category ? 1 : 0),
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(x => x.template);
  }, [currentTemplate]);

  const handleNavigateTemplate = useCallback((id: string) => {
    window.location.hash = `template/${id}`;
  }, []);

  // Track recently viewed when entering a valid detail page
  useEffect(() => {
    if (currentTemplate) {
      addRecentlyViewed(currentTemplate.id);
    }
  }, [currentTemplate, addRecentlyViewed]);

  // 动态 document.title
  useEffect(() => {
    if (currentTemplate) {
      document.title = `${currentTemplate.name} - 拼豆收集`;
    } else if (routeParts[0] === 'favorites') {
      document.title = `我的收藏 - 拼豆收集`;
    } else if (routeParts[0] === 'colors') {
      document.title = `色卡参考 - 拼豆收集`;
    } else if (routeParts[0] === 'template') {
      document.title = `模板不存在 - 拼豆收集`;
    } else {
      document.title = '拼豆收集 - Perler Bead Templates';
    }
  }, [currentTemplate, hash]);

  if (routeParts[0] === 'template' && routeParts[1]) {
    return (
      <DetailPage
        template={currentTemplate}
        onBack={goHome}
        isFavorite={currentTemplate ? isFavorite(currentTemplate.id) : false}
        onToggleFavorite={currentTemplate ? () => toggleFavorite(currentTemplate.id) : () => {}}
        onNavigateTemplate={handleNavigateTemplate}
        prevTemplate={prevTemplate}
        nextTemplate={nextTemplate}
        relatedTemplates={relatedTemplates}
      />
    );
  }

  if (routeParts[0] === 'favorites') {
    return (
      <FavoritesPage
        templates={allTemplates}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onClearFavorites={handleClearFavoritesWithToast}
        onBack={goHome}
        onNavigate={handleNavigate}
      />
    );
  }

  if (routeParts[0] === 'colors') {
    return <ColorReferencePage onBack={goHome} />;
  }

  return (
    <HomePage
      templates={allTemplates}
      categories={CATEGORIES}
      onCategorySelect={handleCategorySelect}
      activeCategory={activeCategory}
      searchQuery={searchQuery}
      onSearch={handleSearch}
      favorites={favorites}
      onToggleFavorite={toggleFavorite}
      onNavigateFavorites={handleNavigateFavorites}
      onNavigateColorRef={handleNavigateColorRef}
      onNavigateHome={goHome}
      theme={theme}
      onToggleTheme={toggleTheme}
      recentlyViewed={recentlyViewed}
      onNavigate={handleNavigate}
      onClearFilters={handleClearFilters}
      sortKey={sortKey}
      onSortKeyChange={setSortKey}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      gridSize={gridSize}
      onGridSizeChange={setGridSize}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastContainer>
          <AppContent />
          <ShortcutHelp />
        </ToastContainer>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
