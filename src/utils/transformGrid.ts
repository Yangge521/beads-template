/**
 * 网格变换工具：水平镜像、垂直镜像、顺时针旋转 90°。
 * 变换后的 grid 保持数值含义不变（颜色索引），仅改变排列。
 */

/** 退化网格守卫：空网格或无列网格直接返回，避免 rotate 改变形状 */
function isDegenerate(grid: number[][]): boolean {
  return grid.length === 0 || (grid.length > 0 && grid[0].length === 0);
}

/** 水平镜像（左右翻转） */
export function flipHorizontal(grid: number[][]): number[][] {
  if (isDegenerate(grid)) return grid;
  return grid.map(row => [...row].reverse());
}

/** 垂直镜像（上下翻转） */
export function flipVertical(grid: number[][]): number[][] {
  if (isDegenerate(grid)) return grid;
  return [...grid].reverse();
}

/** 顺时针旋转 90° */
export function rotate90(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return grid;
  const result: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(grid[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

/** 逆时针旋转 90°（= 顺时针旋转 270°） */
export function rotate270(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return grid;
  const result: number[][] = [];
  for (let c = cols - 1; c >= 0; c--) {
    const newRow: number[] = [];
    for (let r = 0; r < rows; r++) {
      newRow.push(grid[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

export type TransformType = 'flipH' | 'flipV' | 'rotate90' | 'rotate270';

export function applyTransform(grid: number[][], type: TransformType): number[][] {
  switch (type) {
    case 'flipH': return flipHorizontal(grid);
    case 'flipV': return flipVertical(grid);
    case 'rotate90': return rotate90(grid);
    case 'rotate270': return rotate270(grid);
    default: return grid;
  }
}
