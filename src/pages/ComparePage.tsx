import { useMemo } from 'react';
import type { BeadTemplate } from '../types/bead';
import Navbar from '../components/Navbar';
import PixelGrid from '../components/PixelGrid';
import { ArrowLeft, X, GitCompare } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { getBeadCount } from '../utils/beadStats';

interface ComparePageProps {
  templates: BeadTemplate[];
  compareIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
  onNavigate: (hash: string) => void;
  onNavigateTemplate: (id: string) => void;
  onNavigateHome: () => void;
  onNavigateFavorites: () => void;
  onNavigateColorRef: () => void;
  onNavigateUpload: () => void;
  onNavigateEditor: () => void;
  onNavigateAi: () => void;
  onNavigateCommunity: () => void;
  onSearch: (q: string) => void;
  theme: string;
  onToggleTheme: () => void;
  favoritesCount: number;
  searchQuery: string;
}

export default function ComparePage({
  templates, compareIds, onRemove, onClear, onBack, onNavigateTemplate,
  onNavigateHome, onNavigateFavorites, onNavigateColorRef, onNavigateUpload,
  onNavigateEditor, onNavigateAi, onNavigateCommunity, onSearch, theme, onToggleTheme,
  favoritesCount, searchQuery,
}: ComparePageProps) {
  const { t } = useTranslation();

  const items = useMemo(
    () => compareIds.map(id => templates.find(tpl => tpl.id === id)).filter((x): x is BeadTemplate => Boolean(x)),
    [templates, compareIds]
  );

  return (
    <div className="page compare-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favoritesCount}
        onNavigateFavorites={onNavigateFavorites}
        onNavigateColorRef={onNavigateColorRef}
        onNavigateUpload={onNavigateUpload}
        onNavigateEditor={onNavigateEditor}
        onNavigateAi={onNavigateAi}
        onNavigateCommunity={onNavigateCommunity}
        onNavigateHome={onNavigateHome}
        searchQuery={searchQuery}
      />
      <main id="main-content" className="compare-page__content" tabIndex={-1}>
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="compare-page__title">
          <GitCompare size={28} aria-hidden="true" /> {t('compare.title')}
        </h1>
        <p className="compare-page__subtitle">{t('compare.subtitle')}</p>

        {items.length === 0 ? (
          <div className="compare-page__empty">
            <GitCompare size={64} aria-hidden="true" className="compare-page__empty-icon" />
            <p>{t('compare.empty')}</p>
          </div>
        ) : (
          <>
            {items.length >= 2 && (
              <button
                type="button"
                className="compare-page__clear"
                onClick={onClear}
              >
                <X size={14} />
                {t('compare.clearAll')}
              </button>
            )}
            <div className={`compare-page__grid compare-page__grid--${items.length}`}>
              {items.map(tpl => {
                const beadCount = getBeadCount(tpl);
                const rows = tpl.grid.length;
                const cols = rows > 0 ? tpl.grid[0].length : 0;
                return (
                  <div key={tpl.id} className="compare-page__item">
                    <button
                      type="button"
                      className="compare-page__item-remove"
                      onClick={() => onRemove(tpl.id)}
                      aria-label={t('compare.remove')}
                    >
                      <X size={14} />
                    </button>
                    <h2
                      className="compare-page__item-name"
                      onClick={() => onNavigateTemplate(tpl.id)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') onNavigateTemplate(tpl.id); }}
                    >
                      {tpl.name}
                    </h2>
                    <div className="compare-page__item-grid">
                      <PixelGrid grid={tpl.grid} colors={tpl.colors} />
                    </div>
                    <dl className="compare-page__item-stats">
                      <div className="compare-page__stat-row">
                        <dt>{t('detail.stat.gridSize')}</dt>
                        <dd>{cols}×{rows}</dd>
                      </div>
                      <div className="compare-page__stat-row">
                        <dt>{t('detail.stat.totalBeads')}</dt>
                        <dd>{beadCount}</dd>
                      </div>
                      <div className="compare-page__stat-row">
                        <dt>{t('detail.stat.colors')}</dt>
                        <dd>{tpl.colors.length}</dd>
                      </div>
                      <div className="compare-page__stat-row">
                        <dt>{t('home.sort.difficulty')}</dt>
                        <dd>{t(`difficulty.${tpl.difficulty}`)}</dd>
                      </div>
                      <div className="compare-page__stat-row">
                        <dt>{t('detail.source.label')}</dt>
                        <dd>{tpl.source}</dd>
                      </div>
                    </dl>
                    {/* 色卡对比 */}
                    <div className="compare-page__item-palette">
                      {tpl.colors.slice(0, 12).map(c => (
                        <span
                          key={c.hex}
                          className="compare-page__swatch"
                          style={{ backgroundColor: c.hex }}
                          title={`${c.name} (${c.hex})`}
                          aria-label={c.name}
                        />
                      ))}
                      {tpl.colors.length > 12 && (
                        <span className="compare-page__swatch-more">+{tpl.colors.length - 12}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
