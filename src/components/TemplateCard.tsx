import type { BeadTemplate } from '../types/bead';
import PixelGrid from './PixelGrid';
import FavoriteButton from './FavoriteButton';

interface TemplateCardProps {
  template: BeadTemplate;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  highlight?: string;
  categoryName?: string;
}

const difficultyStyles: Record<string, { bg: string; label: string }> = {
  easy: { bg: '#22c55e', label: '简单' },
  medium: { bg: '#f59e0b', label: '中等' },
  hard: { bg: '#ef4444', label: '困难' },
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="template-card__highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function TemplateCard({
  template,
  isFavorite,
  onToggleFavorite,
  onClick,
  highlight = '',
  categoryName,
}: TemplateCardProps) {
  const diffStyle = difficultyStyles[template.difficulty] || difficultyStyles.medium;
  const rows = template.grid.length;
  const cols = rows > 0 ? template.grid[0].length : 0;

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
        <PixelGrid grid={thumbGrid} colors={template.colors} />
        <span
          className="template-card__difficulty"
          style={{ backgroundColor: diffStyle.bg }}
        >
          {diffStyle.label}
        </span>
      </div>

      <div className="template-card__info">
        <h3 className="template-card__name">
          <Highlight text={template.name} query={highlight} />
        </h3>
        <div className="template-card__meta">
          <span className="template-card__beads">{template.beadCount} 颗</span>
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
