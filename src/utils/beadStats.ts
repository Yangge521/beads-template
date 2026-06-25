import type { BeadTemplate, ColorInfo } from '../types/bead';

/**
 * 从 grid 运行时计算每色的实际颗数。
 * JSON 中的 colors[].count 可能与 grid 不一致，以此函数为准。
 */
export function computeColorCounts(grid: number[][]): number[] {
  const counts: number[] = [];
  for (const row of grid) {
    for (const v of row) {
      if (v > 0) {
        counts[v - 1] = (counts[v - 1] || 0) + 1;
      }
    }
  }
  return counts;
}

/** 从 grid 计算总颗数（非零格子数） */
export function computeBeadCount(grid: number[][]): number {
  let n = 0;
  for (const row of grid) {
    for (const v of row) {
      if (v > 0) n++;
    }
  }
  return n;
}

/** 返回带修正后 count 的 colors 数组 */
export function getCorrectedColors(template: BeadTemplate): ColorInfo[] {
  const counts = computeColorCounts(template.grid);
  return template.colors.map((c, i) => ({
    ...c,
    count: counts[i] ?? 0,
  }));
}

/** 获取修正后的总颗数 */
export function getBeadCount(template: BeadTemplate): number {
  return computeBeadCount(template.grid);
}
