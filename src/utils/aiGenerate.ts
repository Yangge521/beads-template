/**
 * AI 文字生成图纸引擎（本地版）
 *
 * 策略：基于用户输入的提示词，通过分词+关键词加权评分，
 * 在内置模板库中检索最相似的模板作为生成结果。
 * 同时支持主题色提取（从提示词中识别颜色词），
 * 以及预设形状快速生成（爱心/星形/笑脸等几何图案）。
 *
 * 设计目标：无外部 API 依赖即可工作，未来可平滑接入真实文本生成图像 API。
 */

import type { BeadTemplate, ColorInfo } from '../types/bead';

// 简单中文/英文分词：按空格、标点切分；中文按字逐个加入（用于包含匹配）
function tokenize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase().trim();
  // 英文/数字按非字母数字分割
  const en = lower.match(/[a-z0-9]+/g) || [];
  // 中文：逐字 + 双字组合
  const cn = lower.match(/[\u4e00-\u9fa5]+/g) || [];
  const cnTokens: string[] = [];
  for (const seg of cn) {
    for (let i = 0; i < seg.length; i++) {
      cnTokens.push(seg[i]);
      if (i + 1 < seg.length) cnTokens.push(seg.slice(i, i + 2));
    }
  }
  return [...en, ...cnTokens];
}

export interface AIMatchResult {
  template: BeadTemplate;
  score: number;
  matchedKeywords: string[];
}

/**
 * 根据提示词在模板库中智能匹配
 */
export function matchTemplatesByPrompt(
  prompt: string,
  library: BeadTemplate[],
  limit = 6
): AIMatchResult[] {
  const tokens = tokenize(prompt);
  if (tokens.length === 0) return [];

  const results: AIMatchResult[] = [];
  for (const tpl of library) {
    const haystack = [
      tpl.name.toLowerCase(),
      tpl.category,
      tpl.description.toLowerCase(),
      tpl.tags.join(' ').toLowerCase(),
    ].join(' ');

    let score = 0;
    const matched: string[] = [];
    const seen = new Set<string>();
    for (const tok of tokens) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      if (!haystack.includes(tok)) continue;
      matched.push(tok);
      // 名称命中权重最高
      if (tpl.name.toLowerCase().includes(tok)) score += 5;
      // 标签命中次之
      if (tpl.tags.join(' ').toLowerCase().includes(tok)) score += 3;
      // 分类命中
      if (tpl.category.toLowerCase().includes(tok)) score += 2;
      // 描述命中
      if (tpl.description.toLowerCase().includes(tok)) score += 1;
    }
    if (score > 0) results.push({ template: tpl, score, matchedKeywords: matched });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ---------- 预设形状快速生成 ----------

const PRESET_COLORS: ColorInfo[] = [
  { hex: '#ef4444', name: 'red', count: 0 },
  { hex: '#f59e0b', name: 'orange', count: 0 },
  { hex: '#facc15', name: 'yellow', count: 0 },
  { hex: '#22c55e', name: 'green', count: 0 },
  { hex: '#3b82f6', name: 'blue', count: 0 },
  { hex: '#a855f7', name: 'purple', count: 0 },
  { hex: '#ec4899', name: 'pink', count: 0 },
  { hex: '#111827', name: 'black', count: 0 },
  { hex: '#ffffff', name: 'white', count: 0 },
];

export type PresetShape = 'heart' | 'star' | 'smile' | 'flower' | 'diamond' | 'cat';

const PRESET_KEYWORDS: Record<string, string[]> = {
  heart: ['heart', '爱心', '心', 'love', '爱'],
  star: ['star', '星', '星星', '五角星'],
  smile: ['smile', '笑脸', '开心', 'happy', 'emoji'],
  flower: ['flower', '花', '花朵', '玫瑰'],
  diamond: ['diamond', '钻石', '宝石', 'gem'],
  cat: ['cat', '猫', '猫咪', '小猫'],
};

/**
 * 根据提示词匹配预设形状
 */
export function matchPresetShape(prompt: string): PresetShape | null {
  const lower = (prompt || '').toLowerCase();
  for (const [shape, kws] of Object.entries(PRESET_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return shape as PresetShape;
  }
  return null;
}

function emptyGrid(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function buildHeart(size: number): number[][] {
  const g = emptyGrid(size);
  const mid = size / 2;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = c - mid + 0.5;
      const y = r - mid + 0.5;
      // 心形方程：(x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0，缩放到网格
      const nx = x / (mid * 0.9);
      const ny = -y / (mid * 0.9); // y 翻转
      const expr = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
      if (expr <= 0) g[r][c] = 1; // red
    }
  }
  return g;
}

function buildStar(size: number): number[][] {
  const g = emptyGrid(size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outer = size / 2 - 0.5;
  const inner = outer * 0.4;
  const points = 5;
  const verts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const ang = (Math.PI * i) / points - Math.PI / 2;
    verts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pointInPolygon(c + 0.5, r + 0.5, verts)) g[r][c] = 3; // yellow
    }
  }
  return g;
}

