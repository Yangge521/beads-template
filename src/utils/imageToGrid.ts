/**
 * 图生图引擎（本地版）
 *
 * 把上传的图片缩放到目标网格尺寸，对每个像素匹配最近的拼豆颜色，
 * 生成可直接使用的 bead grid。
 *
 * 同时分析主色调、亮度，自动生成描述性提示词（用于 AI 文字生成回退）。
 */

import type { ColorInfo, BeadTemplate } from '../types/bead';

/** 内置调色板（与 aiGenerate 预设色一致，便于生成结果互通） */
const BEAD_PALETTE: { hex: string; name: string; nameEn: string }[] = [
  { hex: '#ef4444', name: '红', nameEn: 'red' },
  { hex: '#f59e0b', name: '橙', nameEn: 'orange' },
  { hex: '#facc15', name: '黄', nameEn: 'yellow' },
  { hex: '#22c55e', name: '绿', nameEn: 'green' },
  { hex: '#3b82f6', name: '蓝', nameEn: 'blue' },
  { hex: '#a855f7', name: '紫', nameEn: 'purple' },
  { hex: '#ec4899', name: '粉', nameEn: 'pink' },
  { hex: '#111827', name: '黑', nameEn: 'black' },
  { hex: '#ffffff', name: '白', nameEn: 'white' },
  { hex: '#92400e', name: '棕', nameEn: 'brown' },
  { hex: '#6b7280', name: '灰', nameEn: 'gray' },
  { hex: '#14b8a6', name: '青', nameEn: 'teal' },
];

export interface ImageAnalyzeResult {
  grid: number[][];
  colors: ColorInfo[];
  /** 自动生成的提示词 */
  prompt: string;
  /** 原图宽度 */
  width: number;
  /** 原图高度 */
  height: number;
}

/** hex → {r,g,b} */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** 计算两个 RGB 之间的欧式距离 */
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  // 加权欧式距离（人眼对绿色更敏感）
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

/** 预计算调色板 RGB */
const PALETTE_RGB = BEAD_PALETTE.map(p => ({ ...p, rgb: hexToRgb(p.hex) }));

/** 找到与目标颜色最接近的调色板索引（1-based，0 = 空白） */
function nearestPaletteIndex(r: number, g: number, b: number): number {
  const target: [number, number, number] = [r, g, b];
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const dist = colorDistance(target, PALETTE_RGB[i].rgb);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i + 1;
    }
  }
  return bestIdx;
}

/** 判断像素是否接近透明/全透明 */
function isTransparent(data: Uint8ClampedArray, offset: number): boolean {
  return data[offset + 3] < 10;
}

/** 加载图片文件到 HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

/**
 * 分析图片并生成拼豆网格。
 *
 * @param file 图片文件
 * @param targetSize 目标边长（短边），另一边按比例计算。默认 24
 * @param lang 生成提示词的语言，'zh' | 'en'，默认 'zh'
 */
export async function analyzeImage(
  file: File,
  targetSize = 24,
  lang: 'zh' | 'en' = 'zh'
): Promise<ImageAnalyzeResult> {
  const img = await loadImage(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w === 0 || h === 0) throw new Error('invalid image');

  // 计算网格尺寸：以短边对齐 targetSize，长边按比例放大
  const aspect = w / h;
  let gridW: number;
  let gridH: number;
  if (aspect >= 1) {
    gridH = Math.max(8, Math.min(48, targetSize));
    gridW = Math.max(8, Math.min(48, Math.round(gridH * aspect)));
  } else {
    gridW = Math.max(8, Math.min(48, targetSize));
    gridH = Math.max(8, Math.min(48, Math.round(gridW / aspect)));
  }

  // 绘制到 canvas 并采样
  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, gridW, gridH);
  const imageData = ctx.getImageData(0, 0, gridW, gridH);
  const data = imageData.data;

  // 构建 grid
  const grid: number[][] = [];
  const colorCounts = new Map<number, number>();
  for (let r = 0; r < gridH; r++) {
    const row: number[] = [];
    for (let c = 0; c < gridW; c++) {
      const offset = (r * gridW + c) * 4;
      if (isTransparent(data, offset)) {
        row.push(0);
        continue;
      }
      const idx = nearestPaletteIndex(data[offset], data[offset + 1], data[offset + 2]);
      row.push(idx);
      colorCounts.set(idx, (colorCounts.get(idx) ?? 0) + 1);
    }
    grid.push(row);
  }

  // 构建颜色列表（按用量倒序，过滤 0）
  const colors: ColorInfo[] = [];
  const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [idx, count] of sortedColors) {
    if (idx === 0) continue;
    const base = BEAD_PALETTE[idx - 1];
    if (base) {
      colors.push({ hex: base.hex, name: base.name, count });
    }
  }

  // 生成提示词：取前 3 主色 + 亮度描述
  const topColors = sortedColors.slice(0, 3).map(([idx]) => BEAD_PALETTE[idx - 1]).filter(Boolean);
  const colorNames = topColors.map(p => (lang === 'en' ? p.nameEn : p.name));
  // 计算平均亮度
  let totalLum = 0;
  let pixelCount = 0;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const offset = (r * gridW + c) * 4;
      if (isTransparent(data, offset)) continue;
      totalLum += 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      pixelCount++;
    }
  }
  const avgLum = pixelCount > 0 ? totalLum / pixelCount : 128;
  const brightness = avgLum < 60 ? (lang === 'en' ? 'dark' : '暗色') : avgLum > 180 ? (lang === 'en' ? 'bright' : '亮色') : (lang === 'en' ? 'medium tone' : '中等色调');
  const prompt = lang === 'en'
    ? `${colorNames.join(', ')} ${brightness} ${gridW}x${gridH}`
    : `${colorNames.join('、')} ${brightness} ${gridW}x${gridH}`;

  return {
    grid,
    colors,
    prompt,
    width: w,
    height: h,
  };
}

