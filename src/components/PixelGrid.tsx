import { useCallback, useRef, memo } from 'react';
import type { KeyboardEvent } from 'react';
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
  /** 缩略图模式：覆盖 aria-label/title 的总数与尺寸，避免切片导致误导 */
  ariaTotalBeads?: number;
  ariaCols?: number;
  ariaRows?: number;
  /** 在格子内显示颜色编号（1/2/3…，对应色卡序号） */
  showColorCode?: boolean;
}

/** 根据背景 hex 计算相对亮度，返回适合的前景色（黑/白） */
function pickContrastText(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // 相对亮度（sRGB 近似）
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.55 ? '#111' : '#fff';
}

function PixelGrid({
  grid,
  colors,
  className = '',
  showGridLines = false,
  interactive = false,
  completedCells,
  onCellClick,
  ariaTotalBeads,
  ariaCols,
  ariaRows,
  showColorCode = false,
}: PixelGridProps) {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const rows = grid.length;
  // 取最大行长度作为列数，兼容锯齿状网格（自定义导入可能产生）
  const cols = Math.max(0, ...grid.map(r => r.length));

  const totalBeads = grid.flat().filter(v => v > 0).length;
  // 缩略图模式下用真实总数/尺寸，避免切片导致 aria-label 误导
  const ariaCount = ariaTotalBeads ?? totalBeads;
  const ariaColsVal = ariaCols ?? cols;
  const ariaRowsVal = ariaRows ?? rows;

  // 交互模式键盘导航：roving tabindex，仅 grid 容器 tabbable，cell 用方向键移动
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const target = e.target as HTMLElement;
    const cellEl = target.closest('[data-cell]') as HTMLElement | null;
    // 焦点在 grid 容器上：方向键移到首个非空格子
    if (!cellEl) {
      if (['ArrowDown', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        const first = gridRef.current?.querySelector('[data-cell][data-filled="true"]') as HTMLElement | null;
        first?.focus();
        e.preventDefault();
      }
      return;
    }
    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);
    let nr = r;
    let nc = c;
    switch (e.key) {
      case 'ArrowUp': nr = Math.max(0, r - 1); break;
      case 'ArrowDown': nr = Math.min(rows - 1, r + 1); break;
      case 'ArrowLeft': nc = Math.max(0, c - 1); break;
      case 'ArrowRight': nc = Math.min(cols - 1, c + 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if ((grid[r]?.[c] ?? 0) > 0) onCellClick?.(r, c);
        return;
      default:
        return;
    }
    e.preventDefault();
    const next = gridRef.current?.querySelector(`[data-cell="${nr}-${nc}"]`) as HTMLElement | null;
    next?.focus();
  }, [interactive, rows, cols, grid, onCellClick]);

  return (
    <div
      ref={gridRef}
      className={`pixel-grid ${className} ${showGridLines ? 'pixel-grid--lined' : ''} ${interactive ? 'pixel-grid--interactive' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: showGridLines ? '0' : '1px',
        width: 'fit-content',
        maxWidth: '100%',
      }}
      role={interactive ? 'grid' : 'img'}
      aria-label={t('pixelGrid.ariaLabel', { count: ariaCount })}
      title={t('pixelGrid.title', { cols: ariaColsVal, rows: ariaRowsVal, count: ariaCount })}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      {Array.from({ length: rows }, (_, ri) =>
        Array.from({ length: cols }, (_, ci) => {
          const cellValue = grid[ri]?.[ci] ?? 0;
          const color = cellValue > 0 ? colors[cellValue - 1] : undefined;
          const cellKey = `${ri}-${ci}`;
          const isCompleted = completedCells?.has(cellKey);
          const isEmpty = cellValue <= 0;
          return (
            <div
              key={cellKey}
              data-cell={`${ri}-${ci}`}
              data-r={ri}
              data-c={ci}
              data-filled={isEmpty ? 'false' : 'true'}
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
              role={interactive && !isEmpty ? 'gridcell' : undefined}
              tabIndex={interactive && !isEmpty ? -1 : undefined}
              aria-rowindex={interactive ? ri + 1 : undefined}
              aria-colindex={interactive ? ci + 1 : undefined}
              aria-label={isCompleted ? t('pixelGrid.completed') : color ? t('pixelGrid.cellTitle', { name: color.name, hex: color.hex }) : undefined}
            >
              {isCompleted && (
                <span className="pixel-cell__check" aria-hidden="true">✓</span>
              )}
              {showColorCode && !isEmpty && !isCompleted && color && (
                <span
                  className="pixel-cell__code"
                  aria-hidden="true"
                  style={{ color: pickContrastText(color.hex) }}
                >
                  {cellValue}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default memo(PixelGrid);
