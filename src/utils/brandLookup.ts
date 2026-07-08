import { BEAD_COLOR_GROUPS, type BeadColor } from '../data/beadColors';

/** 品牌键类型 */
export type BrandKey = 'perler' | 'artkal' | 'hama' | 'nabbi' | 'mixiaowo' | 'manman' | 'coco';

/** 所有品牌键（用于遍历） */
export const ALL_BRAND_KEYS: BrandKey[] = ['perler', 'artkal', 'hama', 'nabbi', 'mixiaowo', 'manman', 'coco'];

/** 品牌显示名称 i18n 键 */
export const BRAND_LABEL_KEYS: Record<BrandKey, string> = {
  perler: 'colorRef.brand.perler',
  artkal: 'colorRef.brand.artkal',
  hama: 'colorRef.brand.hama',
  nabbi: 'colorRef.brand.nabbi',
  mixiaowo: 'colorRef.brand.mixiaowo',
  manman: 'colorRef.brand.manman',
  coco: 'colorRef.brand.coco',
};

/** 扁平化所有色卡颜色 */
const ALL_COLORS: BeadColor[] = BEAD_COLOR_GROUPS.flatMap(g => g.colors);

/** hex -> BeadColor 映射（大小写不敏感） */
const HEX_MAP = new Map<string, BeadColor>();
for (const c of ALL_COLORS) {
  HEX_MAP.set(c.hex.toLowerCase(), c);
}

/**
 * 根据 hex 查找色卡中的品牌色号信息。
 * @returns 包含所有可用品牌色号的对象；未在色卡库中返回 null
 */
export function lookupByHex(hex: string): BeadColor | null {
  return HEX_MAP.get(hex.toLowerCase()) || null;
}

/**
 * 根据品牌色号查找（模糊匹配，大小写不敏感）。
 * @returns 匹配的 BeadColor 数组（可能多个，因为同品牌不同色系可能有相似色号）
 */
export function lookupByBrandCode(brand: BrandKey, code: string): BeadColor[] {
  const lower = code.trim().toLowerCase();
  if (!lower) return [];
  return ALL_COLORS.filter(c => {
    const v = c[brand];
    return typeof v === 'string' && v.toLowerCase().includes(lower);
  });
}

/** 获取某颜色的所有品牌色号（已填充的） */
export function getBrandCodes(color: BeadColor): Partial<Record<BrandKey, string>> {
  const result: Partial<Record<BrandKey, string>> = {};
  for (const key of ALL_BRAND_KEYS) {
    const v = color[key];
    if (typeof v === 'string' && v) {
      result[key] = v;
    }
  }
  return result;
}
