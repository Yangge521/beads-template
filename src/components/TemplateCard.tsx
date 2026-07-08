import { memo, useState, useMemo } from 'react';
import type { BeadTemplate } from '../types/bead';
import PixelGrid from './PixelGrid';
import FavoriteButton from './FavoriteButton';
import { getBeadCount } from '../utils/beadStats';
import { useTranslation } from '../context/LanguageContext';

interface TemplateCardProps {
  template: BeadTemplate;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  highlight?: string;
  categoryName?: string;
}

const difficultyBg: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q || lower.indexOf(q) === -1) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let idx = lower.indexOf(q, cursor);
  let key = 0;
  while (idx !== -1) {
    if (idx > cursor) {
      parts.push(text.slice(cursor, idx));
    }
    parts.push(
      <mark key={key++} className="template-card__highlight">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    cursor = idx + query.length;
    idx = lower.indexOf(q, cursor);
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
}

function TemplateCard({
  template,
  isFavorite,
  onToggleFavorite,
  onClick,
  highlight = '',
  categoryName,
}: TemplateCardProps) {
  const { t } = useTranslation();
  const diffBg = difficultyBg[template.difficulty] || difficultyBg.medium;
  const diffLabel = t(`difficulty.${template.difficulty}`);
  const rows = template.grid.length;
  const cols = rows > 0 ? template.grid[0].length : 0;
  const beadCount = getBeadCount(template);

  // 封面图加载失败时回退到 PixelGrid 缩略图
  const [imgError, setImgError] = useState(false);

  // 居中裁切缩略图：取网格中心区域 max 10×10，避免左上角切片丢失主体
  const thumbRows = Math.min(rows, 10);
  const thumbCols = Math.min(cols, 10);
  const startRow = Math.max(0, Math.floor((rows - thumbRows) / 2));
  const startCol = Math.max(0, Math.floor((cols - thumbCols) / 2));
  const thumbGrid = template.grid
    .slice(startRow, startRow + thumbRows)
    .map(r => r.slice(startCol, startCol + thumbCols));

  // 配色预览条：取用量最多的前 6 种颜色，一眼展示模板配色方案
  const palette = useMemo(() => {
    return [...template.colors]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 6);
  }, [template.colors]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="template-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="template-card__thumb">
        {template.image && !imgError ? (
          <img
            className="template-card__cover"
            src={`${import.meta.env.BASE_URL}${template.image}`}
            alt={template.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <PixelGrid grid={thumbGrid} colors={template.colors} />
        )}
        <span
          className="template-card__difficulty"
          style={{ backgroundColor: diffBg }}
        >
          {diffLabel}
        </span>
        {/* 配色预览条：展示模板 top 6 颜色，丰富浏览信息 */}
        {palette.length > 0 && (
          <div className="template-card__palette" aria-hidden="true">
            {palette.map(c => (
              <span
                key={c.hex}
                className="template-card__palette-dot"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="template-card__info">
        <h3 className="template-card__name">
          <Highlight text={template.name} query={highlight} />
        </h3>
        <div className="template-card__meta">
          <span className="template-card__beads">{t('common.beadsUnitShort', { count: beadCount })}</span>
          <span className="template-card__dim">{cols}×{rows}</span>
          {categoryName && <span className="template-card__cat">{categoryName}</span>}
        </div>
      </div>

      <div
        className="template-card__fav"
        onClick={e => {
          e.stopPropagation();
        }}
        onKeyDown={e => e.stopPropagation()}
      >
        <FavoriteButton favorite={isFavorite} size={24} onClick={onToggleFavorite} />
      </div>
    </div>
  );
}

export default memo(TemplateCard);
