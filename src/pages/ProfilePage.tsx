import { useMemo, useRef, useCallback } from 'react';
import type { BeadTemplate } from '../types/bead';
import type { InventoryItem } from '../hooks/useInventory';
import Navbar from '../components/Navbar';
import TemplateCard from '../components/TemplateCard';
import AchievementBadges from '../components/AchievementBadges';
import { useAchievements } from '../hooks/useAchievements';
import { ArrowLeft, Download, Upload, Heart, Star, Eye, Palette, Layers, Clock, Trophy, TrendingUp } from 'lucide-react';
import { getBeadCount } from '../utils/beadStats';
import { useTranslation } from '../context/LanguageContext';
import { CATEGORIES } from '../categories';
import { useNavigation } from '../context/NavigationContext';

interface ProfilePageProps {
  templates: BeadTemplate[];
  favorites: string[];
  likes: string[];
  ratings: Record<string, number>;
  recentlyViewed: string[];
  customTemplates: BeadTemplate[];
  inventory: InventoryItem[];
  progress: Record<string, string[]>;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

interface StatCard {
  key: string;
  value: number | string;
  icon: typeof Heart;
  color: string;
}

/** 横向条形图行 */
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="profile-bar-row">
      <span className="profile-bar-label">{label}</span>
      <div className="profile-bar-track" aria-hidden="true">
        <div className="profile-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="profile-bar-value" aria-hidden="true">{value}</span>
    </div>
  );
}

