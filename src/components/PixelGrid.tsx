import type { ColorInfo } from '../types/bead';
import { useTranslation } from '../context/LanguageContext';

interface PixelGridProps {
  grid: number[][];
  colors: ColorInfo[];
  className?: string;
  showGridLines?: boolean;
  /** 交互模式：点击格子可切换完成状态 */
  interactive?: boolean;
  /** 已完成格子的坐标集合（"row-col" 格式） */
  completedCells?: Set<string>;
  /** 格子点击回调（仅 interactive 模式生效） */
  onCellClick?: (row: number, col: number) => void;
}

export default function PixelGrid({
  grid,
  colors,
  className = '',
  showGridLines = false,
  interactive = false,
  completedCells,
  onCellClick,
}: PixelGridProps) {
  const { t } = useTranslation();
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const totalBeads = grid.flat().filter(v => v > 0).length;

  return (
    <div
      className={`pixel-grid ${className} ${showGridLines ? 'pixel-grid--lined' : ''} ${interactive ? 'pixel-grid--interactive' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: showGridLines ? '0' : '1px',
        width: 'fit-content',
      }}
      role={interactive ? 'grid' : 'img'}
      aria-label={t('pixelGrid.ariaLabel', { count: totalBeads })}
      title={t('pixelGrid.title', { cols, rows, count: totalBeads })}
    >
      {grid.map((row, ri) =>
        row.map((cellValue, ci) => {
          const color = cellValue > 0 ? colors[cellValue - 1] : undefined;
          const cellKey = `${ri}-${ci}`;
          const isCompleted = completedCells?.has(cellKey);
          const isEmpty = cellValue <= 0;
          return (
            <div
              key={cellKey}
              className={`pixel-cell ${isCompleted ? 'pixel-cell--completed' : ''}`}
              style={{
                backgroundColor: color ? color.hex : 'transparent',
                aspectRatio: '1',
                borderRadius: showGridLines ? '0' : '2px',
                outline: showGridLines ? '0.5px solid var(--pixel-line, rgba(0,0,0,0.15))' : 'none',
                cursor: interactive && !isEmpty ? 'pointer' : 'default',
                position: 'relative',
                opacity: isCompleted ? 0.45 : 1,
              }}
              title={
                color ? t('pixelGrid.cellTitle', { name: color.name, hex: color.hex }) : t('pixelGrid.empty')
              }
              onClick={interactive && !isEmpty ? () => onCellClick?.(ri, ci) : undefined}
              role={interactive && !isEmpty ? 'button' : undefined}
              tabIndex={interactive && !isEmpty ? 0 : undefined}
              aria-label={isCompleted ? t('pixelGrid.completed') : color ? t('pixelGrid.cellTitle', { name: color.name, hex: color.hex }) : undefined}
              onKeyDown={interactive && !isEmpty ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCellClick?.(ri, ci);
                }
              } : undefined}
            >
              {isCompleted && (
                <span className="pixel-cell__check" aria-hidden="true">✓</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
