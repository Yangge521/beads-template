import { useState, useCallback, useEffect, useMemo } from 'react';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useFavorites } from './hooks/useFavorites';
import { useRecentlyViewed } from './hooks/useRecentlyViewed';
import { CATEGORIES } from './categories';
import type { BeadTemplate } from './types/bead';
import animeData from './data/anime.json';
import pokemonData from './data/pokemon.json';
import foodData from './data/food.json';
import animalsData from './data/animals.json';
import holidayData from './data/holiday.json';
import kawaiiData from './data/kawaii.json';
import pixel3dData from './data/pixel3d.json';
import emojiData from './data/emoji.json';

const allTemplates: BeadTemplate[] = [
  ...animeData,
  ...pokemonData,
  ...foodData,
  ...animalsData,
  ...holidayData,
  ...kawaiiData,
  ...pixel3dData,
  ...emojiData,
] as BeadTemplate[];

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { favorites, isFavorite, toggleFavorite, clearFavorites } = useFavorites();
  const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleClearFilters = useCallback(() => {
    setActiveCategory('all');
    setSearchQuery('');
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
    } else if (routeParts[0] === 'template') {
      document.title = `模板不存在 - 拼豆收集`;
    } else {
      document.title = '拼豆收集 - Perler Bead Templates';
    }
  }, [currentTemplate, routeParts]);

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
        onClearFavorites={clearFavorites}
        onBack={goHome}
        onNavigate={handleNavigate}
      />
    );
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
      onNavigateHome={goHome}
      theme={theme}
      onToggleTheme={toggleTheme}
      recentlyViewed={recentlyViewed}
      onNavigate={handleNavigate}
      onClearFilters={handleClearFilters}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
