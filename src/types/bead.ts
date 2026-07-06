export interface ColorInfo {
  hex: string;
  name: string;
  count: number;
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
