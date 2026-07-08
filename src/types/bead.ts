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
  /** 模板标识码（用于跨设备/服务端去重，如 gen-xxxx 或 sha 短摘要） */
  code?: string;
  /** 创建时间 ISO 字符串（自定义模板有值，内置模板可省略） */
  createdAt?: string;
  /** 最后更新时间 ISO 字符串 */
  updatedAt?: string;
  /** 数据 schema 版本号，用于未来数据迁移（当前版本 2） */
  version?: number;
  /** 作者标识（用户自定义模板可填本地用户名，未来对接用户系统） */
  author?: string;
  /** 来源标识：builtin 内置 | upload 上传生成 | ai AI 生成 | imported 导入 */
  origin?: 'builtin' | 'upload' | 'ai' | 'imported';
  /** Remix/Fork 派生来源：父模板 ID */
  originParentId?: string;
  /** Remix/Fork 派生来源：父模板名称 */
  originParentName?: string;
  /** 派生深度（0=原创，1=一次 Remix，2=Remix 的 Remix...） */
  remixDepth?: number;
  /** 是否为 Remix 模板 */
  isRemix?: boolean;
}

/** 数据 schema 版本号，用于备份导入时的兼容性判断 */
export const DATA_SCHEMA_VERSION = 2;

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
