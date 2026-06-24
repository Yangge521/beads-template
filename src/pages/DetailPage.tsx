import { useState, useCallback } from 'react';
import type { BeadTemplate } from '../types/bead';
import PixelGrid from '../components/PixelGrid';
import FavoriteButton from '../components/FavoriteButton';
import { ArrowLeft, ZoomIn, ZoomOut, Check, Copy } from 'lucide-react';

interface DetailPageProps {
  template: BeadTemplate | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const difficultyStyles: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: '#22c55e', text: '#fff', label: '简单' },
  medium: { bg: '#f59e0b', text: '#fff', label: '中等' },
  hard: { bg: '#ef4444', text: '#fff', label: '困难' },
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function DetailPage({
  template,
  onBack,
  isFavorite,
  onToggleFavorite,
}: DetailPageProps) {
  const [zoom, setZoom] = useState(1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1500);
    } catch {
      // Clipboard API may be unavailable; fail silently
    }
  }, []);

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
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);

  return (
    <div className="page detail-page">
      <header className="detail-page__header">
        <button className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <FavoriteButton favorite={isFavorite} size={28} onClick={onToggleFavorite} />
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
              className="detail-page__zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="缩小"
            >
              <ZoomOut size={16} />
            </button>
            <button
              className="detail-page__zoom-btn detail-page__zoom-label"
              onClick={zoomReset}
              aria-label="重置缩放"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              className="detail-page__zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="放大"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="detail-page__pixel" style={{ overflow: 'auto' }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <PixelGrid grid={template.grid} colors={template.colors} />
            </div>
          </div>
        </div>

        <div className="detail-page__stats">
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{template.beadCount}</span>
            <span className="detail-page__stat-label">总颗数</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{template.colors.length}</span>
            <span className="detail-page__stat-label">颜色数</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{cols}×{rows}</span>
            <span className="detail-page__stat-label">网格尺寸</span>
          </div>
        </div>

        <div className="detail-page__palette">
          <h2 className="detail-page__section-title">色卡（点击复制色号）</h2>
          <div className="detail-page__palette-grid">
            {template.colors.map((color, i) => (
              <button
                key={i}
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
                </div>
                <span className="detail-page__swatch-count">{color.count}</span>
                <span className="detail-page__swatch-copy">
                  {copiedHex === color.hex ? <Check size={14} /> : <Copy size={14} />}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="detail-page__source">
          <span className="detail-page__source-label">来源：</span>
          <span className="detail-page__source-value">{template.source}</span>
        </div>
      </div>
    </div>
  );
}
