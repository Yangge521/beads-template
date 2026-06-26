/**
 * 图像转图纸增强算法
 * - Floyd-Steinberg 抖动：误差扩散，保留更多细节
 * - 边缘增强：Sobel 边缘检测后加强边缘对比度
 * - 多算法对比：返回不同算法的结果供用户选择
 */
import type { ColorInfo } from '../types/bead';
import { findClosestColor, hexToRgb } from './colorDistance';

export type DitherAlgorithm = 'none' | 'floyd-steinberg';

export interface EnhancedPixelizeOptions {
  /** 目标网格最大边长 */
  maxGridSize?: number;
  /** 颜色量化阈值 */
  colorThreshold?: number;
  /** 是否丢弃背景 */
  dropBackground?: boolean;
  /** 背景亮度阈值 */
  backgroundLuminance?: number;
  /** 颜色名称前缀 */
  colorNamePrefix?: string;
  /** 抖动算法 */
  dither?: DitherAlgorithm;
  /** 是否启用边缘增强 */
  edgeEnhance?: boolean;
  /** 边缘增强强度 (0-1) */
  edgeStrength?: number;
  /** 最大颜色数 */
  maxColors?: number;
}

export interface EnhancedPixelizeResult {
  grid: number[][];
  colors: ColorInfo[];
}

/** Sobel 算子边缘检测，返回边缘强度图 (0-1) */
function sobelEdgeDetect(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const edges = new Float32Array(width * height);
  // 转灰度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0, sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kIdx = (ky + 1) * 3 + (kx + 1);
          sx += gray[idx] * gx[kIdx];
          sy += gray[idx] * gy[kIdx];
        }
      }
      edges[y * width + x] = Math.min(1, Math.sqrt(sx * sx + sy * sy) / 255);
    }
  }
  return edges;
}

/** 将图片绘制到 canvas 并获取像素数据 */
function getImageData(
  img: HTMLImageElement,
  cols: number,
  rows: number
): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows);
}

/**
 * 贪心聚类提取调色板（复用现有逻辑，但独立实现避免循环依赖）
 */
