/**
 * 颜色距离工具：HSL 加权距离，比 RGB 更符合视觉感知。
 * 复用 imageToGrid 的色距算法，提取为独立工具供库存替换等功能使用。
 */

/** hex 转 RGB */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** RGB 转 HSL */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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

/** 颜色距离（加权 HSL 距离，亮度权重最大） */
export function colorDistance(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const [h1, s1, l1] = rgbToHsl(r1, g1, b1);
  const [h2, s2, l2] = rgbToHsl(r2, g2, b2);
  const dh = Math.min(Math.abs(h1 - h2), 1 - Math.abs(h1 - h2));
  const ds = Math.abs(s1 - s2);
  const dl = Math.abs(l1 - l2);
  return Math.sqrt(0.4 * dh * dh + 0.2 * ds * ds + 0.4 * dl * dl);
}

/**
 * 在候选颜色中找到与目标色最接近的一个。
 * @param targetHex 目标色 hex
 * @param candidates 候选色 hex 数组
 * @returns [最接近的 hex, 距离值]；候选为空时返回 [null, Infinity]
 */
export function findClosestColor(
  targetHex: string,
  candidates: string[]
): [string | null, number] {
  if (candidates.length === 0) return [null, Infinity];
  let best = candidates[0];
  let bestDist = colorDistance(targetHex, best);
  for (let i = 1; i < candidates.length; i++) {
    const d = colorDistance(targetHex, candidates[i]);
    if (d < bestDist) {
      bestDist = d;
      best = candidates[i];
    }
  }
  return [best, bestDist];
}