export default function ProfilePage({
  templates,
  favorites,
  likes,
  ratings,
  recentlyViewed,
  customTemplates,
  inventory,
  progress,
  onExportData,
  onImportData,
}: ProfilePageProps) {
  const nav = useNavigation();
  const {
    navigate,
    goHome,
    navigateTo,
    searchQuery,
    onSearch,
    theme,
    onToggleTheme,
    favoritesCount,
  } = nav;
  const importInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { badges, unlockedCount, record, resetAchievements } = useAchievements();

  // 模板查找表
  const templateMap = useMemo(() => {
    const m = new Map<string, BeadTemplate>();
    templates.forEach(tpl => m.set(tpl.id, tpl));
    return m;
  }, [templates]);

  // 评分分布（1-5 星）
  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]; // 1-5 星
    Object.values(ratings).forEach(r => {
      if (r >= 1 && r <= 5) dist[r - 1]++;
    });
    return dist;
  }, [ratings]);

  // 收藏分类分布
  const categoryDist = useMemo(() => {
    const dist = new Map<string, number>();
    favorites.forEach(id => {
      const tpl = templateMap.get(id);
      if (tpl) {
        dist.set(tpl.category, (dist.get(tpl.category) ?? 0) + 1);
      }
    });
    return Array.from(dist.entries()).sort((a, b) => b[1] - a[1]);
  }, [favorites, templateMap]);

  // 进度分布：统计卡与列表均只看收藏中的模板，保持口径一致
  const progressStats = useMemo(() => {
    const favSet = new Set(favorites);
    let inProgress = 0;        // 收藏中且进行中
    let completed = 0;          // 收藏中且已完成
    const inProgressList: { template: BeadTemplate; percent: number }[] = []; // 收藏中的进行中
    Object.entries(progress).forEach(([id, cells]) => {
      if (!favSet.has(id)) return;  // 仅统计收藏中的
      const tpl = templateMap.get(id);
      if (!tpl) return;
      const total = getBeadCount(tpl);
      const done = cells.length;
      const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
      if (pct >= 100) {
        completed++;
      } else if (pct > 0) {
        inProgress++;
        inProgressList.push({ template: tpl, percent: pct });
      }
    });
    inProgressList.sort((a, b) => b.percent - a.percent);
    // 未开始 = 收藏中但没有进度记录的模板数
    const notStarted = favorites.filter(id => !progress[id] || progress[id].length === 0).length;
    return { inProgress, completed, notStarted, inProgressList: inProgressList.slice(0, 6) };
  }, [progress, templateMap, favorites]);

  // 最近收藏（按 favorites 数组顺序，前 4 个，最新在前）
  const recentFavorites = useMemo(() => {
    return favorites.slice(0, 4)
      .map(id => templateMap.get(id))
      .filter((tpl): tpl is BeadTemplate => !!tpl);
  }, [favorites, templateMap]);

  // 分类名称查找
  const getCategoryName = useCallback((catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.name : catId;
  }, []);

  // 累计制作时长格式化
  const formatDuration = useCallback((seconds: number) => {
    if (seconds <= 0) return '0';
    if (seconds < 3600) {
      const m = Math.round(seconds / 60);
      return `${m} ${t('profile.minute')}`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h} ${t('profile.hour')} ${m} ${t('profile.minute')}` : `${h} ${t('profile.hour')}`;
  }, [t]);

  // 统计卡片
  const stats: StatCard[] = [
    { key: 'favorites', value: favorites.length, icon: Heart, color: '#ef4444' },
    { key: 'likes', value: likes.length, icon: Star, color: '#f59e0b' },
    { key: 'ratings', value: Object.keys(ratings).length, icon: Star, color: '#8b5cf6' },
    { key: 'recent', value: recentlyViewed.length, icon: Eye, color: '#3b82f6' },
    { key: 'custom', value: customTemplates.length, icon: Layers, color: '#10b981' },
    { key: 'inventory', value: inventory.length, icon: Palette, color: '#ec4899' },
    { key: 'inProgress', value: progressStats.inProgress, icon: Clock, color: '#f97316' },
    { key: 'completed', value: progressStats.completed, icon: Trophy, color: '#0071e3' },
  ];

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportData(file);
    e.target.value = '';
  }, [onImportData]);

  const maxRating = Math.max(1, ...ratingDist);
  const maxCategory = Math.max(1, ...categoryDist.map(c => c[1]));

  return (
    <div className="page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favoritesCount}
        onNavigateFavorites={() => navigateTo('favorites')}
        onNavigateColorRef={() => navigateTo('colors')}
        onNavigateUpload={() => navigateTo('upload')}
        onNavigateEditor={() => navigateTo('editor')}
        onNavigateAi={() => navigateTo('ai')}
        onNavigateCommunity={() => navigateTo('community')}
        onNavigateHome={goHome}
        searchQuery={searchQuery}
      />

      <main id="main-content" className="profile-page" tabIndex={-1}>
        {/* 页头 */}
        <header className="profile-header">
          <button type="button" className="back-btn" onClick={goHome} aria-label={t('common.back')}>
            <ArrowLeft size={20} />
          </button>
          <div className="profile-header__text">
            <h1 className="profile-header__title">{t('profile.title')}</h1>
            <p className="profile-header__subtitle">{t('profile.subtitle')}</p>
          </div>
          <div className="profile-header__actions">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              className="profile-header__btn"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={16} aria-hidden="true" />
              <span>{t('profile.import')}</span>
            </button>
            <button type="button" className="profile-header__btn" onClick={onExportData}>
              <Download size={16} aria-hidden="true" />
              <span>{t('profile.export')}</span>
            </button>
          </div>
        </header>

        {/* 概览统计卡片 */}
        <section className="profile-stats-grid" aria-label={t('profile.subtitle')}>
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="profile-stat-card" style={{ ['--stat-color' as string]: s.color }}>
                <div className="profile-stat-card__icon" aria-hidden="true">
                  <Icon size={20} />
                </div>
                <div className="profile-stat-card__value">{s.value}</div>
                <div className="profile-stat-card__label">{t(`profile.stat.${s.key}`)}</div>
              </div>
            );
          })}
        </section>

        {/* 累计制作时长 + 总拼豆 */}
        <section className="profile-summary-bar" aria-label={t('profile.stat.totalBeads')}>
          <div className="profile-summary-item">
            <TrendingUp size={18} aria-hidden="true" />
            <span className="profile-summary-item__label">{t('profile.stat.totalSeconds')}</span>
            <span className="profile-summary-item__value">{formatDuration(record.totalSeconds)}</span>
          </div>
          <div className="profile-summary-item">
            <Layers size={18} aria-hidden="true" />
            <span className="profile-summary-item__label">{t('profile.stat.totalCompletions')}</span>
            <span className="profile-summary-item__value">{record.totalCompletions}</span>
          </div>
        </section>

        {/* 成就徽章 */}
        <AchievementBadges
          badges={badges}
          unlockedCount={unlockedCount}
          onReset={resetAchievements}
        />

        {/* 数据可视化 */}
        <section className="profile-charts" aria-label={t('profile.charts.title')}>
          <h2 className="profile-charts__title">
            <TrendingUp size={20} aria-hidden="true" />
            {t('profile.charts.title')}
          </h2>
          <div className="profile-charts__grid">
            {/* 评分分布 */}
            <div className="profile-chart-card">
              <h3 className="profile-chart-card__title">{t('profile.charts.ratingDist')}</h3>
              {ratingDist.every(c => c === 0) ? (
                <p className="profile-chart-empty">{t('profile.charts.empty')}</p>
              ) : (
                <div className="profile-bar-list">
                  {ratingDist.map((count, i) => (
                    <BarRow
                      key={i}
                      label={`${i + 1} ★`}
                      value={count}
                      max={maxRating}
                      color={`hsl(${42 + i * 8}, 90%, ${60 - i * 4}%)`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 分类分布 */}
            <div className="profile-chart-card">
              <h3 className="profile-chart-card__title">{t('profile.charts.categoryDist')}</h3>
              {categoryDist.length === 0 ? (
                <p className="profile-chart-empty">{t('profile.charts.empty')}</p>
              ) : (
                <div className="profile-bar-list">
                  {categoryDist.slice(0, 8).map(([catId, count]) => (
                    <BarRow
                      key={catId}
                      label={getCategoryName(catId)}
                      value={count}
                      max={maxCategory}
                      color="var(--accent)"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 进度分布 */}
            <div className="profile-chart-card">
              <h3 className="profile-chart-card__title">{t('profile.charts.progressDist')}</h3>
              {favorites.length === 0 ? (
                <p className="profile-chart-empty">{t('profile.charts.empty')}</p>
              ) : (
                <div className="profile-bar-list">
                  <BarRow
                    label={t('profile.charts.progressNotStarted')}
                    value={progressStats.notStarted}
                    max={Math.max(1, favorites.length)}
                    color="#d2d2d7"
                  />
                  <BarRow
                    label={t('profile.charts.progressInProgress')}
                    value={progressStats.inProgress}
                    max={Math.max(1, favorites.length)}
                    color="#f97316"
                  />
                  <BarRow
                    label={t('profile.charts.progressCompleted')}
                    value={progressStats.completed}
                    max={Math.max(1, favorites.length)}
                    color="#34c759"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 进行中的制作 */}
        <section className="profile-section" aria-label={t('profile.inProgress.title')}>
          <h2 className="profile-section__title">
            <Clock size={20} aria-hidden="true" />
            {t('profile.inProgress.title')}
          </h2>
          {progressStats.inProgressList.length === 0 ? (
            <div className="profile-section__empty">
              <Clock size={32} aria-hidden="true" className="profile-section__empty-icon" />
              <p className="profile-section__empty-text">{t('profile.inProgress.empty')}</p>
              <button type="button" className="profile-section__empty-cta" onClick={goHome}>
                {t('profile.inProgress.cta')}
              </button>
            </div>
          ) : (
            <ul className="profile-progress-list">
              {progressStats.inProgressList.map(({ template, percent }) => (
                <li key={template.id}>
                  <button
                    type="button"
                    className="profile-progress-item"
                    onClick={() => navigate(`template/${template.id}`)}
                  >
                    <span className="profile-progress-item__name">{template.name}</span>
                    <div className="profile-progress-item__track" aria-hidden="true">
                      <div className="profile-progress-item__fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="profile-progress-item__percent">{percent}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 最近收藏 */}
        <section className="profile-section" aria-label={t('profile.recentFav.title')}>
          <div className="profile-section__header">
            <h2 className="profile-section__title">
              <Heart size={20} aria-hidden="true" />
              {t('profile.recentFav.title')}
            </h2>
            {favorites.length > 0 && (
              <button
                type="button"
                className="profile-section__link"
                onClick={() => navigateTo('favorites')}
              >
                {t('profile.inProgress.viewAll')}
              </button>
            )}
          </div>
          {recentFavorites.length === 0 ? (
            <div className="profile-section__empty">
              <Heart size={32} aria-hidden="true" className="profile-section__empty-icon" />
              <p className="profile-section__empty-text">{t('profile.recentFav.empty')}</p>
              <button type="button" className="profile-section__empty-cta" onClick={goHome}>
                {t('profile.recentFav.cta')}
              </button>
            </div>
          ) : (
            <div className="template-grid">
              {recentFavorites.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onClick={() => navigate(`template/${tpl.id}`)}
                  isFavorite
                  onToggleFavorite={() => {}}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