function extractPalette(
  cells: { r: number; g: number; b: number; h: number; s: number; l: number; isBg: boolean }[],
  colorThreshold: number,
  maxColors: number
): { hex: string; h: number; s: number; l: number; count: number }[] {
  const palette: { hex: string; h: number; s: number; l: number; count: number }[] = [];
  for (const cell of cells) {
    if (cell.isBg) continue;
    let merged = false;
    for (const p of palette) {
      const dh = Math.min(Math.abs(cell.h - p.h), 1 - Math.abs(cell.h - p.h));
      const ds = Math.abs(cell.s - p.s);
      const dl = Math.abs(cell.l - p.l);
      const dist = Math.sqrt(0.4 * dh * dh + 0.2 * ds * ds + 0.4 * dl * dl);
      if (dist < colorThreshold) {
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
  // 按使用量排序，取 top N
  return palette.sort((a, b) => b.count - a.count).slice(0, maxColors);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

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

/**
 * 增强版图像像素化
 * 支持 Floyd-Steinberg 抖动和边缘增强
 */
export function pixelizeImageEnhanced(
  img: HTMLImageElement,
  options: EnhancedPixelizeOptions = {}
): EnhancedPixelizeResult | null {
  const {
    maxGridSize = 32,
    colorThreshold = 0.08,
    dropBackground = true,
    backgroundLuminance = 235,
    colorNamePrefix = 'Color',
    dither = 'none',
    edgeEnhance = false,
    edgeStrength = 0.5,
    maxColors = 16,
  } = options;

  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (naturalW <= 0 || naturalH <= 0) return null;

  const ratio = Math.min(maxGridSize / naturalW, maxGridSize / naturalH);
  const cols = Math.max(1, Math.round(naturalW * ratio));
  const rows = Math.max(1, Math.round(naturalH * ratio));

  const imgData = getImageData(img, cols, rows);
  if (!imgData) return null;
  const data = imgData.data;

  // 收集每个格子的 RGB + HSL
  interface Cell {
    r: number; g: number; b: number; a: number;
    h: number; s: number; l: number;
    isBg: boolean;
  }
  const cells: Cell[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const [h, s, l] = rgbToHsl(r, g, b);
    const isBg = a < 128 || (dropBackground && l * 255 > backgroundLuminance && s < 0.15);
    cells.push({ r, g, b, a, h, s, l, isBg });
  }

  // 边缘增强：检测边缘后，对边缘像素增强对比度
  if (edgeEnhance) {
    const edges = sobelEdgeDetect(data, cols, rows);
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].isBg) continue;
      const e = edges[i];
      if (e > 0.1) {
        // 边缘像素：增强饱和度，降低亮度（让边缘更鲜明）
        const factor = 1 + e * edgeStrength;
        cells[i].s = Math.min(1, cells[i].s * factor);
        cells[i].l = Math.max(0, cells[i].l * (1 - e * edgeStrength * 0.3));
      }
    }
  }

  // 提取调色板
  const palette = extractPalette(cells, colorThreshold, maxColors);
  if (palette.length === 0) {
    return { grid: Array.from({ length: rows }, () => Array(cols).fill(0)), colors: [] };
  }

  // 生成 ColorInfo
  const colorInfos: ColorInfo[] = palette.map((p, idx) => ({
    hex: rgbToHex(...hslToRgb(p.h, p.s, p.l)),
    name: `${colorNamePrefix} ${idx + 1}`,
    count: 0,
  }));

  // 生成 grid
  const grid: number[][] = [];

  if (dither === 'floyd-steinberg') {
    // Floyd-Steinberg 抖动：误差扩散到邻居
    // 使用 RGB 浮点缓冲
    const buffer: { r: number; g: number; b: number }[] = cells.map(c => ({
      r: c.r, g: c.g, b: c.b,
    }));

    const paletteHex = colorInfos.map(c => c.hex);
    const paletteRgb = paletteHex.map(hex => hexToRgb(hex));

    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (cells[idx].isBg) {
          row.push(0);
          continue;
        }
        const px = buffer[idx];
        // 找最近色
        const [bestIdx] = findClosestColor(
          rgbToHex(Math.round(px.r), Math.round(px.g), Math.round(px.b)),
          paletteHex
        );
        // findClosestColor 返回 hex，需要找到索引
        const colorIdx = bestIdx ? paletteHex.indexOf(bestIdx) : 0;
        row.push(colorIdx + 1);
        colorInfos[colorIdx].count++;

        // 计算量化误差
        const target = paletteRgb[colorIdx];
        const errR = px.r - target[0];
        const errG = px.g - target[1];
        const errB = px.b - target[2];

        // 扩散误差到右、下左、下、下右
        const distribute = (dr: number, dc: number, weight: number) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
          const nIdx = nr * cols + nc;
          if (cells[nIdx].isBg) return;
          buffer[nIdx].r += errR * weight;
          buffer[nIdx].g += errG * weight;
          buffer[nIdx].b += errB * weight;
        };
        // Floyd-Steinberg 权重：右 7/16, 下左 3/16, 下 5/16, 下右 1/16
        distribute(0, 1, 7 / 16);
        distribute(1, -1, 3 / 16);
        distribute(1, 0, 5 / 16);
        distribute(1, 1, 1 / 16);
      }
      grid.push(row);
    }
  } else {
    // 无抖动：直接最近色映射
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        if (cell.isBg) {
          row.push(0);
          continue;
        }
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < palette.length; i++) {
          const p = palette[i];
          const dh = Math.min(Math.abs(cell.h - p.h), 1 - Math.abs(cell.h - p.h));
          const ds = Math.abs(cell.s - p.s);
          const dl = Math.abs(cell.l - p.l);
          const dist = Math.sqrt(0.4 * dh * dh + 0.2 * ds * ds + 0.4 * dl * dl);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        row.push(bestIdx + 1);
        colorInfos[bestIdx].count++;
      }
      grid.push(row);
    }
  }

  return { grid, colors: colorInfos };
}
