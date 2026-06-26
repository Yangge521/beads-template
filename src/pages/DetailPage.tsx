import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { BeadTemplate } from '../types/bead';
import PixelGrid from '../components/PixelGrid';
import FavoriteButton from '../components/FavoriteButton';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, Copy, Grid3x3, ClipboardList, Share2, Printer, Download, Trash2, FileCode } from 'lucide-react';
import { getBeadCount, getCorrectedColors } from '../utils/beadStats';
import { exportTemplateToPNG } from '../utils/exportPNG';
import { exportTemplateToSVG } from '../utils/exportSVG';
import { useToast } from '../components/ToastContainer';
import { useTranslation } from '../context/LanguageContext';

interface DetailPageProps {
  template: BeadTemplate | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onNavigateTemplate?: (id: string) => void;
  prevTemplate?: BeadTemplate | null;
  nextTemplate?: BeadTemplate | null;
  relatedTemplates?: BeadTemplate[];
  onDeleteCustom?: (id: string) => void;
}

// 难度仅保留背景色，label 运行时通过 t(`difficulty.${difficulty}`) 解析
const difficultyStyles: Record<string, { bg: string }> = {
  easy: { bg: '#22c55e' },
  medium: { bg: '#f59e0b' },
  hard: { bg: '#ef4444' },
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function DetailPage({
  template,
  onBack,
  isFavorite,
  onToggleFavorite,
  onNavigateTemplate,
  prevTemplate,
  nextTemplate,
  relatedTemplates = [],
  onDeleteCustom,
}: DetailPageProps) {
  const [zoom, setZoom] = useState(1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [colorSort, setColorSort] = useState<'count' | 'name' | 'hex'>('count');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { showToast } = useToast();
  const { t, lang } = useTranslation();

  // 所有 hooks 必须在提前 return 之前调用，避免违反 Rules of Hooks
  const beadCount = useMemo(() => (template ? getBeadCount(template) : 0), [template]);
  const correctedColors = useMemo(
    () => (template ? getCorrectedColors(template) : []),
    [template]
  );
  const maxColorCount = useMemo(
    () => correctedColors.reduce((m, c) => Math.max(m, c.count), 0),
    [correctedColors]
  );
  const sortedColors = useMemo(() => {
    const list = [...correctedColors];
    switch (colorSort) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, lang));
        break;
      case 'hex':
        list.sort((a, b) => a.hex.localeCompare(b.hex));
        break;
      case 'count':
      default:
        list.sort((a, b) => b.count - a.count);
        break;
    }
    return list;
  }, [correctedColors, colorSort, lang]);

  const scheduleReset = useCallback((setter: (v: boolean) => void) => {
    const t = setTimeout(() => setter(false), 1500);
    timersRef.current.push(t);
  }, []);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const handleShare = useCallback(async () => {
    if (!template) return;
    const url = `${window.location.origin}${window.location.pathname}#template/${template.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: template.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      scheduleReset(setCopiedLink);
      showToast(t('detail.toast.linkCopied'), 'success');
    } catch {
      // 用户取消分享或剪贴板不可用，静默处理
    }
  }, [template, scheduleReset, showToast, t]);

  const handleCopyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      // 仅当当前高亮仍是该 hex 时才清除，避免连续复制时旧定时器误清新高亮
      const timer = setTimeout(() => setCopiedHex(prev => (prev === hex ? null : prev)), 1500);
      timersRef.current.push(timer);
      showToast(t('detail.toast.hexCopied', { hex }), 'success');
    } catch {
      showToast(t('detail.toast.copyFailed'), 'error');
    }
  }, [showToast, t]);

  const handleCopyAllColors = useCallback(async () => {
    if (!template) return;
    const colors = getCorrectedColors(template);
    const text = colors
      .map(c => `${c.hex}\t${c.name}\t${t('common.beadsUnitShort', { count: c.count })}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      scheduleReset(setCopiedAll);
      showToast(t('detail.toast.colorsCopied', { count: colors.length }), 'success');
    } catch {
      showToast(t('detail.toast.copyFailed'), 'error');
    }
  }, [template, scheduleReset, showToast, t]);

  // 打印用量清单：重置缩放避免打印放大图，等待重绘后调用浏览器打印
  const handlePrintList = useCallback(() => {
    if (!template) return;
    showToast(t('detail.toast.preparingPrint'), 'info');
    setZoom(1);
    const timer = setTimeout(() => window.print(), 50);
    timersRef.current.push(timer);
  }, [template, showToast, t]);

  // 导出 PNG：把 grid 渲染到 canvas 并下载（toBlob 异步，据实反馈）
  const handleExportPNG = useCallback(async () => {
    if (!template) return;
    try {
      const ok = await exportTemplateToPNG(
        template,
        24,
        showGridLines,
        t('detail.export.fileNameSuffix')
      );
      showToast(ok ? t('detail.toast.pngExported') : t('detail.toast.exportFailed'), ok ? 'success' : 'error');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [template, showGridLines, showToast, t]);

  // 导出 SVG：矢量格式，无限缩放不失真，文件体积小
  const handleExportSVG = useCallback(() => {
    if (!template) return;
    try {
      exportTemplateToSVG(template, 24, showGridLines, t('detail.export.fileNameSuffix'));
      showToast(t('detail.toast.svgExported'), 'success');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [template, showGridLines, showToast, t]);

  // 切换模板时重置缩放并滚动到顶部
  useEffect(() => {
    setZoom(1);
    window.scrollTo({ top: 0 });
  }, [template?.id]);

  // 滚动监听，控制返回顶部按钮显示（rAF 节流）
  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setShowTop(window.scrollY > 400);
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // 左右箭头键切换模板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!onNavigateTemplate) return;
      // 忽略带修饰键的组合（如 Cmd+ArrowLeft 浏览器后退）
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && prevTemplate) {
        e.preventDefault();
        onNavigateTemplate(prevTemplate.id);
      } else if (e.key === 'ArrowRight' && nextTemplate) {
        e.preventDefault();
        onNavigateTemplate(nextTemplate.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevTemplate, nextTemplate, onNavigateTemplate]);

  if (!template) {
    return (
      <div className="page detail-page">
        <main id="main-content" className="empty-state" tabIndex={-1}>
          <p className="empty-state__icon" aria-hidden="true">😕</p>
          <p className="empty-state__title">{t('detail.empty.title')}</p>
          <p className="empty-state__desc">{t('detail.empty.desc')}</p>
          <button type="button" className="empty-state__action" onClick={onBack}>
            {t('detail.empty.backHome')}
          </button>
        </main>
      </div>
    );
  }

  const diffStyle = difficultyStyles[template.difficulty] || difficultyStyles.medium;
  const difficultyLabel = t(`difficulty.${template.difficulty}`);
  const rows = template.grid.length;
  const cols = rows > 0 ? template.grid[0].length : 0;
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);

  return (
    <div className="page detail-page">
      <header className="detail-page__header">
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('detail.back')}
        </button>
        <div className="detail-page__header-actions">
          <button
            type="button"
            className="detail-page__share-btn"
            onClick={handleShare}
            aria-label={t('detail.share.ariaLabel')}
            title={t('detail.share.title')}
          >
            {copiedLink ? <Check size={20} /> : <Share2 size={20} />}
          </button>
          <FavoriteButton favorite={isFavorite} size={28} onClick={onToggleFavorite} />
          {template.category === 'custom' && onDeleteCustom && (
            <button
              type="button"
              className="detail-page__share-btn detail-page__delete-btn"
              onClick={() => {
                if (confirm(t('detail.deleteCustom.confirm', { name: template.name }))) {
                  onDeleteCustom(template.id);
                  onBack();
                }
              }}
              aria-label={t('detail.deleteCustom.ariaLabel')}
              title={t('detail.deleteCustom.title')}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      <main id="main-content" className="detail-page__body" tabIndex={-1}>
        <h1 className="detail-page__title">{template.name}</h1>

        <div className="detail-page__tags">
          <span
            className="template-card__difficulty"
            style={{ backgroundColor: diffStyle.bg }}
          >
            {difficultyLabel}
          </span>
          {template.tags.map(tag => (
            <span key={tag} className="detail-page__tag">#{tag}</span>
          ))}
        </div>

        <p className="detail-page__description">{template.description}</p>

        <div className="detail-page__pixel-wrapper">
          <div className="detail-page__pixel-controls">
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label={t('detail.zoom.out')}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn detail-page__zoom-label"
              onClick={zoomReset}
              aria-label={t('detail.zoom.reset')}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label={t('detail.zoom.in')}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className={`detail-page__zoom-btn ${showGridLines ? 'detail-page__zoom-btn--active' : ''}`}
              onClick={() => setShowGridLines(v => !v)}
              aria-label={t('detail.zoom.gridLines')}
              aria-pressed={showGridLines}
              title={t('detail.zoom.gridLinesTitle')}
            >
              <Grid3x3 size={16} />
            </button>
          </div>
          <div className="detail-page__pixel" style={{ overflow: 'auto' }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <PixelGrid grid={template.grid} colors={correctedColors} showGridLines={showGridLines} />
            </div>
          </div>
        </div>

        <div className="detail-page__stats">
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{beadCount}</span>
            <span className="detail-page__stat-label">{t('detail.stat.totalBeads')}</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{correctedColors.length}</span>
            <span className="detail-page__stat-label">{t('detail.stat.colors')}</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{cols}×{rows}</span>
            <span className="detail-page__stat-label">{t('detail.stat.gridSize')}</span>
          </div>
        </div>

        <div className="detail-page__palette">
          <div className="detail-page__palette-header">
            <h2 className="detail-page__section-title">{t('detail.palette.title')}</h2>
            <div className="detail-page__palette-actions">
              <label className="detail-page__color-sort">
                <span className="detail-page__color-sort-label">{t('detail.palette.sortLabel')}</span>
                <select
                  value={colorSort}
                  onChange={e => setColorSort(e.target.value as 'count' | 'name' | 'hex')}
                  aria-label={t('detail.palette.sort.ariaLabel')}
                >
                  <option value="count">{t('detail.palette.sort.count')}</option>
                  <option value="name">{t('detail.palette.sort.name')}</option>
                  <option value="hex">{t('detail.palette.sort.hex')}</option>
                </select>
              </label>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleCopyAllColors}
                title={t('detail.palette.copyAll.title')}
              >
                {copiedAll ? <Check size={14} /> : <ClipboardList size={14} />}
                <span>{copiedAll ? t('detail.palette.copied') : t('detail.palette.copyAll')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handlePrintList}
                title={t('detail.palette.printList.title')}
                aria-label={t('detail.palette.printList.ariaLabel')}
              >
                <Printer size={14} />
                <span>{t('detail.palette.printList')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportPNG}
                title={t('detail.palette.export.title')}
                aria-label={t('detail.palette.export.ariaLabel')}
              >
                <Download size={14} />
                <span>{t('detail.palette.export')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportSVG}
                title={t('detail.palette.exportSvg.title')}
                aria-label={t('detail.palette.exportSvg.ariaLabel')}
              >
                <FileCode size={14} />
                <span>{t('detail.palette.exportSvg.label')}</span>
              </button>
            </div>
          </div>
          <div className="detail-page__palette-grid">
            {sortedColors.map((color, i) => {
              const pct = maxColorCount > 0 ? (color.count / maxColorCount) * 100 : 0;
              const ratio = beadCount > 0 ? ((color.count / beadCount) * 100).toFixed(1) : '0';
              return (
                <button
                  key={i}
                  type="button"
                  className="detail-page__swatch"
                  onClick={() => handleCopyHex(color.hex)}
                  title={t('detail.swatch.copyTitle', { hex: color.hex })}
                  aria-label={t('detail.swatch.ariaLabel', { hex: color.hex, name: color.name, count: color.count })}
                >
                  <div
                    className="detail-page__swatch-color"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="detail-page__swatch-info">
                    <span className="detail-page__swatch-name">{color.name}</span>
                    <span className="detail-page__swatch-hex">{color.hex}</span>
                    <span
                      className="detail-page__swatch-bar"
                      style={{ width: `${pct}%`, backgroundColor: color.hex }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="detail-page__swatch-count">
                    {color.count}
                    <span className="detail-page__swatch-pct">{ratio}%</span>
                  </span>
                  <span className="detail-page__swatch-copy">
                    {copiedHex === color.hex ? <Check size={14} /> : <Copy size={14} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 打印专用用量清单：屏幕隐藏，仅 @media print 可见 */}
        <section className="detail-page__print-list" aria-hidden="true">
          <h1 className="detail-page__print-title">{template.name}</h1>
          <p className="detail-page__print-meta">
            {t('detail.print.meta', {
              beadCount,
              colors: correctedColors.length,
              cols,
              rows,
              difficulty: difficultyLabel,
              source: template.source,
            })}
          </p>
          <table className="detail-page__print-table">
            <thead>
              <tr>
                <th>{t('detail.print.col.swatch')}</th>
                <th>{t('detail.print.col.hex')}</th>
                <th>{t('detail.print.col.name')}</th>
                <th>{t('detail.print.col.count')}</th>
                <th>{t('detail.print.col.ratio')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedColors.map((color, i) => (
                <tr key={i}>
                  <td>
                    <span
                      className="detail-page__print-swatch"
                      style={{ backgroundColor: color.hex }}
                    />
                  </td>
                  <td>{color.hex}</td>
                  <td>{color.name}</td>
                  <td>{t('detail.print.cell.beads', { count: color.count })}</td>
                  <td>
                    {beadCount > 0 ? ((color.count / beadCount) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>{t('detail.print.total')}</td>
                <td>{t('detail.print.totalBeads', { beadCount })}</td>
                <td>{t('detail.print.colors', { count: correctedColors.length })}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="detail-page__source">
          <span className="detail-page__source-label">{t('detail.source.label')}</span>
          <span className="detail-page__source-value">{template.source}</span>
        </div>

        {(prevTemplate || nextTemplate) && (
          <nav className="detail-page__pager" aria-label={t('detail.pager.ariaLabel')}>
            {prevTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--prev"
                onClick={() => onNavigateTemplate?.(prevTemplate.id)}
              >
                <ArrowLeft size={16} />
                <span className="detail-page__pager-label">{t('detail.pager.prev')}</span>
                <span className="detail-page__pager-name">{prevTemplate.name}</span>
              </button>
            ) : <span className="detail-page__pager-spacer" />}
            {nextTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--next"
                onClick={() => onNavigateTemplate?.(nextTemplate.id)}
              >
                <span className="detail-page__pager-label">{t('detail.pager.next')}</span>
                <span className="detail-page__pager-name">{nextTemplate.name}</span>
                <ArrowRight size={16} />
              </button>
            ) : <span className="detail-page__pager-spacer" />}
          </nav>
        )}

        {relatedTemplates.length > 0 && (
          <section className="detail-page__related" aria-label={t('detail.related.ariaLabel')}>
            <h2 className="detail-page__section-title detail-page__section-title--related">{t('detail.related.title')}</h2>
            <div className="detail-page__related-list">
              {relatedTemplates.map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  className="detail-page__related-item"
                  onClick={() => onNavigateTemplate?.(rt.id)}
                  title={rt.name}
                >
                  <PixelGrid grid={rt.grid.slice(0, 8).map(r => r.slice(0, 8))} colors={rt.colors} />
                  <span className="detail-page__related-name">{rt.name}</span>
                  <span className="detail-page__related-beads">{t('detail.related.beads', { count: getBeadCount(rt) })}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="detail-page__shortcuts">
          <kbd>←</kbd><kbd>→</kbd> {t('detail.shortcuts.switchTemplate')}
          <span className="detail-page__shortcuts-sep">·</span>
          <kbd>Esc</kbd> {t('detail.shortcuts.backHome')}
        </div>
      </main>

      {showTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('detail.backToTop')}
        >
          ↑
        </button>
      )}
    </div>
  );
}
