/**
 * 拍照导入图纸：从照片中识别拼豆颜色块，还原为 grid + colors。
 *
 * 不依赖外部 OCR 库，使用 Canvas 像素采样 + 颜色聚类（简化 k-means）。
 */

/** 像素 RGB 三元组 */
type RGB = [number, number, number];

/** 加权欧氏距离（人眼对绿色更敏感），用于聚类与匹配 */
function rgbDistance(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

/** 计算像素亮度（用于过滤接近白色的背景） */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** RGB 转大写 hex，如 #FF0000 */
function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** 简化 k-means：选 k 个中心，迭代 maxIter 次 */
function kmeans(
  pixels: RGB[],
  k: number,
  maxIter: number
): { centers: RGB[]; labels: number[] } {
  const n = pixels.length;
  if (n === 0) return { centers: [], labels: [] };
  const realK = Math.min(k, n);

  // 初始化中心：从像素数组中均匀采样
  const centers: RGB[] = [];
  const step = Math.max(1, Math.floor(n / realK));
  for (let i = 0; i < realK; i++) {
    centers.push(pixels[i * step]);
  }

  const labels = new Array<number>(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // 1. 分配：每个像素归入最近中心
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = rgbDistance(pixels[i], centers[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      labels[i] = best;
    }

    // 2. 更新：中心 = 该簇像素均值；空簇保留原中心
    const sums: number[][] = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sums[labels[i]];
      s[0] += pixels[i][0];
      s[1] += pixels[i][1];
      s[2] += pixels[i][2];
      s[3] += 1;
    }
    for (let c = 0; c < centers.length; c++) {
      const s = sums[c];
      if (s[3] > 0) {
        centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      }
    }
  }

  return { centers, labels };
}

/**
 * 从图片识别拼豆图纸。
 *
 * 算法：
 *   1. 将图片绘制到 canvas，缩放到 gridSize×gridSize
 *   2. 采样每个像素的 RGB
 *   3. 用 k-means 聚类将颜色分组（迭代 10 次）
 *   4. 每个像素映射到最近的聚类中心
 *   5. 过滤掉接近白色（背景）的像素（luminance > 240）
 *   6. 生成 grid（0=空白，1..N=颜色索引+1）和 colors 数组
 *   7. 统计每个颜色用量
 *
 * @param image    已加载的 HTMLImageElement
 * @param options  gridSize 网格边长（默认 16）；colorCount 颜色数（默认 8）
 * @returns grid 与 colors；颜色名直接使用 hex 值（如 #FF0000）
 */
export async function importPatternFromImage(
  image: HTMLImageElement,
  options?: { gridSize?: number; colorCount?: number }
): Promise<{
  grid: number[][];
  colors: Array<{ hex: string; name: string; count?: number }>;
}> {
  const gridSize = options?.gridSize ?? 16;
  const colorCount = options?.colorCount ?? 8;

  // 1. 绘制到 canvas 并缩放到 gridSize×gridSize
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(image, 0, 0, gridSize, gridSize);
  const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
  const data = imageData.data;

  // 2. 采样每个像素的 RGB
  const pixels: RGB[] = [];
  for (let i = 0; i < gridSize * gridSize; i++) {
    const offset = i * 4;
    pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
  }

  // 3. k-means 聚类
  const { centers, labels } = kmeans(pixels, colorCount, 10);

  // 4/5. 确定哪些簇包含非背景像素（亮度 ≤ 240 视为内容）
  const clusterHasContent = new Array<boolean>(centers.length).fill(false);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b] = pixels[i];
    if (luminance(r, g, b) <= 240) {
      clusterHasContent[labels[i]] = true;
    }
  }

  // 6. 建立簇号 → 颜色索引（1-based）映射，跳过纯背景簇
  const clusterToColor = new Map<number, number>();
  let colorIndex = 0;
  for (let c = 0; c < centers.length; c++) {
    if (clusterHasContent[c]) {
      colorIndex++;
      clusterToColor.set(c, colorIndex);
    }
  }

  // 生成 grid（0=空白/背景，1..N=颜色索引）并统计用量
  const grid: number[][] = [];
  const counts = new Array<number>(colorIndex).fill(0);
  for (let r = 0; r < gridSize; r++) {
    const row: number[] = [];
    for (let c = 0; c < gridSize; c++) {
      const i = r * gridSize + c;
      const [pr, pg, pb] = pixels[i];
      // 5. 过滤接近白色的背景像素
      if (luminance(pr, pg, pb) > 240) {
        row.push(0);
      } else {
        const ci = clusterToColor.get(labels[i]) ?? 0;
        row.push(ci);
        if (ci > 0) counts[ci - 1] += 1;
      }
    }
    grid.push(row);
  }

  // 7. 构建 colors 数组（按颜色索引顺序，与 grid 对齐）并附带用量
  const colors: Array<{ hex: string; name: string; count: number }> = [];
  for (let c = 0; c < centers.length; c++) {
    const ci = clusterToColor.get(c);
    if (ci === undefined) continue;
    const [r, g, b] = centers[c];
    const hex = toHex(r, g, b);
    colors.push({ hex, name: hex, count: counts[ci - 1] });
  }

  return { grid, colors };
}
