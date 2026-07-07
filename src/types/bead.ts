export interface ColorInfo {
  hex: string;
  name: string;
  /** 该色在 grid 中的用量；运行时由 getCorrectedColors 重算，JSON 中可省略 */
  count?: number;
  /** 品牌色号（可选，如 Perler P-01 / Artkal A-01） */
  code?: string;
}

export interface BeadTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  grid: number[][];
  colors: ColorInfo[];
  beadCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  source: string;
  /** 封面图路径（SVG/JPG/PNG），相对 public 根；缺省时回退到 PixelGrid 缩略图 */
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  sortOrder: number;
}

export type ThemeMode = 'light' | 'dark';

export interface FavoriteEntry {
  templateId: string;
  favoritedAt: string;
}
