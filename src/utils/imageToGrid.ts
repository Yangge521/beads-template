import type { BeadTemplate, ColorInfo } from '../types/bead';

/**
 * 将图片像素化为拼豆 grid。
 * 流程：
 * 1. 把图片绘制到 canvas，缩放到目标网格尺寸
 * 2. 读取每个格子的像素，按亮度+色相量化
 * 3. 提取主色（去重 + 合并相近色）
 * 4. 生成 grid（数字矩阵）+ colors 数组
 */

interface PixelizeOptions {
  /** 目标网格最大边长（像素），保持原图比例 */
  maxGridSize?: number;
  /** 颜色量化：相近色合并阈值（0-1，越大合并越激进） */
  colorThreshold?: number;
  /** 是否丢弃近白色背景（透明化） */
  dropBackground?: boolean;
  /** 背景判定阈值（亮度高于此值视为背景，0-255） */
  backgroundLuminance?: number;
  /** 颜色名称前缀（本地化），生成形如「颜色 1」的占位名 */
  colorNamePrefix?: string;
}

interface PixelizeResult {
  grid: number[][];
  colors: ColorInfo[];
}

/** RGB 转 HSL */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

/** 颜色距离（加权 HSL 距离，比 RGB 更符合视觉） */
function colorDistance(
  h1: number, s1: number, l1: number,
  h2: number, s2: number, l2: number
): number {
  // 色相用环形距离
  const dh = Math.min(Math.abs(h1 - h2), 1 - Math.abs(h1 - h2));
  const ds = Math.abs(s1 - s2);
  const dl = Math.abs(l1 - l2);
  // 亮度权重最大，色相次之，饱和度最小
  return Math.sqrt(0.4 * dh * dh + 0.2 * ds * ds + 0.4 * dl * dl);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/**
 * 把图片元素像素化为 grid + colors。
 * 返回 null 表示输入无效。
 */
export function pixelizeImage(
  img: HTMLImageElement,
  options: PixelizeOptions = {}
): PixelizeResult | null {
  const {
    maxGridSize = 32,
    colorThreshold = 0.08,
    dropBackground = true,
    backgroundLuminance = 235,
    colorNamePrefix = 'Color',
  } = options;

  // 按原图比例缩放到 maxGridSize 内
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (naturalW <= 0 || naturalH <= 0) return null;

  const ratio = Math.min(maxGridSize / naturalW, maxGridSize / naturalH);
  const cols = Math.max(1, Math.round(naturalW * ratio));
  const rows = Math.max(1, Math.round(naturalH * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // 关闭平滑以保留像素感
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, 0, 0, cols, rows);

  const imgData = ctx.getImageData(0, 0, cols, rows);
  const data = imgData.data;

  // 收集每个格子的 RGB（含 alpha）
  interface Cell {
    r: number; g: number; b: number; a: number;
    h: number; s: number; l: number;
    isBg: boolean;
  }
  const cells: Cell[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const [h, s, l] = rgbToHsl(r, g, b);
    // 背景判定：透明像素 或（开启去背景且亮度过高且饱和度极低）
    const isBg = a < 128 || (dropBackground && l * 255 > backgroundLuminance && s < 0.15);
    cells.push({ r, g, b, a, h, s, l, isBg });
  }

  // 颜色聚类：贪心合并相近色
  const palette: { hex: string; h: number; s: number; l: number; count: number }[] = [];
  for (const cell of cells) {
    if (cell.isBg) continue;
    let merged = false;
    for (const p of palette) {
      if (colorDistance(cell.h, cell.s, cell.l, p.h, p.s, p.l) < colorThreshold) {
        // 加权平均合并
        const total = p.count + 1;
        p.h = (p.h * p.count + cell.h) / total;
        p.s = (p.s * p.count + cell.s) / total;
        p.l = (p.l * p.count + cell.l) / total;
        p.count = total;
        merged = true;
        break;
      }
    }
    if (!merged) {
      palette.push({ hex: rgbToHex(cell.r, cell.g, cell.b), h: cell.h, s: cell.s, l: cell.l, count: 1 });
    }
  }

  // 过滤掉占比极小的噪点色（< 1%）
  const totalNonBg = cells.filter(c => !c.isBg).length;
  const filteredPalette = palette
    .filter(p => p.count / Math.max(1, totalNonBg) > 0.01)
    .sort((a, b) => b.count - a.count);

  // 限制最多 16 色（避免太碎）
  const finalPalette = filteredPalette.slice(0, 16);

  // 按最终 palette 重新映射每个格子到最近色
  // 生成 colors 数组（含运行时统计的 count）
  const colorInfos: ColorInfo[] = finalPalette.map((p, idx) => ({
    hex: rgbToHex(
      ...hslToRgb(p.h, p.s, p.l)
    ),
    name: `${colorNamePrefix} ${idx + 1}`,
    count: 0,
  }));

  // 生成 grid
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c];
      if (cell.isBg) {
        row.push(0);
        continue;
      }
      // 找最近色
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < finalPalette.length; i++) {
        const p = finalPalette[i];
        const d = colorDistance(cell.h, cell.s, cell.l, p.h, p.s, p.l);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      row.push(bestIdx + 1);
      colorInfos[bestIdx].count++;
    }
    grid.push(row);
  }

  return { grid, colors: colorInfos };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

/** 从 File 加载为 HTMLImageElement */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** 构建模板时使用的本地化标签（由调用方通过 i18n 提供） */
export interface BuildTemplateLabels {
  /** 默认模板名（用户未输入名称时使用） */
  defaultName: string;
  /** 描述文案模板，支持 {cols} {rows} {colors} 占位 */
  description: string;
  /** 标签数组（语言相关） */
  tags: string[];
  /** 来源标注 */
  source: string;
  /** 颜色名称前缀，生成形如「颜色 1」 */
  colorNamePrefix: string;
}

/** 根据上传图片生成完整的 BeadTemplate（不含 id，由调用方填充） */
export function buildTemplateFromImage(
  img: HTMLImageElement,
  name: string,
  options: PixelizeOptions & { labels?: BuildTemplateLabels } = {}
): Omit<BeadTemplate, 'id'> & { id?: string } {
  const { labels, ...pixelizeOpts } = options;
  const result = pixelizeImage(img, {
    ...pixelizeOpts,
    colorNamePrefix: labels?.colorNamePrefix,
  });
  if (!result) {
    throw new Error('图片像素化失败');
  }
  const { grid, colors } = result;
  const beadCount = grid.flat().filter(v => v > 0).length;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  // 根据尺寸判断难度
  const maxDim = Math.max(rows, cols);
  const difficulty: BeadTemplate['difficulty'] =
    maxDim <= 16 ? 'easy' : maxDim <= 24 ? 'medium' : 'hard';

  const descTemplate = labels?.description ?? 'Auto-generated · {cols}×{rows} · {colors} colors';
  const description = descTemplate
    .replace('{cols}', String(cols))
    .replace('{rows}', String(rows))
    .replace('{colors}', String(colors.length));

  return {
    name: name || labels?.defaultName || 'Custom template',
    category: 'custom',
    description,
    grid,
    colors,
    beadCount,
    difficulty,
    tags: labels?.tags ?? ['custom', 'upload'],
    source: labels?.source ?? 'User upload',
  };
}
