import type { BeadTemplate, ColorInfo } from '../types/bead';
import { findClosestColor } from './colorDistance';

/** 缺色检测结果 */
export interface MissingColorInfo {
  /** 原始颜色 hex */
  hex: string;
  /** 原始颜色名称 */
  name: string;
  /** 该色用量 */
  count: number;
  /** 库存中最接近的颜色 hex（无库存时为 null） */
  replacement: string | null;
  /** 与替换色的距离（0-1，越小越接近；无替换时为 Infinity） */
  distance: number;
}

/**
 * 检测模板中库存缺少的颜色，并推荐最接近的库存替换色。
 * @param template 拼豆模板
 * @param inventoryHexes 库存颜色 hex 数组
 * @param threshold 替换推荐阈值（距离超过此值则视为"无合适替换"），默认 0.15
 */
export function detectMissingColors(
  template: BeadTemplate,
  inventoryHexes: string[],
  threshold = 0.15
): MissingColorInfo[] {
  const result: MissingColorInfo[] = [];
  const inventorySet = new Set(
    inventoryHexes.filter((h): h is string => typeof h === 'string').map(h => h.toLowerCase())
  );
  const colors = template.colors;
  // 用 grid 实际用量统计
  const counts: number[] = [];
  for (const row of template.grid) {
    for (const v of row) {
      if (v > 0) counts[v - 1] = (counts[v - 1] || 0) + 1;
    }
  }
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    if (!c || !c.hex) continue;
    const count = counts[i] ?? 0;
    if (count <= 0) continue;
    const hexLower = c.hex.toLowerCase();
    if (inventorySet.has(hexLower)) continue; // 库存有，跳过
    const [replacement, dist] = findClosestColor(c.hex, inventoryHexes);
    result.push({
      hex: c.hex,
      name: c.name,
      count,
      replacement: dist <= threshold ? replacement : null,
      distance: dist,
    });
  }
  return result.sort((a, b) => b.count - a.count);
}

/**
 * 应用颜色替换到模板，返回新 colors 数组（hex 被替换为库存色）。
 * 注意：此函数不修改 grid，仅替换 colors 中的 hex，相同 hex 的颜色会被合并。
 * 仅替换用户确认的（replacement 非 null 的）颜色。
 */
export function applyColorReplacements(
  colors: ColorInfo[],
  replacements: MissingColorInfo[]
): ColorInfo[] {
  const map = new Map<string, string>();
  for (const r of replacements) {
    if (r.replacement && r.hex) {
      map.set(r.hex.toLowerCase(), r.replacement);
    }
  }
  return colors.map(c => {
    if (!c || !c.hex) return c;
    const newHex = map.get(c.hex.toLowerCase());
    return newHex ? { ...c, hex: newHex } : c;
  });
}

/** 判断两个 hex 是否相同（大小写不敏感） */
export function isSameColor(hex1: string, hex2: string): boolean {
  return hex1.toLowerCase() === hex2.toLowerCase();
}

/** 获取颜色距离等级（用于 UI 展示） */
export function getDistanceLevel(distance: number): 'close' | 'medium' | 'far' {
  if (distance <= 0.05) return 'close';
  if (distance <= 0.12) return 'medium';
  return 'far';
}
