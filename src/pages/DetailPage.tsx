import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BeadTemplate } from '../types/bead';
import PixelGrid from '../components/PixelGrid';
import FavoriteButton from '../components/FavoriteButton';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, Copy, Grid3x3, ClipboardList, Share2 } from 'lucide-react';
import { getBeadCount, getCorrectedColors } from '../utils/beadStats';

interface DetailPageProps {
  template: BeadTemplate | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onNavigateTemplate?: (id: string) => void;
  prevTemplate?: BeadTemplate | null;
  nextTemplate?: BeadTemplate | null;
}

const difficultyStyles: Record<string, { bg: string; label: string }> = {
  easy: { bg: '#22c55e', label: '简单' },
  medium: { bg: '#f59e0b', label: '中等' },
  hard: { bg: '#ef4444', label: '困难' },
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
}: DetailPageProps) {
  const [zoom, setZoom] = useState(1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      // 用户取消分享或剪贴板不可用，静默处理
    }
  }, [template]);

  const handleCopyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1500);
    } catch {
      // Clipboard API may be unavailable; fail silently
    }
  }, []);

  const handleCopyAllColors = useCallback(async () => {
    if (!template) return;
    const colors = getCorrectedColors(template);
    const text = colors
      .map(c => `${c.hex}\t${c.name}\t${c.count}颗`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      // fail silently
    }
  }, [template]);

  // 切换模板时重置缩放并滚动到顶部
  useEffect(() => {
    setZoom(1);
    window.scrollTo({ top: 0 });
  }, [template?.id]);

  // 滚动监听，控制返回顶部按钮显示
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        <div className="empty-state">
          <p className="empty-state__icon">😕</p>
          <p className="empty-state__title">模板不存在</p>
          <p className="empty-state__desc">该模板可能已被移除</p>
        </div>
      </div>
    );
  }

  const diffStyle = difficultyStyles[template.difficulty] || difficultyStyles.medium;
  const rows = template.grid.length;
  const cols = rows > 0 ? template.grid[0].length : 0;
  const beadCount = useMemo(() => getBeadCount(template), [template]);
  const correctedColors = useMemo(() => getCorrectedColors(template), [template]);
  const maxColorCount = useMemo(
    () => correctedColors.reduce((m, c) => Math.max(m, c.count), 0),
    [correctedColors]
  );
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);

  return (
    <div className="page detail-page">
      <header className="detail-page__header">
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="detail-page__header-actions">
          <button
            type="button"
            className="detail-page__share-btn"
            onClick={handleShare}
            aria-label="分享链接"
            title="分享链接"
          >
            {copiedLink ? <Check size={20} /> : <Share2 size={20} />}
          </button>
          <FavoriteButton favorite={isFavorite} size={28} onClick={onToggleFavorite} />
        </div>
      </header>

      <div className="detail-page__body">
        <h1 className="detail-page__title">{template.name}</h1>

        <div className="detail-page__tags">
          <span
            className="template-card__difficulty"
            style={{ backgroundColor: diffStyle.bg }}
          >
            {diffStyle.label}
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
              aria-label="缩小"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn detail-page__zoom-label"
              onClick={zoomReset}
              aria-label="重置缩放"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="放大"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className={`detail-page__zoom-btn ${showGridLines ? 'detail-page__zoom-btn--active' : ''}`}
              onClick={() => setShowGridLines(v => !v)}
              aria-label="切换网格线"
              aria-pressed={showGridLines}
              title="网格线"
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
            <span className="detail-page__stat-label">总颗数</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{correctedColors.length}</span>
            <span className="detail-page__stat-label">颜色数</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{cols}×{rows}</span>
            <span className="detail-page__stat-label">网格尺寸</span>
          </div>
        </div>

        <div className="detail-page__palette">
          <div className="detail-page__palette-header">
            <h2 className="detail-page__section-title">色卡（点击复制色号）</h2>
            <button
              type="button"
              className="detail-page__copy-all"
              onClick={handleCopyAllColors}
              title="复制全部色卡"
            >
              {copiedAll ? <Check size={14} /> : <ClipboardList size={14} />}
              <span>{copiedAll ? '已复制' : '复制全部'}</span>
            </button>
          </div>
          <div className="detail-page__palette-grid">
            {correctedColors.map((color, i) => {
              const pct = maxColorCount > 0 ? (color.count / maxColorCount) * 100 : 0;
              const ratio = beadCount > 0 ? ((color.count / beadCount) * 100).toFixed(1) : '0';
              return (
                <button
                  key={i}
                  type="button"
                  className="detail-page__swatch"
                  onClick={() => handleCopyHex(color.hex)}
                  title={`复制 ${color.hex}`}
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

        <div className="detail-page__source">
          <span className="detail-page__source-label">来源：</span>
          <span className="detail-page__source-value">{template.source}</span>
        </div>

        {(prevTemplate || nextTemplate) && (
          <nav className="detail-page__pager" aria-label="模板切换">
            {prevTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--prev"
                onClick={() => onNavigateTemplate?.(prevTemplate.id)}
              >
                <ArrowLeft size={16} />
                <span className="detail-page__pager-label">上一个</span>
                <span className="detail-page__pager-name">{prevTemplate.name}</span>
              </button>
            ) : <span className="detail-page__pager-spacer" />}
            {nextTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--next"
                onClick={() => onNavigateTemplate?.(nextTemplate.id)}
              >
                <span className="detail-page__pager-label">下一个</span>
                <span className="detail-page__pager-name">{nextTemplate.name}</span>
                <ArrowRight size={16} />
              </button>
            ) : <span className="detail-page__pager-spacer" />}
          </nav>
        )}

        <div className="detail-page__shortcuts">
          <kbd>←</kbd><kbd>→</kbd> 切换模板
          <span className="detail-page__shortcuts-sep">·</span>
          <kbd>Esc</kbd> 返回首页
        </div>
      </div>

      {showTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="返回顶部"
        >
          ↑
        </button>
      )}
    </div>
  );
}
