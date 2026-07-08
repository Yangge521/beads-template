/**
 * 品牌间色号映射与跨品牌相似色推荐工具
 * 支持 Perler（美国）、Artkal（中国）、Hama（德国）、Nabbi（瑞典）四大主流品牌
 * 通过加权欧氏距离（R*0.3 + G*0.59 + B*0.11）计算颜色相似度，
 * 符合人眼对绿色通道更敏感的感知特性
 */

import { BEAD_COLOR_GROUPS, type BeadColor } from '../data/beadColors';

/** 四大主流品牌键类型 */
export type MainBrand = 'perler' | 'artkal' | 'hama' | 'nabbi';

/** 跨品牌匹配结果 */
export interface CrossBrandMatch {
  hex: string;
  code: string;
  name: string;
  /** 与目标颜色的加权欧氏距离，越小越相似 */
  distance: number;
}

/** 四大主流品牌列表（用于遍历与校验） */
export const MAIN_BRANDS: MainBrand[] = ['perler', 'artkal', 'hama', 'nabbi'];

/** 扁平化所有色卡颜色 */
const ALL_COLORS: BeadColor[] = BEAD_COLOR_GROUPS.flatMap(g => g.colors);

/** hex -> BeadColor 映射（大小写不敏感） */
const HEX_MAP = new Map<string, BeadColor>();
for (const c of ALL_COLORS) {
  HEX_MAP.set(c.hex.toLowerCase(), c);
}

/** 品牌色板条目 */
interface PaletteEntry {
  hex: string;
  code: string;
  name: string;
}

/** 各品牌的色板：brand -> 颜色列表（仅包含该品牌有色号的颜色） */
const BRAND_PALETTE: Record<MainBrand, PaletteEntry[]> = {
  perler: [],
  artkal: [],
  hama: [],
  nabbi: [],
};
for (const c of ALL_COLORS) {
  for (const brand of MAIN_BRANDS) {
    const code = c[brand];
    if (typeof code === 'string' && code) {
      BRAND_PALETTE[brand].push({ hex: c.hex, code, name: c.name });
    }
  }
}

/**
 * 品牌间色号映射表
 * 以 hex 为锚点，记录每个颜色在四大主流品牌中的对应色号
 * 用于跨品牌相似色推荐与色号对照查询
 */
export const CROSS_BRAND_REFERENCE_TABLE: Array<{
  hex: string;
  name: string;
  perler?: string;
  artkal?: string;
  hama?: string;
  nabbi?: string;
}> = ALL_COLORS.map(c => ({
  hex: c.hex,
  name: c.name,
  perler: c.perler,
  artkal: c.artkal,
  hama: c.hama,
  nabbi: c.nabbi,
})).filter(c => c.perler || c.artkal || c.hama || c.nabbi);

/** 将 hex 字符串解析为 RGB 分量，无效时返回 null */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * 计算两个 RGB 颜色之间的加权欧氏距离
 * 权重：R*0.3 + G*0.59 + B*0.11
 */
function weightedColorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

/**
 * 在目标品牌色板中查找与指定 hex 最接近的颜色（跨品牌相似色推荐）
 * @param hex 待匹配的颜色（来自 fromBrand）
 * @param fromBrand 源品牌，必须为四大主流品牌之一
 * @param toBrand 目标品牌，必须为四大主流品牌之一
 * @returns 最接近的匹配结果；若 hex 无效或品牌参数非法则返回 null
 */
export function findCrossBrandMatch(
  hex: string,
  fromBrand: string,
  toBrand: string
): CrossBrandMatch | null {
  // 校验品牌参数是否为四大主流品牌之一
  if (!MAIN_BRANDS.includes(fromBrand as MainBrand)) return null;
  if (!MAIN_BRANDS.includes(toBrand as MainBrand)) return null;

  const target = hexToRgb(hex);
  if (!target) return null;

  const palette = BRAND_PALETTE[toBrand as MainBrand];
  if (!palette || palette.length === 0) return null;

  let best: CrossBrandMatch | null = null;
  for (const entry of palette) {
    const rgb = hexToRgb(entry.hex);
    if (!rgb) continue;
    const distance = weightedColorDistance(target, rgb);
    if (best === null || distance < best.distance) {
      best = { hex: entry.hex, code: entry.code, name: entry.name, distance };
    }
  }
  return best;
}

/**
 * 根据颜色 hex 获取四大主流品牌的色号
 * @param hex 颜色 hex 值
 * @returns 各品牌色号对象；若 hex 不在色卡库中返回空对象
 */
export function getAllBrandCodes(hex: string): {
  perler?: string;
  artkal?: string;
  hama?: string;
  nabbi?: string;
} {
  const color = HEX_MAP.get(hex.toLowerCase());
  if (!color) return {};
  const result: { perler?: string; artkal?: string; hama?: string; nabbi?: string } = {};
  if (color.perler) result.perler = color.perler;
  if (color.artkal) result.artkal = color.artkal;
  if (color.hama) result.hama = color.hama;
  if (color.nabbi) result.nabbi = color.nabbi;
  return result;
}
