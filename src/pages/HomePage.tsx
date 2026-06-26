import { useMemo, useState, useEffect, useRef } from 'react';
import type { BeadTemplate, Category } from '../types/bead';
import Navbar from '../components/Navbar';
import CategoryFilter from '../components/CategoryFilter';
import TemplateCard from '../components/TemplateCard';
import { getBeadCount } from '../utils/beadStats';
import { ChevronDown, X, Check, Upload } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

export type SortKey = 'default' | 'name' | 'beads-asc' | 'beads-desc' | 'difficulty';
export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
export type GridSizeFilter = 'all' | 'small' | 'medium' | 'large';
const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

function getGridMaxDim(t: BeadTemplate): number {
  const rows = t.grid.length;
  const cols = rows > 0 ? t.grid[0].length : 0;
  return Math.max(rows, cols);
}

function matchGridSize(t: BeadTemplate, size: GridSizeFilter): boolean {
  if (size === 'all') return true;
  const dim = getGridMaxDim(t);
  if (size === 'small') return dim <= 16;
  if (size === 'medium') return dim >= 17 && dim <= 29;
  return dim >= 30;
}

// label 字段存储翻译键，渲染时通过 t() 解析
const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'home.sort.default' },
  { value: 'name', label: 'home.sort.name' },
  { value: 'beads-asc', label: 'home.sort.beadsAsc' },
  { value: 'beads-desc', label: 'home.sort.beadsDesc' },
  { value: 'difficulty', label: 'home.sort.difficulty' },
];

const difficultyFilters: { value: DifficultyFilter; label: string; color: string }[] = [
  { value: 'all', label: 'difficulty.all', color: 'var(--text)' },
  { value: 'easy', label: 'difficulty.easy', color: '#22c55e' },
  { value: 'medium', label: 'difficulty.medium', color: '#f59e0b' },
  { value: 'hard', label: 'difficulty.hard', color: '#ef4444' },
];

