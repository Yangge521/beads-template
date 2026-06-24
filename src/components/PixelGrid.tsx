import type { ColorInfo } from '../types/bead';

interface PixelGridProps {
  grid: number[][];
  colors: ColorInfo[];
  className?: string;
}

export default function PixelGrid({ grid, colors, className = '' }: PixelGridProps) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const totalBeads = grid.flat().filter(v => v > 0).length;

  return (
    <div
      className={`pixel-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1px',
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
                borderRadius: '2px',
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
