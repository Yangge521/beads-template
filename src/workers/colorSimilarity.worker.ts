/**
 * 颜色相似度 Worker
 *
 * 在后台线程计算每个目标色与候选色的最近匹配，避免大库存时阻塞 UI。
 */

/** Worker 入参 */
interface WorkerRequest {
  target: string[];
  candidates: string[];
}

/** 单条匹配结果 */
interface WorkerResult {
  target: string;
  closest: string;
  distance: number;
}

/** hex 解析：parseInt(hex.slice(1), 16) 提取 RGB */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 加权欧氏距离：sqrt(0.3*ΔR² + 0.59*ΔG² + 0.11*ΔB²) */
function weightedDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

// Worker 上下文：通过类型断言访问单参 postMessage
// （DOM lib 的 postMessage 需要 targetOrigin，Worker 内的 postMessage 只需一个参数）
const post = (message: unknown): void => {
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage(message);
};

self.onmessage = (event: MessageEvent) => {
  const { target, candidates } = event.data as WorkerRequest;

  // 预解析候选色 RGB，避免在内层循环中重复计算
  const candidateRgb = candidates.map(hexToRgb);

  const results: WorkerResult[] = target.map(t => {
    const tRgb = hexToRgb(t);
    let closest = '';
    let bestDist = Infinity;
    for (let i = 0; i < candidateRgb.length; i++) {
      const d = weightedDistance(tRgb, candidateRgb[i]);
      if (d < bestDist) {
        bestDist = d;
        closest = candidates[i];
      }
    }
    return { target: t, closest, distance: bestDist };
  });

  post(results);
};
