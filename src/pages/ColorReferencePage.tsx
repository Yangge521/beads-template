import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Search, Check, Copy, X } from 'lucide-react';
import { BEAD_COLOR_GROUPS } from '../data/beadColors';
import { useToast } from '../components/ToastContainer';

interface ColorReferencePageProps {
  onBack: () => void;
}

type BrandKey = 'perler' | 'artkal' | 'hama';

const brandOptions: { key: BrandKey; label: string }[] = [
  { key: 'perler', label: 'Perler' },
  { key: 'artkal', label: 'Artkal' },
  { key: 'hama', label: 'Hama' },
];

export default function ColorReferencePage({ onBack }: ColorReferencePageProps) {
  const [query, setQuery] = useState('');
  const [activeBrands, setActiveBrands] = useState<Set<BrandKey>>(new Set());
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const { showToast } = useToast();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
          (c.hama && c.hama.toLowerCase().includes(q))
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
      // 仅当当前高亮仍是该 hex 时才清除，避免连续复制时旧定时器误清新高亮
      const t = setTimeout(() => setCopiedHex(prev => (prev === hex ? null : prev)), 1500);
      timersRef.current.push(t);
      showToast(`已复制 ${hex}`, 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  }, [showToast]);

  return (
    <div className="page color-ref-page">
      <header className="color-ref-page__header">
        <button type="button" className="color-ref-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <h1 className="color-ref-page__title">拼豆色卡参考</h1>
      </header>

      <main id="main-content" className="color-ref-page__content" tabIndex={-1}>
        <div className="color-ref-page__intro">
          <p>收录 Perler、Artkal、Hama 三大主流拼豆品牌的常用色号对照，共 {BEAD_COLOR_GROUPS.reduce((s, g) => s + g.colors.length, 0)} 种颜色。</p>
          <p className="color-ref-page__hint">点击色块复制色号，支持按名称、色号、品牌编号搜索。</p>
        </div>

        <div className="color-ref-page__search">
          <Search size={16} className="color-ref-page__search-icon" />
          <input
            type="text"
            className="color-ref-page__search-input"
            placeholder="搜索颜色名称、色号或品牌编号..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="搜索颜色"
          />
          {query && (
            <button
              type="button"
              className="color-ref-page__search-clear"
              onClick={() => setQuery('')}
              aria-label="清除搜索"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="color-ref-page__brand-filter" role="group" aria-label="品牌筛选">
          {brandOptions.map(b => (
            <button
              key={b.key}
              type="button"
              className={`color-ref-page__brand-pill ${activeBrands.has(b.key) ? 'color-ref-page__brand-pill--active' : ''}`}
              onClick={() => toggleBrand(b.key)}
              aria-pressed={activeBrands.has(b.key)}
            >
              {b.label}
            </button>
          ))}
          {(activeBrands.size > 0 || query) && (
            <button
              type="button"
              className="color-ref-page__brand-reset"
              onClick={handleClearSearch}
            >
              清除筛选
            </button>
          )}
        </div>

        <div className="color-ref-page__count" aria-live="polite">
          {query ? `搜索「${query}」· ${totalCount} 种` : `共 ${totalCount} 种颜色`}
        </div>

        {filteredGroups.length > 0 ? (
          <div className="color-ref-page__groups">
            {filteredGroups.map(group => (
              <section key={group.name} className="color-ref-page__group">
                <h2 className="color-ref-page__group-title">{group.name}</h2>
                <div className="color-ref-page__grid">
                  {group.colors.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      className="color-ref-card"
                      onClick={() => handleCopy(color.hex)}
                      title={`复制 ${color.hex}`}
                      aria-label={`复制色号 ${color.hex} ${color.name}`}
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
                        <span className="color-ref-card__name">{color.name}</span>
                        <span className="color-ref-card__hex">{color.hex}</span>
                        <div className="color-ref-card__brands">
                          {color.perler && (
                            <span className="color-ref-card__brand" title="Perler">P: {color.perler}</span>
                          )}
                          {color.artkal && (
                            <span className="color-ref-card__brand" title="Artkal">A: {color.artkal}</span>
                          )}
                          {color.hama && (
                            <span className="color-ref-card__brand" title="Hama">H: {color.hama}</span>
                          )}
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
            <p className="empty-state__icon">🎨</p>
            <p className="empty-state__title">没有找到匹配的颜色</p>
            <p className="empty-state__desc">试试其他关键词吧</p>
          </div>
        )}

        <div className="color-ref-page__legend">
          <h3 className="color-ref-page__legend-title">品牌说明</h3>
          <ul className="color-ref-page__legend-list">
            <li><strong>P:</strong> Perler Beads（美国品牌，最常见）</li>
            <li><strong>A:</strong> Artkal（国产优质品牌，色号丰富）</li>
            <li><strong>H:</strong> Hama Beads（丹麦品牌，欧洲主流）</li>
          </ul>
          <p className="color-ref-page__note">
            注：色号为常见对照参考，不同批次可能有细微色差。建议购买前对照实物色卡确认。
          </p>
        </div>
      </main>
    </div>
  );
}
