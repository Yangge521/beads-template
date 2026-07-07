/**
 * 轻量 Web Vitals 监控：基于原生 PerformanceObserver，不引入第三方依赖。
 *
 * 采集指标：
 * - LCP (Largest Contentful Paint)：最大内容绘制时间
 * - CLS (Cumulative Layout Shift)：累计布局偏移
 * - FID/INP (First Input Delay / Interaction to Next Paint)：首次输入延迟
 * - TTFB (Time to First Byte)：首字节时间
 *
 * 数据在控制台输出，可后续接入上报 endpoint。
 * 仅在生产环境启用。
 */

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/** 各指标的 good/poor 阈值（参考 web.dev） */
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
};

function ratingOf(name: string, value: number): VitalMetric['rating'] {
  const th = THRESHOLDS[name];
  if (!th) return 'good';
  if (value <= th.good) return 'good';
  if (value <= th.poor) return 'needs-improvement';
  return 'poor';
}

function emit(metric: VitalMetric) {
  if (!import.meta.env.PROD) return;
  const style =
    metric.rating === 'good'
      ? 'color:#22c55e'
      : metric.rating === 'needs-improvement'
        ? 'color:#f59e0b'
        : 'color:#ef4444';
  // 性能指标输出，仅在控制台用，eslint 允许
  // eslint-disable-next-line no-console
  console.log('%c[Vitals] %s: %s (%s)', style, metric.name, metric.value.toFixed(2), metric.rating);
  // TODO: 接入上报端点（如 Sentry / 自建 analytics）
  // navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
}

/** 初始化所有 Vitals 监听器 */
export function initPerfMonitor(): void {
  if (!import.meta.env.PROD) return;
  if (typeof PerformanceObserver === 'undefined') return;

  // LCP
  let lcpValue = 0;
  try {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        lcpValue = last.startTime;
        emit({ name: 'LCP', value: lcpValue, rating: ratingOf('LCP', lcpValue) });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // 旧浏览器不支持 LCP
  }

  // CLS
  let clsValue = 0;
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value ?? 0;
        }
      }
      emit({ name: 'CLS', value: clsValue, rating: ratingOf('CLS', clsValue) });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // 忽略
  }

  // FID / INP
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        // 强转为 PerformanceEventTiming 以访问 processingStart
        const e = entry as PerformanceEntry & { processingStart?: number };
        const ps = e.processingStart ?? 0;
        const fid = ps - entry.startTime;
        emit({ name: 'FID', value: fid, rating: ratingOf('FID', fid) });
      }
    }).observe({ type: 'first-input', buffered: true });
  } catch {
    // 忽略
  }

  // TTFB
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb > 0) {
        emit({ name: 'TTFB', value: ttfb, rating: ratingOf('TTFB', ttfb) });
      }
    }
  } catch {
    // 忽略
  }
}
