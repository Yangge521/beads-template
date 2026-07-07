/**
 * 编辑器形状绘制工具：直线、矩形、圆
 * 纯函数，返回新的网格数据
 */

export type ShapeTool = 'line' | 'rect' | 'circle' | 'rectFill' | 'circleFill';

/**
 * Bresenham 直线算法
 */
export function drawLine(
  grid: number[][],
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  value: number
): number[][] {
  const next = grid.map(row => [...row]);
  const rows = next.length;
  const cols = rows > 0 ? next[0].length : 0;
  let dr = Math.abs(r1 - r0);
  let dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0;
  let c = c0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) next[r][c] = value;
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) { err -= dc; c += sc; }
    if (e2 < dr) { err += dr; r += sr; }
  }
  return next;
}

/**
 * 矩形描边
 */
export function drawRect(
  grid: number[][],
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  value: number,
  fill = false
): number[][] {
  const next = grid.map(row => [...row]);
  const rows = next.length;
  const cols = rows > 0 ? next[0].length : 0;
  const minR = Math.min(r0, r1);
  const maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1);
  const maxC = Math.max(c0, c1);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const isEdge = r === minR || r === maxR || c === minC || c === maxC;
      if (fill || isEdge) next[r][c] = value;
    }
  }
  return next;
}

/**
 * 圆（中点画圆算法）
 */
export function drawCircle(
  grid: number[][],
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  value: number,
  fill = false
): number[][] {
  const next = grid.map(row => [...row]);
  const rows = next.length;
  const cols = rows > 0 ? next[0].length : 0;
  // 半径 = 起点到终点的距离
  const radius = Math.max(1, Math.round(Math.hypot(r1 - r0, c1 - c0)));
  const cx = c0;
  const cy = r0;

  if (fill) {
    // 填充圆
    for (let r = Math.max(0, cy - radius); r <= Math.min(rows - 1, cy + radius); r++) {
      for (let c = Math.max(0, cx - radius); c <= Math.min(cols - 1, cx + radius); c++) {
        if (Math.hypot(c - cx, r - cy) <= radius) next[r][c] = value;
      }
    }
    return next;
  }

  // 描边圆（中点画圆）
  let x = radius;
  let y = 0;
  let err = 0;
  const setPixel = (px: number, py: number) => {
    if (px >= 0 && px < cols && py >= 0 && py < rows) next[py][px] = value;
  };
  while (x >= y) {
    setPixel(cx + x, cy + y);
    setPixel(cx + y, cy + x);
    setPixel(cx - y, cy + x);
    setPixel(cx - x, cy + y);
    setPixel(cx - x, cy - y);
    setPixel(cx - y, cy - x);
    setPixel(cx + y, cy - x);
    setPixel(cx + x, cy - y);
    if (err <= 0) { y += 1; err += 2 * y + 1; }
    if (err > 0) { x -= 1; err -= 2 * x + 1; }
  }
  return next;
}

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'both';

/**
 * 应用对称：根据对称模式镜像坐标
 */
export function applySymmetry(
  r: number,
  c: number,
  rows: number,
  cols: number,
  mode: SymmetryMode
): [number, number][] {
  const points: [number, number][] = [[r, c]];
  const mirrorH: [number, number] = [r, cols - 1 - c];
  const mirrorV: [number, number] = [rows - 1 - r, c];
  const mirrorHV: [number, number] = [rows - 1 - r, cols - 1 - c];
  if (mode === 'horizontal') {
    points.push(mirrorH);
  } else if (mode === 'vertical') {
    points.push(mirrorV);
  } else if (mode === 'both') {
    points.push(mirrorH, mirrorV, mirrorHV);
  }
  return points;
}

/**
 * 在多个对称点同时绘制
 */
export function paintWithSymmetry(
  grid: number[][],
  r: number,
  c: number,
  value: number,
  mode: SymmetryMode
): number[][] {
  const next = grid.map(row => [...row]);
  const rows = next.length;
  const cols = rows > 0 ? next[0].length : 0;
  const points = applySymmetry(r, c, rows, cols, mode);
  for (const [pr, pc] of points) {
    if (pr >= 0 && pr < rows && pc >= 0 && pc < cols) {
      next[pr][pc] = value;
    }
  }
  return next;
}

/**
 * 对形状应用对称（对整个形状的起点终点做镜像后绘制）
 */
export function drawShapeWithSymmetry(
  grid: number[][],
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  value: number,
  shape: ShapeTool,
  mode: SymmetryMode
): number[][] {
  let next = grid.map(row => [...row]);
  const rows = next.length;
  const cols = rows > 0 ? next[0].length : 0;
  // 收集所有对称的起点终点对
  const pairs: [number, number, number, number][] = [[r0, c0, r1, c1]];
  if (mode === 'horizontal') {
    pairs.push([r0, cols - 1 - c0, r1, cols - 1 - c1]);
  } else if (mode === 'vertical') {
    pairs.push([rows - 1 - r0, c0, rows - 1 - r1, c1]);
  } else if (mode === 'both') {
    pairs.push([r0, cols - 1 - c0, r1, cols - 1 - c1]);
    pairs.push([rows - 1 - r0, c0, rows - 1 - r1, c1]);
    pairs.push([rows - 1 - r0, cols - 1 - c0, rows - 1 - r1, cols - 1 - c1]);
  }
  for (const [sr0, sc0, sr1, sc1] of pairs) {
    if (shape === 'line') {
      next = drawLine(next, sr0, sc0, sr1, sc1, value);
    } else if (shape === 'rect') {
      next = drawRect(next, sr0, sc0, sr1, sc1, value, false);
    } else if (shape === 'rectFill') {
      next = drawRect(next, sr0, sc0, sr1, sc1, value, true);
    } else if (shape === 'circle') {
      next = drawCircle(next, sr0, sc0, sr1, sc1, value, false);
    } else if (shape === 'circleFill') {
      next = drawCircle(next, sr0, sc0, sr1, sc1, value, true);
    }
  }
  return next;
}