function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildSmile(size: number): number[][] {
  const g = emptyGrid(size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size / 2 - 0.5;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const d = Math.hypot(c - cx, r - cy);
      if (d <= radius) g[r][c] = 4; // yellow face
    }
  }
  // 眼睛
  const eyeR = Math.max(1, Math.floor(size / 10));
  const eyeOffsetX = size * 0.25;
  const eyeOffsetY = size * 0.3;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dL = Math.hypot(c - cx + eyeOffsetX, r - cy + eyeOffsetY);
      const dR = Math.hypot(c - cx - eyeOffsetX, r - cy + eyeOffsetY);
      if (dL <= eyeR || dR <= eyeR) g[r][c] = 8; // black
    }
  }
  // 嘴巴（弧线）
  const mouthR = radius * 0.5;
  for (let c = 0; c < size; c++) {
    const dx = c - cx;
    if (Math.abs(dx) > mouthR) continue;
    const dy = Math.sqrt(mouthR * mouthR - dx * dx);
    const mr = Math.round(cy + mouthR * 0.5 + dy * 0.3);
    if (mr >= 0 && mr < size) g[mr][c] = 8;
  }
  return g;
}

function buildFlower(size: number): number[][] {
  const g = emptyGrid(size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const petalR = size / 4;
  const centers: [number, number][] = [
    [cx, cy - petalR],
    [cx, cy + petalR],
    [cx - petalR, cy],
    [cx + petalR, cy],
  ];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [px, py] of centers) {
        if (Math.hypot(c - px, r - py) <= petalR) {
          g[r][c] = 7; // pink
          break;
        }
      }
      // 花心
      if (Math.hypot(c - cx, r - cy) <= petalR * 0.5) g[r][c] = 3; // yellow
    }
  }
  return g;
}

function buildDiamond(size: number): number[][] {
  const g = emptyGrid(size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const half = size / 2;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const d = Math.abs(c - cx) + Math.abs(r - cy);
      if (d <= half) g[r][c] = 6; // purple
      if (d <= half * 0.5) g[r][c] = 4; // green inner
    }
  }
  return g;
}

