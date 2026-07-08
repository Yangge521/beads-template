import { useCallback, useRef, useEffect, memo, useMemo } from 'react';
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

/** 超过此阈值且非交互模式时改用 canvas 渲染，避免过多 DOM 节点 */
const CANVAS_THRESHOLD = 1024;

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

/** Canvas 渲染大网格（非交互模式），显著减少 DOM 节点 */
function PixelGridCanvas({
  grid,
  colors,
  rows,
  cols,
  showGridLines,
  ariaLabel,
  title,
}: {
  grid: number[][];
  colors: ColorInfo[];
  rows: number;
  cols: number;
  showGridLines: boolean;
  ariaLabel: string;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 使用 devicePixelRatio 保证清晰度，上限 2 防止超大网格内存过高
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cellSize = Math.max(2, Math.floor(512 / cols));
    const gap = showGridLines ? 0 : 1;
    const w = cols * (cellSize + gap) - (gap > 0 ? gap : 0);
    const h = rows * (cellSize + gap) - (gap > 0 ? gap : 0);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // 背景透明
    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r]?.[c] ?? 0;
        if (v <= 0) continue;
        const color = colors[v - 1];
        if (!color) continue;
        ctx.fillStyle = color.hex;
        const x = c * (cellSize + gap);
        const y = r * (cellSize + gap);
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    if (showGridLines) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= rows; r++) {
        const y = r * (cellSize + gap) - (r > 0 ? gap : 0);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        const x = c * (cellSize + gap) - (c > 0 ? gap : 0);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  }, [grid, colors, rows, cols, showGridLines]);

  return (
    <div
      className="pixel-grid pixel-grid--canvas"
      role="img"
      aria-label={ariaLabel}
      title={title}
    >
      <canvas ref={canvasRef} />
    </div>
  );
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

  const totalBeads = useMemo(() => grid.flat().filter(v => v > 0).length, [grid]);
  // 缩略图模式下用真实总数/尺寸，避免切片导致 aria-label 误导
  const ariaCount = ariaTotalBeads ?? totalBeads;
  const ariaColsVal = ariaCols ?? cols;
  const ariaRowsVal = ariaRows ?? rows;

  // 大网格非交互模式改用 canvas 渲染
  const useCanvas = !interactive && rows * cols > CANVAS_THRESHOLD;
  const ariaLabel = t('pixelGrid.ariaLabel', { count: ariaCount });
  const ariaTitle = t('pixelGrid.title', { cols: ariaColsVal, rows: ariaRowsVal, count: ariaCount });

  // 交互模式键盘导航：roving tabindex，仅 grid 容器 tabbable，cell 用方向键移动
  // 必须在条件 return 之前调用，遵守 React Hooks 规则
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

  // 大网格非交互模式改用 canvas 渲染（在所有 hooks 之后 return）
  if (useCanvas) {
    return (
      <PixelGridCanvas
        grid={grid}
        colors={colors}
        rows={rows}
        cols={cols}
        showGridLines={showGridLines}
        ariaLabel={ariaLabel}
        title={ariaTitle}
      />
    );
  }

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
      aria-label={ariaLabel}
      title={ariaTitle}
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
