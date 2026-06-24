import { useMemo, useState } from 'react';
import type { BeadTemplate, Category } from '../types/bead';
import Navbar from '../components/Navbar';
import CategoryFilter from '../components/CategoryFilter';
import TemplateCard from '../components/TemplateCard';
import { ChevronDown } from 'lucide-react';

type SortKey = 'default' | 'name' | 'beads-asc' | 'beads-desc' | 'difficulty';

const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'name', label: '名称' },
  { value: 'beads-asc', label: '颗数 ↑' },
  { value: 'beads-desc', label: '颗数 ↓' },
  { value: 'difficulty', label: '难度' },
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
  onNavigateHome: () => void;
  theme: string;
  onToggleTheme: () => void;
  recentlyViewed: string[];
  onNavigate: (hash: string) => void;
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
  onNavigateHome,
  theme,
  onToggleTheme,
  recentlyViewed,
  onNavigate,
}: HomePageProps) {
  const [sortKey, setSortKey] = useState<SortKey>('default');

  // Map category id -> name for card labels
  const categoryNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) m[c.id] = c.name;
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const list = templates.filter(t => {
      const matchCategory = activeCategory === 'all' || t.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });

    const sorted = [...list];
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        break;
      case 'beads-asc':
        sorted.sort((a, b) => a.beadCount - b.beadCount);
        break;
      case 'beads-desc':
        sorted.sort((a, b) => b.beadCount - a.beadCount);
        break;
      case 'difficulty':
        sorted.sort(
          (a, b) =>
            (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1)
        );
        break;
    }
    return sorted;
  }, [templates, activeCategory, searchQuery, sortKey]);

  // Recently viewed templates (exclude those filtered out by current search/category)
  const recentTemplates = useMemo(() => {
    if (activeCategory !== 'all' || searchQuery) return [];
    return recentlyViewed
      .map(id => templates.find(t => t.id === id))
      .filter((t): t is BeadTemplate => Boolean(t))
      .slice(0, 6);
  }, [recentlyViewed, templates, activeCategory, searchQuery]);

  const activeCategoryName = categoryNameMap[activeCategory] || '全部';

  return (
    <div className="page home-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favorites.length}
        onNavigateFavorites={onNavigateFavorites}
        onNavigateHome={onNavigateHome}
      />

      <CategoryFilter
        categories={categories}
        active={activeCategory}
        onSelect={onCategorySelect}
      />

      <main className="home-page__content">
        {!searchQuery && activeCategory === 'all' && (
          <section className="hero">
            <h1 className="hero__title">拼豆模板收集</h1>
            <p className="hero__subtitle">
              共收录 {templates.length} 个模板 · {categories.length - 1} 个分类 · 点击卡片查看色卡与网格
            </p>
          </section>
        )}

        {recentTemplates.length > 0 && (
          <section className="recent-section">
            <h2 className="recent-section__title">最近浏览</h2>
            <div className="recent-section__list">
              {recentTemplates.map(t => (
                <button
                  key={t.id}
                  className="recent-chip"
                  onClick={() => onNavigate(`template/${t.id}`)}
                  title={t.name}
                >
                  <span className="recent-chip__name">{t.name}</span>
                  <span className="recent-chip__beads">{t.beadCount}颗</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="home-page__toolbar">
          <span className="home-page__count">
            {searchQuery ? `搜索「${searchQuery}」` : activeCategoryName}
            <span className="home-page__count-num"> · {filtered.length} 个</span>
          </span>
          <label className="home-page__sort">
            <span className="home-page__sort-label">排序</span>
            <div className="home-page__sort-select">
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                aria-label="排序方式"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="home-page__sort-icon" />
            </div>
          </label>
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
            <p className="empty-state__icon">🔍</p>
            <p className="empty-state__title">没有找到匹配的模板</p>
            <p className="empty-state__desc">试试其他关键词或分类吧</p>
          </div>
        )}
      </main>
    </div>
  );
}
