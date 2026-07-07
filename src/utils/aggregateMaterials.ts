import type { BeadTemplate } from '../types/bead';
import { getCorrectedColors } from './beadStats';

/** 材料汇总项：按颜色 hex 聚合跨模板需求 */
export interface MaterialSummaryItem {
  hex: string;
  name: string;
  count: number;
  templateCount: number;
}

/**
 * 跨模板聚合材料需求：按 hex 合并所有模板的颜色用量。
 * 同一模板内相同 hex 只计一次 templateCount（避免同模板多区域重复计数）。
 * 颜色名称取首次遇到的（同 hex 不同名时以第一个为准）。
 */
export function aggregateMaterials(templates: BeadTemplate[]): MaterialSummaryItem[] {
  const map = new Map<string, MaterialSummaryItem>();
  for (const tpl of templates) {
    const colors = getCorrectedColors(tpl);
    const seen = new Set<string>();
    for (const c of colors) {
      const count = c.count ?? 0;
      if (count <= 0) continue;
      const key = c.hex.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { hex: c.hex, name: c.name, count: 0, templateCount: 0 });
      }
      const item = map.get(key)!;
      item.count += count;
      if (!seen.has(key)) {
        item.templateCount++;
        seen.add(key);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/** 汇总总颗数 */
export function getTotalBeads(items: MaterialSummaryItem[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}