/**
 * 把分析结果转为 BeadTemplate（不含 id），方便保存。
 */
export function resultToTemplate(
  result: ImageAnalyzeResult,
  name: string
): Omit<BeadTemplate, 'id'> {
  const beadCount = result.grid.flat().filter(v => v > 0).length;
  const size = Math.max(result.grid.length, result.grid[0]?.length ?? 0);
  return {
    name,
    category: 'custom',
    description: result.prompt,
    grid: result.grid,
    colors: result.colors,
    beadCount,
    difficulty: size <= 16 ? 'easy' : size <= 28 ? 'medium' : 'hard',
    tags: ['image', 'custom'],
    source: 'Image',
  };
}

// ---------- UploadPage 兼容接口 ----------

/** UploadPage 使用的构建选项 */
export interface BuildTemplateOptions {
  maxGridSize?: number;
  colorThreshold?: number;
  dropBackground?: boolean;
  backgroundLuminance?: number;
  maxColors?: number;
  dither?: string;
  edgeEnhance?: boolean;
  edgeStrength?: number;
  labels?: {
    defaultName: string;
    description: string;
    tags: string[];
    source: string;
    colorNamePrefix: string;
  };
}

/** UploadPage 用的图片加载函数（公开） */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return loadImage(file);
}

/**
 * UploadPage 用的模板构建函数。
 * 对图片做简单的降采样 + 最近色匹配，返回可直接保存的模板。
 */
export function buildTemplateFromImage(
  img: HTMLImageElement,
  name: string,
  options: BuildTemplateOptions = {}
): Omit<BeadTemplate, 'id'> {
  const maxGridSize = options.maxGridSize ?? 24;
  const dropBg = options.dropBackground ?? false;
  const bgLum = options.backgroundLuminance ?? 235;
  const maxColors = options.maxColors ?? 30;
  const labels = options.labels;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w === 0 || h === 0) throw new Error('invalid image');

  // 计算网格尺寸：保持宽高比，长边对齐 maxGridSize
  const aspect = w / h;
  let gridW: number;
  let gridH: number;
  if (aspect >= 1) {
    gridW = Math.max(4, Math.min(64, maxGridSize));
    gridH = Math.max(4, Math.min(64, Math.round(gridW / aspect)));
  } else {
    gridH = Math.max(4, Math.min(64, maxGridSize));
    gridW = Math.max(4, Math.min(64, Math.round(gridH * aspect)));
  }

  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, gridW, gridH);
  const imageData = ctx.getImageData(0, 0, gridW, gridH);
  const data = imageData.data;

  const grid: number[][] = [];
  const colorCounts = new Map<number, number>();
  for (let r = 0; r < gridH; r++) {
    const row: number[] = [];
    for (let c = 0; c < gridW; c++) {
      const offset = (r * gridW + c) * 4;
      const alpha = data[offset + 3];
      if (alpha < 10) {
        row.push(0);
        continue;
      }
      const lum = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      // 背景丢弃：亮度高于阈值视为背景
      if (dropBg && lum >= bgLum) {
        row.push(0);
        continue;
      }
      const idx = nearestPaletteIndex(data[offset], data[offset + 1], data[offset + 2]);
      row.push(idx);
      colorCounts.set(idx, (colorCounts.get(idx) ?? 0) + 1);
    }
    grid.push(row);
  }

  // 构建颜色列表（按用量倒序，限制最大颜色数）
  const colors: ColorInfo[] = [];
  const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, maxColors);
  for (const [idx, count] of sortedColors) {
    if (idx === 0) continue;
    const base = BEAD_PALETTE[idx - 1];
    if (base) {
      colors.push({
        hex: base.hex,
        name: labels?.colorNamePrefix ? `${labels.colorNamePrefix} ${idx}` : base.name,
        count,
      });
    }
  }

  const beadCount = grid.flat().filter(v => v > 0).length;
  const size = Math.max(gridW, gridH);

  return {
    name,
    category: 'custom',
    description: labels?.description ?? '',
    grid,
    colors,
    beadCount,
    difficulty: size <= 16 ? 'easy' : size <= 28 ? 'medium' : 'hard',
    tags: labels?.tags ?? ['image', 'custom'],
    source: labels?.source ?? 'Upload',
  };
}