function buildCat(size: number): number[][] {
  const g = emptyGrid(size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const headR = size / 2 - 1;
  // 头
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.hypot(c - cx, r - cy) <= headR) g[r][c] = 2; // orange
    }
  }
  // 耳朵（三角形）
  const earSize = Math.max(2, Math.floor(size / 5));
  for (let r = 0; r < earSize; r++) {
    for (let c = 0; c < earSize - r; c++) {
      // 左耳
      const lr = Math.floor(cy - headR + r * 0.3);
      const lc = Math.floor(cx - headR + c * 0.5);
      if (lr >= 0 && lr < size && lc >= 0 && lc < size) g[lr][lc] = 2;
      // 右耳
      const rc = Math.floor(cx + headR - c * 0.5);
      if (lr >= 0 && lr < size && rc >= 0 && rc < size) g[lr][rc] = 2;
    }
  }
  // 眼睛
  const eyeOff = Math.floor(size * 0.2);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.hypot(c - cx + eyeOff, r - cy + eyeOff * 0.3) <= 1) g[r][c] = 8;
      if (Math.hypot(c - cx - eyeOff, r - cy + eyeOff * 0.3) <= 1) g[r][c] = 8;
    }
  }
  return g;
}

const SHAPE_BUILDERS: Record<PresetShape, (size: number) => number[][]> = {
  heart: buildHeart,
  star: buildStar,
  smile: buildSmile,
  flower: buildFlower,
  diamond: buildDiamond,
  cat: buildCat,
};

export interface PresetGenerateResult {
  grid: number[][];
  colors: ColorInfo[];
  shape: PresetShape;
}

/**
 * 根据预设形状生成模板
 */
export function generatePresetShape(
  shape: PresetShape,
  size = 16
): PresetGenerateResult {
  const safeSize = Math.max(8, Math.min(40, Math.floor(size)));
  const builder = SHAPE_BUILDERS[shape];
  const grid = builder(safeSize);
  // 统计颜色用量并精简调色板
  const usedIdx = new Set<number>();
  for (const row of grid) for (const v of row) if (v > 0) usedIdx.add(v);
  const colors: ColorInfo[] = [];
  for (const idx of usedIdx) {
    const base = PRESET_COLORS[idx - 1];
    if (base) {
      let count = 0;
      for (const row of grid) for (const v of row) if (v === idx) count++;
      colors.push({ hex: base.hex, name: base.name, count });
    }
  }
  return { grid, colors, shape };
}

/**
 * 根据预设形状生成模板（使用自定义配色方案）
 * @param palette 自定义颜色数组（hex）
 * @param colorNames 对应颜色名称
 */
export function generatePresetShapeWithStyle(
  shape: PresetShape,
  size = 16,
  palette: string[] = [],
  colorNames: string[] = []
): PresetGenerateResult {
  const safeSize = Math.max(8, Math.min(40, Math.floor(size)));
  const builder = SHAPE_BUILDERS[shape];
  const grid = builder(safeSize);
  // 使用自定义配色覆盖默认 PRESET_COLORS
  const customColors: ColorInfo[] = palette.length > 0
    ? palette.map((hex, i) => ({ hex, name: colorNames[i] || `color${i + 1}`, count: 0 }))
    : PRESET_COLORS;
  const usedIdx = new Set<number>();
  for (const row of grid) for (const v of row) if (v > 0) usedIdx.add(v);
  const colors: ColorInfo[] = [];
  for (const idx of usedIdx) {
    const base = customColors[idx - 1];
    if (base) {
      let count = 0;
      for (const row of grid) for (const v of row) if (v === idx) count++;
      colors.push({ hex: base.hex, name: base.name, count });
    }
  }
  return { grid, colors, shape };
}

/**
 * 从提示词中提取目标网格尺寸（如 "32x32" "16格"）
 */
export function extractGridSize(prompt: string, defaultSize = 16): number {
  const m = prompt.match(/(\d+)\s*[x×*]\s*(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 8 && n <= 40) return n;
  }
  const m2 = prompt.match(/(\d+)\s*格/);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (n >= 8 && n <= 40) return n;
  }
  const m3 = prompt.match(/\b(small|medium|large|小|中|大)\b/i);
  if (m3) {
    const w = m3[1].toLowerCase();
    if (w === 'small' || w === '小') return 12;
    if (w === 'medium' || w === '中') return 20;
    if (w === 'large' || w === '大') return 32;
  }
  return defaultSize;
}
