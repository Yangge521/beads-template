import type { ColorInfo } from '../types/bead';

interface PixelGridProps {
  grid: number[][];
  colors: ColorInfo[];
  className?: string;
  showGridLines?: boolean;
}

export default function PixelGrid({
  grid,
  colors,
  className = '',
  showGridLines = false,
}: PixelGridProps) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const totalBeads = grid.flat().filter(v => v > 0).length;

  return (
    <div
      className={`pixel-grid ${className} ${showGridLines ? 'pixel-grid--lined' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: showGridLines ? '0' : '1px',
        width: 'fit-content',
      }}
      role="img"
      aria-label={`拼豆图案，共 ${totalBeads} 颗`}
      title={`${cols}x${rows} | ${totalBeads} 颗`}
    >
      {grid.map((row, ri) =>
        row.map((cellValue, ci) => {
          const color = cellValue > 0 ? colors[cellValue - 1] : undefined;
          return (
            <div
              key={`${ri}-${ci}`}
              className="pixel-cell"
              style={{
                backgroundColor: color ? color.hex : 'transparent',
                aspectRatio: '1',
                borderRadius: showGridLines ? '0' : '2px',
                outline: showGridLines ? '0.5px solid var(--pixel-line, rgba(0,0,0,0.15))' : 'none',
              }}
              title={
                color ? `${color.name} (${color.hex})` : '空白'
              }
            />
          );
        })
      )}
    </div>
  );
}
