import { useState, useCallback, useEffect, useMemo } from 'react';
import HomePage, { type SortKey, type DifficultyFilter, type GridSizeFilter } from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ColorReferencePage from './pages/ColorReferencePage';
import UploadPage from './pages/UploadPage';
import EditorPage from './pages/EditorPage';
import AIGeneratePage from './pages/AIGeneratePage';
import CommunityPage from './pages/CommunityPage';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer, { useToast } from './components/ToastContainer';
import ShortcutHelp from './components/ShortcutHelp';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { useFavorites } from './hooks/useFavorites';
import { useRecentlyViewed } from './hooks/useRecentlyViewed';
import { useCustomTemplates } from './hooks/useCustomTemplates';
import { useLikes } from './hooks/useLikes';
import { useRatings } from './hooks/useRatings';
import { useProgress } from './hooks/useProgress';
import { useInventory } from './hooks/useInventory';
import { getBeadCount } from './utils/beadStats';
import { CATEGORIES } from './categories';
import type { BeadTemplate } from './types/bead';
import { downloadBackupFile, parseBackupFile, importUserData } from './utils/dataSync';
import animeData from './data/anime.json';
import pokemonData from './data/pokemon.json';
import celebrityData from './data/celebrity.json';
import foodData from './data/food.json';
import animalsData from './data/animals.json';
import holidayData from './data/holiday.json';
import kawaiiData from './data/kawaii.json';
import pixel3dData from './data/pixel3d.json';
import pixelartData from './data/pixelart.json';
import emojiData from './data/emoji.json';
import seasonalData from './data/seasonal.json';
import collabData from './data/collab.json';

