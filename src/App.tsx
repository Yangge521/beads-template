import { useState, useCallback, useEffect } from 'react';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import FavoritesPage from './pages/FavoritesPage';
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
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
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
    window.location.hash = '';
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

  const handleNavigate = useCallback((hash: string) => {
    window.location.hash = hash;
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleNavigateHome = useCallback(() => {
    window.location.hash = '';
  }, []);

  const handleNavigateFavorites = useCallback(() => {
    window.location.hash = 'favorites';
  }, []);

  // Parse route
  const routeParts = hash.split('/').filter(Boolean);
  const templateId = routeParts[0] === 'template' ? routeParts[1] : undefined;
  const currentTemplate = templateId
    ? allTemplates.find(t => t.id === templateId) || null
    : null;

  // Track recently viewed when entering a valid detail page
  useEffect(() => {
    if (currentTemplate) {
      addRecentlyViewed(currentTemplate.id);
    }
  }, [currentTemplate, addRecentlyViewed]);

  if (routeParts[0] === 'template' && routeParts[1]) {
    return (
      <DetailPage
        template={currentTemplate}
        onBack={goHome}
        isFavorite={currentTemplate ? isFavorite(currentTemplate.id) : false}
        onToggleFavorite={currentTemplate ? () => toggleFavorite(currentTemplate.id) : () => {}}
      />
    );
  }

  if (routeParts[0] === 'favorites') {
    return (
      <FavoritesPage
        templates={allTemplates}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
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
      onNavigateHome={handleNavigateHome}
      theme={theme}
      onToggleTheme={toggleTheme}
      recentlyViewed={recentlyViewed}
      onNavigate={handleNavigate}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
