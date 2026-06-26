import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Search, Check, Copy, X } from 'lucide-react';
import { BEAD_COLOR_GROUPS } from '../data/beadColors';
import { useToast } from '../components/ToastContainer';
import { useTranslation } from '../context/LanguageContext';

interface ColorReferencePageProps {
  onBack: () => void;
}

type BrandKey = 'perler' | 'artkal' | 'hama' | 'mixiaowo' | 'manman' | 'coco';

export default function ColorReferencePage({ onBack }: ColorReferencePageProps) {
  const [query, setQuery] = useState('');
  const [activeBrands, setActiveBrands] = useState<Set<BrandKey>>(new Set());
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t, lang } = useTranslation();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 颜色名渲染：有 nameKey 时翻译；英文环境无 nameKey 时回退到 hex（色号仍是主标识）
  const colorName = useCallback((c: { name: string; nameKey?: string; hex: string }) => {
    if (c.nameKey) return t(c.nameKey);
    return lang === 'en' ? c.hex : c.name;
  }, [t, lang]);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const brandList = Array.from(activeBrands);
    return BEAD_COLOR_GROUPS.map(group => ({
      ...group,
      colors: group.colors.filter(c => {
        // 品牌筛选：若选中了某些品牌，只保留拥有这些品牌编号的颜色
        if (brandList.length > 0 && !brandList.some(b => c[b])) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.hex.toLowerCase().includes(q) ||
          (c.perler && c.perler.toLowerCase().includes(q)) ||
          (c.artkal && c.artkal.toLowerCase().includes(q)) ||
          (c.hama && c.hama.toLowerCase().includes(q)) ||
          (c.mixiaowo && c.mixiaowo.toLowerCase().includes(q)) ||
          (c.manman && c.manman.toLowerCase().includes(q)) ||
          (c.coco && c.coco.toLowerCase().includes(q))
        );
      }),
    })).filter(g => g.colors.length > 0);
  }, [query, activeBrands]);

  const toggleBrand = useCallback((key: BrandKey) => {
    setActiveBrands(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setActiveBrands(new Set());
  }, []);

  const totalCount = useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.colors.length, 0),
    [filteredGroups]
  );

  const handleCopy = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      const timer = setTimeout(() => setCopiedHex(prev => (prev === hex ? null : prev)), 1500);
      timersRef.current.push(timer);
      showToast(t('colorRef.toast.copied', { hex }), 'success');
    } catch {
      showToast(t('colorRef.toast.copyFailed'), 'error');
    }
  }, [showToast, t]);

  const brandOptions: { key: BrandKey; labelKey: string; abbr: string }[] = [
    { key: 'perler', labelKey: 'colorRef.brand.perler', abbr: 'P' },
    { key: 'artkal', labelKey: 'colorRef.brand.artkal', abbr: 'A' },
    { key: 'hama', labelKey: 'colorRef.brand.hama', abbr: 'H' },
    { key: 'mixiaowo', labelKey: 'colorRef.brand.mixiaowo', abbr: 'M' },
    { key: 'manman', labelKey: 'colorRef.brand.manman', abbr: 'MM' },
    { key: 'coco', labelKey: 'colorRef.brand.coco', abbr: 'C' },
  ];
  const totalColorCount = useMemo(
    () => BEAD_COLOR_GROUPS.reduce((s, g) => s + g.colors.length, 0),
    []
  );

  return (
    <div className="page color-ref-page">
      <header className="color-ref-page__header">
        <button type="button" className="color-ref-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>
        <h1 className="color-ref-page__title">{t('colorRef.title')}</h1>
      </header>

      <main id="main-content" className="color-ref-page__content" tabIndex={-1}>
        <div className="color-ref-page__intro">
          <p>{t('colorRef.intro', { count: totalColorCount })}</p>
          <p className="color-ref-page__hint">{t('colorRef.hint')}</p>
        </div>

        <div className="color-ref-page__search">
          <Search size={16} className="color-ref-page__search-icon" />
          <input
            type="text"
            className="color-ref-page__search-input"
            placeholder={t('colorRef.search.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label={t('colorRef.search.ariaLabel')}
          />
          {query && (
            <button
              type="button"
              className="color-ref-page__search-clear"
              onClick={() => setQuery('')}
              aria-label={t('colorRef.search.clear')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="color-ref-page__brand-filter" role="group" aria-label={t('colorRef.brand.ariaLabel')}>
          {brandOptions.map(b => (
            <button
              key={b.key}
              type="button"
              className={`color-ref-page__brand-pill ${activeBrands.has(b.key) ? 'color-ref-page__brand-pill--active' : ''}`}
              onClick={() => toggleBrand(b.key)}
              aria-pressed={activeBrands.has(b.key)}
            >
              {t(b.labelKey)}
            </button>
          ))}
          {(activeBrands.size > 0 || query) && (
            <button
              type="button"
              className="color-ref-page__brand-reset"
              onClick={handleClearSearch}
            >
              {t('common.clearFilters')}
            </button>
          )}
        </div>

        <div className="color-ref-page__count" aria-live="polite">
          {query
            ? t('colorRef.count.search', { query, count: totalCount })
            : t('colorRef.count.all', { count: totalCount })}
        </div>

        {filteredGroups.length > 0 ? (
          <div className="color-ref-page__groups">
            {filteredGroups.map(group => (
              <section key={group.name} className="color-ref-page__group">
                <h2 className="color-ref-page__group-title">{t(group.nameKey)}</h2>
                <div className="color-ref-page__grid">
                  {group.colors.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      className="color-ref-card"
                      onClick={() => handleCopy(color.hex)}
                      title={t('colorRef.card.copyTitle', { hex: color.hex })}
                      aria-label={t('colorRef.card.ariaLabel', { hex: color.hex, name: colorName(color) })}
                    >
                      <div
                        className="color-ref-card__color"
                        style={{ backgroundColor: color.hex }}
                      >
                        {copiedHex === color.hex && (
                          <Check size={16} className="color-ref-card__check" />
                        )}
                      </div>
                      <div className="color-ref-card__info">
                        <span className="color-ref-card__name">{colorName(color)}</span>
                        <span className="color-ref-card__hex">{color.hex}</span>
                        <div className="color-ref-card__brands">
                          {brandOptions.map(b => {
                            const v = color[b.key];
                            return v ? (
                              <span key={b.key} className="color-ref-card__brand" title={t(b.labelKey)}>
                                {b.abbr}: {v}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <Copy size={14} className="color-ref-card__copy" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__icon" aria-hidden="true">🎨</p>
            <p className="empty-state__title">{t('colorRef.empty.title')}</p>
            <p className="empty-state__desc">{t('colorRef.empty.desc')}</p>
          </div>
        )}

        <div className="color-ref-page__legend">
          <h3 className="color-ref-page__legend-title">{t('colorRef.legend.title')}</h3>
          <ul className="color-ref-page__legend-list">
            {brandOptions.map(b => (
              <li key={b.key}><strong>{b.abbr}:</strong> {t(b.labelKey)}</li>
            ))}
          </ul>
          <p className="color-ref-page__note">
            {t('colorRef.legend.note')}
          </p>
        </div>
      </main>
    </div>
  );
}
