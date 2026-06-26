/**
 * 网格编辑工具函数
 */

/** 深拷贝网格 */
export function cloneGrid(grid: number[][]): number[][] {
  return grid.map(r => [...r]);
}

/**
 * 洪水填充：从 (row, col) 开始，把所有与起点相同值且连通的格子替换为 newValue
 * 使用迭代式 BFS 避免大网格栈溢出
 */
export function floodFill(
  grid: number[][],
  row: number,
  col: number,
  newValue: number
): number[][] {
  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0].length;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return grid;

  const target = grid[row][col];
  if (target === newValue) return grid; // 无需填充

  const result = cloneGrid(grid);
  const queue: [number, number][] = [[row, col]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r}-${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (result[r][c] !== target) continue;
    result[r][c] = newValue;
    queue.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
  return result;
}

/**
 * 调整网格尺寸：保留已有内容，新增格子填充 0（空白）
 */
export function resizeGrid(
  grid: number[][],
  newRows: number,
  newCols: number
): number[][] {
  const result: number[][] = [];
  for (let r = 0; r < newRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < newCols; c++) {
      row.push(grid[r]?.[c] ?? 0);
    }
    result.push(row);
  }
  return result;
}

/**
 * 统计网格中各颜色索引的实际使用量，返回 Map<colorIndex, count>
 * colorIndex 从 1 开始，0 表示空白
 */
export function countColorUsage(grid: number[][]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of grid) {
    for (const v of row) {
      if (v > 0) {
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
  }
  return counts;
}

/**
 * 重新分配颜色索引：移除未使用的颜色，紧凑索引
 * 返回 { grid: 新网格, colors: 新色卡, mapping: 旧索引->新索引 }
 */
export function compactColors(
  grid: number[][],
  colors: { hex: string; name: string }[]
): { grid: number[][]; colors: { hex: string; name: string; count: number }[] } {
  const usage = countColorUsage(grid);
  const usedIndices = Array.from(usage.keys()).sort((a, b) => a - b);

  // 旧索引(1-based) -> 新索引(1-based)
  const mapping = new Map<number, number>();
  const newColors: { hex: string; name: string; count: number }[] = [];

  usedIndices.forEach((oldIdx, i) => {
    const newIdx = i + 1;
    mapping.set(oldIdx, newIdx);
    const oldColor = colors[oldIdx - 1];
    if (oldColor) {
      newColors.push({
        hex: oldColor.hex,
        name: oldColor.name,
        count: usage.get(oldIdx) || 0,
      });
    }
  });

  // 重建网格
  const newGrid = grid.map(row => row.map(v => (v > 0 ? (mapping.get(v) || 0) : 0)));

  return { grid: newGrid, colors: newColors };
}
