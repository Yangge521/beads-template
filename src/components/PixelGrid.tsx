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
/** 超过此阈值视为超大网格（约 50×50+）：启用分块渲染、viewport culling，并关闭网格线/hover */
const LARGE_GRID_THRESHOLD = 2500;

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

/** Canvas 渲染大网格（非交互模式），显著减少 DOM 节点。
 *  超大网格（>LARGE_GRID_THRESHOLD）额外启用 requestAnimationFrame 分块绘制与 viewport culling，
 *  避免一次性绘制导致主线程长时间阻塞。 */
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
  const wrapRef = useRef<HTMLDivElement>(null);
  // 暴露给 IntersectionObserver 回调使用的渲染调度器（ref 避免闭包陈旧）
  const scheduleRenderRef = useRef<() => void>(() => {});

  // 是否为超大网格：启用分块渲染 / viewport culling / 强制隐藏网格线
  const isLargeGrid = rows * cols > LARGE_GRID_THRESHOLD;
  // 超大网格强制隐藏网格线，避免绘制大量细线拖慢渲染
  const effectiveShowGridLines = showGridLines && !isLargeGrid;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 使用 devicePixelRatio 保证清晰度，上限 2 防止超大网格内存过高
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cellSize = Math.max(2, Math.floor(512 / cols));
    const gap = effectiveShowGridLines ? 0 : 1;
    const rowH = cellSize + gap;
    const w = cols * rowH - (gap > 0 ? gap : 0);
    const h = rows * rowH - (gap > 0 ? gap : 0);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // 背景透明
    ctx.clearRect(0, 0, w, h);

    // 绘制指定行范围 [from, to) 的格子
    const drawRows = (from: number, to: number) => {
      for (let r = from; r < to; r++) {
        for (let c = 0; c < cols; c++) {
          const v = grid[r]?.[c] ?? 0;
          if (v <= 0) continue;
          const color = colors[v - 1];
          if (!color) continue;
          ctx.fillStyle = color.hex;
          ctx.fillRect(c * rowH, r * rowH, cellSize, cellSize);
        }
      }
    };

    // 绘制网格线（仅非超大网格；超大网格已强制关闭）
    const drawLines = () => {
      if (!effectiveShowGridLines) return;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= rows; r++) {
        const y = r * rowH - (r > 0 ? gap : 0);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        const x = c * rowH - (c > 0 ? gap : 0);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    };

    // 非超大网格：保持原有同步绘制行为
    if (!isLargeGrid) {
      drawRows(0, rows);
      drawLines();
      return;
    }

    // ===== 超大网格：requestAnimationFrame 分块绘制 + viewport culling =====
    // 视口上下缓冲行数，减少滚动时的白屏闪烁
    const BUFFER_ROWS = 2;
    // 每帧目标绘制约 1000 个格子，兼顾流畅度与吞吐量
    const rowsPerFrame = Math.max(2, Math.ceil(1000 / cols));

    // 计算当前视口内可见的行范围；canvas 完全在视口外时返回空范围
    const computeVisibleRows = (): { start: number; end: number } => {
      const rect = canvas.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // canvas 完全在视口上方或下方 → 不可见
      if (rect.bottom <= 0 || rect.top >= vh) return { start: 0, end: 0 };
      const visStartY = Math.max(0, -rect.top);
      const visEndY = Math.min(rect.height, vh - rect.top);
      if (visEndY <= visStartY) return { start: 0, end: 0 };
      const start = Math.max(0, Math.floor(visStartY / rowH) - BUFFER_ROWS);
      const end = Math.min(rows, Math.ceil(visEndY / rowH) + BUFFER_ROWS);
      return { start, end };
    };

    // 记录每行是否已绘制，避免重复绘制
    const rendered = new Array<boolean>(rows).fill(false);
    let rafId = 0;

    const step = () => {
      rafId = 0;
      const vis = computeVisibleRows();
      // canvas 当前不可见：跳过绘制，等待进入视口（由 IO / scroll 触发）
      if (vis.end <= vis.start) return;
      // 优先绘制可见区域内尚未绘制的行
      let drawn = 0;
      for (let r = vis.start; r < vis.end && drawn < rowsPerFrame; r++) {
        if (!rendered[r]) {
          drawRows(r, r + 1);
          rendered[r] = true;
          drawn++;
        }
      }
      // 仍有可见行未绘制 → 下一帧继续
      if (drawn > 0) {
        rafId = requestAnimationFrame(step);
      }
    };

    const schedule = () => {
      if (rafId) return; // 已有调度中，避免重复入队
      rafId = requestAnimationFrame(step);
    };
    scheduleRenderRef.current = schedule;

    schedule();

    // 滚动 / 缩放时重新评估可见区域并补绘新进入视口的行
    const onViewportChange = () => schedule();
    window.addEventListener('scroll', onViewportChange, { passive: true });
    window.addEventListener('resize', onViewportChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('resize', onViewportChange);
      scheduleRenderRef.current = () => {};
    };
  }, [grid, colors, rows, cols, effectiveShowGridLines, isLargeGrid]);

  // IntersectionObserver：canvas 进入视口时触发渲染（处理初始位于视口外的场景）
  useEffect(() => {
    if (!isLargeGrid) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) scheduleRenderRef.current();
    }, { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, [isLargeGrid]);

  return (
    <div
      ref={wrapRef}
      className={`pixel-grid pixel-grid--canvas${isLargeGrid ? ' pixel-grid--large' : ''}`}
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

  const cellCount = rows * cols;
  const isLargeGrid = cellCount > LARGE_GRID_THRESHOLD;
  // 超大网格强制隐藏网格线（DOM 与 canvas 路径一致），降低渲染与绘制开销
  const effectiveShowGridLines = showGridLines && !isLargeGrid;
  // 超大交互网格禁用 hover 反馈（不显示 pointer 光标）
  const disableHover = isLargeGrid && interactive;

  // 大网格非交互模式改用 canvas 渲染
  const useCanvas = !interactive && cellCount > CANVAS_THRESHOLD;
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
      className={`pixel-grid ${className} ${effectiveShowGridLines ? 'pixel-grid--lined' : ''} ${interactive ? 'pixel-grid--interactive' : ''} ${isLargeGrid ? 'pixel-grid--large' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: effectiveShowGridLines ? '0' : '1px',
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
                borderRadius: effectiveShowGridLines ? '0' : '2px',
                outline: effectiveShowGridLines ? '0.5px solid var(--pixel-line, rgba(0,0,0,0.15))' : 'none',
                cursor: disableHover ? 'default' : interactive && !isEmpty ? 'pointer' : 'default',
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