interface HomePageProps {
  templates: BeadTemplate[];
  categories: Category[];
  onCategorySelect: (id: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearch: (q: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onNavigateFavorites: () => void;
  onNavigateColorRef: () => void;
  onNavigateHome: () => void;
  onNavigateUpload: () => void;
  onNavigateEditor: () => void;
  theme: string;
  onToggleTheme: () => void;
  recentlyViewed: string[];
  onNavigate: (hash: string) => void;
  onClearFilters: () => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  difficulty: DifficultyFilter;
  onDifficultyChange: (d: DifficultyFilter) => void;
  gridSize: GridSizeFilter;
  onGridSizeChange: (s: GridSizeFilter) => void;
  colorFilter: string | null;
  onColorFilterChange: (hex: string | null) => void;
}

export default function HomePage({
  templates,
  categories,
  onCategorySelect,
  activeCategory,
  searchQuery,
  onSearch,
  favorites,
  onToggleFavorite,
  onNavigateFavorites,
  onNavigateColorRef,
  onNavigateHome,
  onNavigateUpload,
  onNavigateEditor,
  theme,
  onToggleTheme,
  recentlyViewed,
  onNavigate,
  onClearFilters,
  sortKey,
  onSortKeyChange,
  difficulty,
  onDifficultyChange,
  gridSize,
  onGridSizeChange,
  colorFilter,
  onColorFilterChange,
}: HomePageProps) {
  const { t, lang } = useTranslation();

  // Map category id -> name for card labels（通过 t() 解析分类名）
  const categoryNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) m[c.id] = t(`category.${c.id}.name`);
    return m;
  }, [categories, t]);

  // 分类计数（不受搜索/难度影响，反映每个分类的总量）
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { all: templates.length };
    for (const t of templates) m[t.category] = (m[t.category] || 0) + 1;
    return m;
  }, [templates]);

  const filtered = useMemo(() => {
    const list = templates.filter(t => {
      const matchCategory = activeCategory === 'all' || t.category === activeCategory;
      const matchDifficulty = difficulty === 'all' || t.difficulty === difficulty;
      const matchGrid = matchGridSize(t, gridSize);
      const matchColor = !colorFilter || t.colors.some(c => c.hex.toLowerCase() === colorFilter.toLowerCase());
      const matchSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchDifficulty && matchGrid && matchColor && matchSearch;
    });

    const sorted = [...list];
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, lang));
        break;
      case 'beads-asc':
        sorted.sort((a, b) => getBeadCount(a) - getBeadCount(b));
        break;
      case 'beads-desc':
        sorted.sort((a, b) => getBeadCount(b) - getBeadCount(a));
        break;
      case 'difficulty':
        sorted.sort(
          (a, b) =>
            (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1)
        );
        break;
    }
    return sorted;
  }, [templates, activeCategory, searchQuery, sortKey, difficulty, gridSize, colorFilter, lang]);

  // 最近浏览：仅在无任何筛选时显示，避免与下方筛选结果不一致造成混淆
  const recentTemplates = useMemo(() => {
    const hasFilter =
      activeCategory !== 'all' ||
      !!searchQuery ||
      difficulty !== 'all' ||
      gridSize !== 'all' ||
      !!colorFilter;
    if (hasFilter) return [];
    return recentlyViewed
      .map(id => templates.find(t => t.id === id))
      .filter((t): t is BeadTemplate => Boolean(t))
      .slice(0, 6);
  }, [recentlyViewed, templates, activeCategory, searchQuery, difficulty, gridSize, colorFilter]);

  const activeCategoryName = categoryNameMap[activeCategory] || t('category.all.name');

  // 收集所有模板中出现过的颜色（去重，按 hex 排序），用于颜色筛选
  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of templates) {
      for (const c of t.colors) {
        if (!map.has(c.hex)) map.set(c.hex, c.name);
      }
    }
    return Array.from(map.entries())
      .map(([hex, name]) => ({ hex, name }))
      .sort((a, b) => a.hex.localeCompare(b.hex));
  }, [templates]);

  // hero 区统计：总颗数与去重颜色数
  const totalBeads = useMemo(
    () => templates.reduce((sum, t) => sum + getBeadCount(t), 0),
    [templates]
  );
  const totalColors = useMemo(() => availableColors.length, [availableColors]);

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorFilterRef = useRef<HTMLDivElement>(null);

  // 点击外部或按 ESC 关闭颜色筛选下拉
  useEffect(() => {
    if (!colorPickerOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (colorFilterRef.current && !colorFilterRef.current.contains(e.target as Node)) {
        setColorPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColorPickerOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [colorPickerOpen]);

  const handleClearFilters = () => {
    onDifficultyChange('all');
    onSortKeyChange('default');
    onGridSizeChange('all');
    onColorFilterChange(null);
    onClearFilters();
  };

  return (
    <div className="page home-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favorites.length}
        onNavigateFavorites={onNavigateFavorites}
        onNavigateColorRef={onNavigateColorRef}
        onNavigateUpload={onNavigateUpload}
        onNavigateEditor={onNavigateEditor}
        onNavigateHome={onNavigateHome}
        searchQuery={searchQuery}
      />

      <CategoryFilter
        categories={categories}
        active={activeCategory}
        onSelect={onCategorySelect}
        counts={categoryCounts}
      />

      <main id="main-content" className="home-page__content" tabIndex={-1}>
        {!searchQuery && activeCategory === 'all' && (
          <section className="hero">
            <h1 className="hero__title"><span aria-hidden="true">🔴 </span>{t('home.hero.title')}</h1>
            <p className="hero__subtitle">
              {t('home.hero.subtitle')}
            </p>
            <div className="hero__stats">
              <div className="hero__stat">
                <span className="hero__stat-value">{templates.length}</span>
                <span className="hero__stat-label">{t('home.hero.stat.templates')}</span>
              </div>
              <div className="hero__stat-divider" aria-hidden="true" />
              <div className="hero__stat">
                <span className="hero__stat-value">{categories.length - 1}</span>
                <span className="hero__stat-label">{t('home.hero.stat.categories')}</span>
              </div>
              <div className="hero__stat-divider" aria-hidden="true" />
              <div className="hero__stat">
                <span className="hero__stat-value">{totalBeads}</span>
                <span className="hero__stat-label">{t('home.hero.stat.totalBeads')}</span>
              </div>
              <div className="hero__stat-divider" aria-hidden="true" />
              <div className="hero__stat">
                <span className="hero__stat-value">{totalColors}</span>
                <span className="hero__stat-label">{t('home.hero.stat.colors')}</span>
              </div>
            </div>
            <div className="hero__features">
              <span className="hero__feature"><span aria-hidden="true">🔍 </span>{t('home.hero.feature.search')}</span>
              <span className="hero__feature"><span aria-hidden="true">🎨 </span>{t('home.hero.feature.colorRef')}</span>
              <span className="hero__feature"><span aria-hidden="true">❤️ </span>{t('home.hero.feature.favorites')}</span>
              <span className="hero__feature"><span aria-hidden="true">🖨️ </span>{t('home.hero.feature.materialList')}</span>
              <span className="hero__feature"><span aria-hidden="true">🌓 </span>{t('home.hero.feature.theme')}</span>
              <span className="hero__feature"><span aria-hidden="true">⌨️ </span>{t('home.hero.feature.shortcuts')}</span>
            </div>
            <button
              type="button"
              className="hero__upload-btn"
              onClick={onNavigateUpload}
            >
              <Upload size={18} />
              <span>{t('home.hero.upload')}</span>
            </button>
          </section>
        )}

        {recentTemplates.length > 0 && (
          <section className="recent-section">
            <h2 className="recent-section__title">{t('home.recent.title')}</h2>
            <div className="recent-section__list">
              {recentTemplates.map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  className="recent-chip"
                  onClick={() => onNavigate(`template/${rt.id}`)}
                  title={rt.name}
                >
                  <span className="recent-chip__name">{rt.name}</span>
                  <span className="recent-chip__beads">{t('home.recent.beads', { count: rt.beadCount })}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="home-page__toolbar">
          <span className="home-page__count" aria-live="polite" aria-atomic="true">
            {searchQuery ? t('home.toolbar.searchFor', { query: searchQuery }) : activeCategoryName}
            <span className="home-page__count-num">{t('home.toolbar.resultCount', { count: filtered.length })}</span>
          </span>
          <div className="home-page__toolbar-right">
            <div className="difficulty-filter" role="group" aria-label={t('home.toolbar.ariaLabel.difficulty')}>
              {difficultyFilters.map(d => (
                <button
                  key={d.value}
                  type="button"
                  className={`difficulty-pill ${difficulty === d.value ? 'difficulty-pill--active' : ''}`}
                  onClick={() => onDifficultyChange(d.value)}
                  style={difficulty === d.value ? { borderColor: d.color, color: d.color } : {}}
                  aria-pressed={difficulty === d.value}
                >
                  {t(d.label)}
                </button>
              ))}
            </div>
            <div className="color-filter" ref={colorFilterRef}>
              <div className="color-filter__trigger">
                <button
                  type="button"
                  className={`color-filter__btn ${colorFilter ? 'color-filter__btn--active' : ''}`}
                  onClick={() => setColorPickerOpen(v => !v)}
                  aria-haspopup="true"
                  aria-expanded={colorPickerOpen}
                  aria-label={t('home.toolbar.ariaLabel.colorFilter')}
                >
                  {colorFilter ? (
                    <span
                      className="color-filter__swatch"
                      style={{ backgroundColor: colorFilter }}
                    />
                  ) : (
                    <span className="color-filter__swatch color-filter__swatch--rainbow" />
                  )}
                  <span className="color-filter__label">{colorFilter ? t('home.toolbar.color.selected') : t('home.toolbar.color.byColor')}</span>
                </button>
                {colorFilter && (
                  <button
                    type="button"
                    className="color-filter__clear"
                    onClick={() => {
                      onColorFilterChange(null);
                      setColorPickerOpen(false);
                    }}
                    aria-label={t('home.toolbar.ariaLabel.clearColorFilter')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {colorPickerOpen && (
                <div className="color-filter__dropdown" role="dialog" aria-label={t('home.toolbar.ariaLabel.selectColor')}>
                  <div className="color-filter__dropdown-header">
                    <span>{t('home.toolbar.color.dropdownTitle')}</span>
                    <button
                      type="button"
                      className="color-filter__dropdown-close"
                      onClick={() => setColorPickerOpen(false)}
                      aria-label={t('home.toolbar.color.close')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="color-filter__grid">
                    {availableColors.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        className={`color-filter__option ${colorFilter === c.hex ? 'color-filter__option--active' : ''}`}
                        onClick={() => {
                          onColorFilterChange(c.hex);
                          setColorPickerOpen(false);
                        }}
                        title={`${c.name} ${c.hex}`}
                        aria-label={`${c.name} ${c.hex}`}
                      >
                        <span
                          className="color-filter__option-color"
                          style={{ backgroundColor: c.hex }}
                        >
                          {colorFilter === c.hex && (
                            <Check size={12} className="color-filter__option-check" />
                          )}
                        </span>
                        <span className="color-filter__option-name">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <label className="home-page__sort">
              <span className="home-page__sort-label">{t('common.size')}</span>
              <div className="home-page__sort-select">
                <select
                  value={gridSize}
                  onChange={e => onGridSizeChange(e.target.value as GridSizeFilter)}
                  aria-label={t('home.toolbar.ariaLabel.gridSize')}
                >
                  <option value="all">{t('home.toolbar.gridSize.all')}</option>
                  <option value="small">{t('home.toolbar.gridSize.small')}</option>
                  <option value="medium">{t('home.toolbar.gridSize.medium')}</option>
                  <option value="large">{t('home.toolbar.gridSize.large')}</option>
                </select>
                <ChevronDown size={14} className="home-page__sort-icon" />
              </div>
            </label>
            <label className="home-page__sort">
              <span className="home-page__sort-label">{t('common.sort')}</span>
              <div className="home-page__sort-select">
                <select
                  value={sortKey}
                  onChange={e => onSortKeyChange(e.target.value as SortKey)}
                  aria-label={t('home.toolbar.ariaLabel.sort')}
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="home-page__sort-icon" />
              </div>
            </label>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="template-grid">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorite={favorites.includes(template.id)}
                onToggleFavorite={() => onToggleFavorite(template.id)}
                onClick={() => {
                  window.location.hash = `template/${template.id}`;
                }}
                highlight={searchQuery}
                categoryName={activeCategory === 'all' ? categoryNameMap[template.category] : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__icon" aria-hidden="true">🔍</p>
            <p className="empty-state__title">{t('home.empty.title')}</p>
            <p className="empty-state__desc">{t('home.empty.desc')}</p>
            {(searchQuery || activeCategory !== 'all' || difficulty !== 'all' || gridSize !== 'all' || colorFilter) && (
              <button type="button" className="empty-state__action" onClick={handleClearFilters}>
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
