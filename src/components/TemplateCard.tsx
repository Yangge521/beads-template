import { memo } from 'react';
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

  // Show a thumbnail by using a smaller grid (max 10x10)
  const thumbRows = Math.min(rows, 10);
  const thumbCols = Math.min(cols, 10);
  const thumbGrid = template.grid.slice(0, thumbRows).map(r => r.slice(0, thumbCols));

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
        {template.image ? (
          <img
            className="template-card__cover"
            src={`${import.meta.env.BASE_URL}${template.image}`}
            alt={template.name}
            loading="lazy"
            onError={(e) => {
              // 图片加载失败时回退到 PixelGrid 缩略图
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
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
