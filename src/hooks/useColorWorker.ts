/**
 * useColorWorker：在 Web Worker 中计算颜色相似度，避免大库存时阻塞 UI。
 *
 * - 使用 Vite 的 worker 导入语法创建模块 Worker
 * - Worker 不可用（如不支持或创建失败）时自动回退到主线程计算
 * - 组件卸载时 terminate Worker
 */
import { useCallback, useEffect, useRef } from 'react';

/** 单条匹配结果（与 colorSimilarity.worker.ts 保持一致） */
interface WorkerResult {
  target: string;
  closest: string;
  distance: number;
}

/** 主线程回退：hex 解析 */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 主线程回退：加权欧氏距离 sqrt(0.3*ΔR² + 0.59*ΔG² + 0.11*ΔB²) */
function weightedDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

/** 主线程回退：对每个目标色找到候选中距离最小的 */
function findClosestColorsMain(
  target: string[],
  candidates: string[]
): WorkerResult[] {
  const candidateRgb = candidates.map(hexToRgb);
  return target.map(t => {
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
}

export function useColorWorker(): {
  findClosestColors: (
    target: string[],
    candidates: string[]
  ) => Promise<WorkerResult[]>;
  terminate: () => void;
} {
  const workerRef = useRef<Worker | null>(null);
  const supportedRef = useRef(true);
  // 等待中的请求队列：Worker 按序处理，FIFO 匹配结果
  const pendingRef = useRef<Array<(r: WorkerResult[]) => void>>([]);

  /** 懒创建 Worker；失败或不可用时返回 null（回退主线程） */
  const getWorker = useCallback((): Worker | null => {
    if (!supportedRef.current) return null;
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === 'undefined') {
      supportedRef.current = false;
      return null;
    }
    try {
      const w = new Worker(
        new URL('../workers/colorSimilarity.worker.ts', import.meta.url),
        { type: 'module' }
      );
      // Worker 按序返回结果，FIFO 派发给最早 pending 的请求
      w.onmessage = (event: MessageEvent) => {
        const resolve = pendingRef.current.shift();
        if (resolve) resolve(event.data as WorkerResult[]);
      };
      w.onerror = () => {
        // Worker 运行出错，后续回退主线程；清空待处理请求（返回空结果避免悬挂）
        supportedRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = [];
        for (const resolve of pending) resolve([]);
      };
      workerRef.current = w;
      return w;
    } catch {
      supportedRef.current = false;
      return null;
    }
  }, []);

  /** 对每个 target hex，找到 candidates 中颜色距离最小的 */
  const findClosestColors = useCallback(
    (target: string[], candidates: string[]): Promise<WorkerResult[]> => {
      const w = getWorker();
      if (!w) {
        // Worker 不可用，主线程同步计算
        return Promise.resolve(findClosestColorsMain(target, candidates));
      }
      return new Promise<WorkerResult[]>(resolve => {
        pendingRef.current.push(resolve);
        w.postMessage({ target, candidates });
      });
    },
    [getWorker]
  );

  /** 终止 Worker 并清空待处理请求 */
  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    // 清空待处理请求，返回空结果避免 Promise 悬挂
    const pending = pendingRef.current;
    pendingRef.current = [];
    for (const resolve of pending) resolve([]);
  }, []);

  // 组件卸载时销毁 Worker
  useEffect(() => () => terminate(), [terminate]);

  return { findClosestColors, terminate };
}