// 内置模板（静态数据）
const builtinTemplates: BeadTemplate[] = [
  ...animeData,
  ...pokemonData,
  ...celebrityData,
  ...foodData,
  ...animalsData,
  ...holidayData,
  ...kawaiiData,
  ...pixel3dData,
  ...pixelartData,
  ...emojiData,
  ...seasonalData,
  ...collabData,
] as BeadTemplate[];

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { favorites, isFavorite, toggleFavorite: toggleFav, clearFavorites } = useFavorites();
  const { isLiked, toggleLike } = useLikes();
  const { getRating, setRating } = useRatings();
  const { getCompleted, toggleCell, clearProgress, getProgressPercent } = useProgress();
  const { inventory, addColor: addInventoryColor, removeColor: removeInventoryColor, clearInventory } = useInventory();
  const { recentlyViewed, addRecentlyViewed, removeRecentlyViewed } = useRecentlyViewed();
  const { templates: customTemplates, addTemplate: addCustomTemplate, removeTemplate: removeCustomTemplate } = useCustomTemplates();
  const { showToast } = useToast();
  const { t } = useTranslation();

  // 合并内置 + 自定义模板作为全量列表
  const allTemplates = useMemo(
    () => [...customTemplates, ...builtinTemplates],
    [customTemplates]
  );

  const toggleFavorite = useCallback((id: string) => {
    const willAdd = !isFavorite(id);
    toggleFav(id);
    showToast(willAdd ? t('app.toast.favorited') : t('app.toast.unfavorited'), willAdd ? 'success' : 'info');
  }, [isFavorite, toggleFav, showToast, t]);

  const handleToggleLike = useCallback((id: string) => {
    const willAdd = !isLiked(id);
    toggleLike(id);
    showToast(willAdd ? t('detail.toast.liked') : t('detail.toast.unliked'), willAdd ? 'success' : 'info');
  }, [isLiked, toggleLike, showToast, t]);

  const handleSetRating = useCallback((id: string, stars: number) => {
    const prev = getRating(id);
    setRating(id, stars);
    if (prev === stars) {
      showToast(t('detail.toast.ratingCleared'), 'info');
    } else {
      showToast(t('detail.toast.rated', { stars }), 'success');
    }
  }, [getRating, setRating, showToast, t]);

  const handleClearProgress = useCallback((id: string) => {
    clearProgress(id);
    showToast(t('detail.toast.progressCleared'), 'info');
  }, [clearProgress, showToast, t]);

  const handleClearFavoritesWithToast = useCallback(() => {
    clearFavorites();
    showToast(t('app.toast.favoritesCleared'), 'info');
  }, [clearFavorites, showToast, t]);

  // 删除自定义模板时，同步清理收藏与最近浏览，避免悬空引用
  const handleDeleteCustom = useCallback((id: string) => {
    removeCustomTemplate(id);
    if (isFavorite(id)) toggleFav(id);
    removeRecentlyViewed(id);
    showToast(t('app.toast.customDeleted'), 'info');
  }, [removeCustomTemplate, isFavorite, toggleFav, removeRecentlyViewed, showToast, t]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // 提升到 App 层：导航到详情/收藏页再返回时，筛选/排序状态得以保留
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [gridSize, setGridSize] = useState<GridSizeFilter>('all');
  const [colorFilter, setColorFilter] = useState<string | null>(null);

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
  // 注意：若当前有模态弹窗（帮助面板/确认框）打开，让弹窗优先处理 Esc，不导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || hash === '/') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      goHome();
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

  const handleNavigateUpload = useCallback(() => {
    window.location.hash = 'upload';
  }, []);

  const handleNavigateEditor = useCallback(() => {
    window.location.hash = 'editor';
  }, []);

  const handleNavigateAi = useCallback(() => {
    window.location.hash = 'ai';
  }, []);

  const handleNavigateCommunity = useCallback(() => {
    window.location.hash = 'community';
  }, []);

  // 数据导出：下载 JSON 备份文件
  const handleExportData = useCallback(() => {
    try {
      downloadBackupFile();
      showToast(t('app.toast.exported'), 'success');
    } catch {
      showToast(t('app.toast.exportFailed'), 'error');
    }
  }, [showToast, t]);

  // 数据导入：读取 JSON 文件并合并
  const handleImportData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const payload = parseBackupFile(text);
      if (!payload) {
        showToast(t('app.toast.invalidFile'), 'error');
        return;
      }
      const result = importUserData(payload, 'merge');
      if (result.success) {
        showToast(
          t(result.messageKey, {
            fav: result.counts.favorites,
            recent: result.counts.recentlyViewed,
            custom: result.counts.customTemplates,
            likes: result.counts.likes,
            ratings: result.counts.ratings,
            progress: result.counts.progress,
          }),
          'success'
        );
      } else {
        showToast(t(result.messageKey), 'error');
      }
    };
    reader.onerror = () => showToast(t('app.toast.fileReadFailed'), 'error');
    reader.readAsText(file);
  }, [showToast, t]);

  const handleClearFilters = useCallback(() => {
    setActiveCategory('all');
    setSearchQuery('');
    setSortKey('default');
    setDifficulty('all');
    setGridSize('all');
    setColorFilter(null);
  }, []);

  // Parse route
  const routeParts = hash.split('/').filter(Boolean);
  const templateId = routeParts[0] === 'template' ? routeParts[1] : undefined;
  const currentTemplate = templateId
    ? allTemplates.find(tpl => tpl.id === templateId) || null
    : null;

  // 计算上一个/下一个模板（基于全量列表顺序）
  const currentIdx = currentTemplate
    ? allTemplates.findIndex(tpl => tpl.id === currentTemplate.id)
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
      .filter(tpl => tpl.id !== currentTemplate.id)
      .map(tpl => ({
        template: tpl,
        score: tpl.tags.filter(tag => tags.has(tag)).length
            + (tpl.category === currentTemplate.category ? 1 : 0),
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(x => x.template);
  }, [currentTemplate, allTemplates]);

  // 缓存 completedCells 引用，避免 progress 未变时每次 render 产生新 Set 导致子组件重渲染
  // getCompleted 内部依赖 progress，progress 变化时 getCompleted 引用更新即可触发重算
  const completedCells = useMemo(
    () => currentTemplate ? getCompleted(currentTemplate.id) : new Set<string>(),
    [currentTemplate?.id, getCompleted]
  );

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
      document.title = t('app.title.detail', { name: currentTemplate.name });
    } else if (routeParts[0] === 'favorites') {
      document.title = t('app.title.favorites');
    } else if (routeParts[0] === 'colors') {
      document.title = t('app.title.colorRef');
    } else if (routeParts[0] === 'upload') {
      document.title = t('app.title.upload');
    } else if (routeParts[0] === 'editor') {
      document.title = t('editor.title');
    } else if (routeParts[0] === 'ai') {
      document.title = t('ai.title');
    } else if (routeParts[0] === 'community') {
      document.title = t('community.title');
    } else if (routeParts[0] === 'template') {
      document.title = t('app.title.notFound');
    } else {
      document.title = t('app.title.default');
    }
  }, [currentTemplate, hash, t]);

  // 监听 Service Worker 更新事件，提示用户刷新
  useEffect(() => {
    const onSWUpdate = () => {
      showToast(t('app.toast.updateAvailable'), 'info');
    };
    window.addEventListener('sw:update-available', onSWUpdate);
    return () => window.removeEventListener('sw:update-available', onSWUpdate);
  }, [showToast, t]);

  if (routeParts[0] === 'template' && routeParts[1]) {
    return (
      <DetailPage
        template={currentTemplate}
        onBack={goHome}
        isFavorite={currentTemplate ? isFavorite(currentTemplate.id) : false}
        onToggleFavorite={currentTemplate ? () => toggleFavorite(currentTemplate.id) : () => {}}
        isLiked={currentTemplate ? isLiked(currentTemplate.id) : false}
        onToggleLike={currentTemplate ? () => handleToggleLike(currentTemplate.id) : () => {}}
        rating={currentTemplate ? getRating(currentTemplate.id) : 0}
        onSetRating={currentTemplate ? (stars: number) => handleSetRating(currentTemplate.id, stars) : () => {}}
        completedCells={completedCells}
        onToggleCell={currentTemplate ? (row: number, col: number) => toggleCell(currentTemplate.id, row, col) : () => {}}
        onClearProgress={currentTemplate ? () => handleClearProgress(currentTemplate.id) : () => {}}
        progressPercent={currentTemplate ? getProgressPercent(currentTemplate.id, getBeadCount(currentTemplate)) : 0}
        inventory={inventory}
        onAddInventoryColor={addInventoryColor}
        onRemoveInventoryColor={removeInventoryColor}
        onClearInventory={clearInventory}
        onNavigateTemplate={handleNavigateTemplate}
        prevTemplate={prevTemplate}
        nextTemplate={nextTemplate}
        relatedTemplates={relatedTemplates}
        onDeleteCustom={handleDeleteCustom}
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
        onExportData={handleExportData}
        onImportData={handleImportData}
      />
    );
  }

  if (routeParts[0] === 'colors') {
    return <ColorReferencePage onBack={goHome} />;
  }

  if (routeParts[0] === 'upload') {
    return (
      <UploadPage
        onBack={goHome}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
        favoritesCount={favorites.length}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateColorRef={handleNavigateColorRef}
        onNavigateUpload={handleNavigateUpload}
        onNavigateEditor={handleNavigateEditor}
        onNavigateAi={handleNavigateAi}
        onNavigateCommunity={handleNavigateCommunity}
        onNavigateHome={goHome}
        searchQuery={searchQuery}
        onSaveTemplate={addCustomTemplate}
      />
    );
  }

  if (routeParts[0] === 'editor') {
    // 编辑器可基于已有模板编辑（routeParts[1] = 模板 id），或空白新建
    const editBase = routeParts[1] ? allTemplates.find(t => t.id === routeParts[1]) : undefined;
    // 支持 AI 生成后通过 sessionStorage 传入草稿
    const draft = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('editor-draft') : null;
    let draftTemplate: BeadTemplate | undefined;
    if (draft) {
      try {
        draftTemplate = JSON.parse(draft) as BeadTemplate;
        sessionStorage.removeItem('editor-draft');
      } catch {
        // ignore parse error
      }
    }
    return (
      <EditorPage
        initialTemplate={editBase ?? draftTemplate}
        onBack={goHome}
        onSave={addCustomTemplate}
        onNavigate={handleNavigate}
      />
    );
  }

  if (routeParts[0] === 'ai') {
    return (
      <AIGeneratePage
        onBack={goHome}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
        favoritesCount={favorites.length}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateColorRef={handleNavigateColorRef}
        onNavigateUpload={handleNavigateUpload}
        onNavigateEditor={handleNavigateEditor}
        onNavigateAi={handleNavigateAi}
        onNavigateCommunity={handleNavigateCommunity}
        onNavigateHome={goHome}
        searchQuery={searchQuery}
        templates={allTemplates}
        onSaveTemplate={addCustomTemplate}
      />
    );
  }

  if (routeParts[0] === 'community') {
    return (
      <CommunityPage
        onBack={goHome}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
        favoritesCount={favorites.length}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateColorRef={handleNavigateColorRef}
        onNavigateUpload={handleNavigateUpload}
        onNavigateEditor={handleNavigateEditor}
        onNavigateHome={goHome}
        onNavigateAi={handleNavigateAi}
        onNavigateCommunity={handleNavigateCommunity}
        searchQuery={searchQuery}
        templates={allTemplates}
        onSaveTemplate={addCustomTemplate}
      />
    );
  }

  // 未知路由：显示 404 空状态
  if (routeParts.length > 0 && !['template', 'favorites', 'colors', 'upload', 'editor', 'ai', 'community'].includes(routeParts[0])) {
    return (
      <div className="page">
        <main id="main-content" className="empty-state" tabIndex={-1}>
          <p className="empty-state__icon" aria-hidden="true">🧭</p>
          <p className="empty-state__title">{t('app.404.title')}</p>
          <p className="empty-state__desc">{t('app.404.desc')}</p>
          <button type="button" className="empty-state__action" onClick={goHome}>
            {t('app.404.backHome')}
          </button>
        </main>
      </div>
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
      onNavigateColorRef={handleNavigateColorRef}
      onNavigateHome={goHome}
      onNavigateUpload={handleNavigateUpload}
      onNavigateEditor={handleNavigateEditor}
      onNavigateAi={handleNavigateAi}
      onNavigateCommunity={handleNavigateCommunity}
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
      colorFilter={colorFilter}
      onColorFilterChange={setColorFilter}
    />
  );
}

function SkipLink() {
  const { t } = useTranslation();
  const handleSkip = () => {
    const el = document.getElementById('main-content');
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'start' });
    }
  };
  return (
    <button type="button" className="skip-link" onClick={handleSkip}>
      {t('common.skipToMain')}
    </button>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <SkipLink />
          <ToastContainer>
            <AppContent />
            <ShortcutHelp />
          </ToastContainer>
        </ErrorBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
}
