import type { BeadTemplate } from '../types/bead';
import PixelGrid from './PixelGrid';
import FavoriteButton from './FavoriteButton';

interface TemplateCardProps {
  template: BeadTemplate;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

const difficultyStyles: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: '#22c55e', text: '#fff', label: '简单' },
  medium: { bg: '#f59e0b', text: '#fff', label: '中等' },
  hard: { bg: '#ef4444', text: '#fff', label: '困难' },
};

export default function TemplateCard({
  template,
  isFavorite,
  onToggleFavorite,
  onClick,
}: TemplateCardProps) {
  const diffStyle = difficultyStyles[template.difficulty] || difficultyStyles.medium;
  const rows = template.grid.length;
  const cols = rows > 0 ? template.grid[0].length : 0;

  // Show a thumbnail by using a smaller grid (max 10x10)
  const thumbRows = Math.min(rows, 10);
  const thumbCols = Math.min(cols, 10);
  const thumbGrid = template.grid.slice(0, thumbRows).map(r => r.slice(0, thumbCols));

  return (
    <div className="template-card" onClick={onClick} role="button" tabIndex={0}>
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
        <h3 className="template-card__name">{template.name}</h3>
        <div className="template-card__meta">
          <span className="template-card__beads">{template.beadCount} 颗</span>
        </div>
      </div>

      <div
        className="template-card__fav"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <FavoriteButton favorite={isFavorite} size={24} onClick={onToggleFavorite} />
      </div>
    </div>
  );
}
