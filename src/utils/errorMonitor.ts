/**
 * 错误监控上报工具
 *
 * - 监听 window 'error' 与 'unhandledrejection'，捕获 ErrorBoundary 未能拦截的错误
 * - 监听 document 'securitypolicyviolation'，上报 CSP 违规
 * - 生产环境（import.meta.env.PROD）才上报，开发环境只 console.error
 * - 防抖：相同 message 5 秒内只上报一次
 * - 优先 navigator.sendBeacon，失败时 fetch keepalive 兜底
 * - GitHub Pages 无后端，上报失败一律静默
 */

/** 单条错误上报数据格式 */
interface ErrorReport {
  type: 'error' | 'promise';
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  /** 附加上下文（如 reportError 手动传入的额外信息） */
  context?: Record<string, unknown>;
}

interface ErrorMonitorOptions {
  endpoint?: string;
}

/** 默认上报端点（GitHub Pages 无后端，sendBeacon 尝试失败静默） */
let reportEndpoint = '/api/error';

/** 防抖缓存：message -> 最近一次上报时间戳 */
const recentReports = new Map<string, number>();
/** 相同 message 上报去重窗口（毫秒） */
const DEDUP_WINDOW_MS = 5000;

/** 是否已初始化（避免重复挂载监听） */
let initialized = false;

/** 安全获取当前页面 URL */
function currentUrl(): string {
  try {
    return typeof location !== 'undefined' ? location.href : '';
  } catch {
    return '';
  }
}

/** 安全获取 userAgent */
function currentUserAgent(): string {
  try {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  } catch {
    return '';
  }
}

/**
 * 上报一条错误（统一入口，含防抖 / 环境判断 / 发送策略）
 */
function sendReport(report: ErrorReport): void {
  // 防抖：相同 message 5 秒内只上报一次
  const now = report.timestamp;
  const last = recentReports.get(report.message);
  if (last !== undefined && now - last < DEDUP_WINDOW_MS) {
    return;
  }
  recentReports.set(report.message, now);

  // 开发环境只输出到控制台，不发送网络请求
  if (!import.meta.env.PROD) {
    console.error('[ErrorMonitor]', report);
    return;
  }

  const payload = JSON.stringify(report);

  // 优先 sendBeacon（不阻塞页面卸载）
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(reportEndpoint, blob)) {
        return;
      }
    }
  } catch {
    // sendBeacon 失败静默，走兜底
  }

  // 兜底：fetch keepalive（同样允许在页面卸载后完成发送）
  try {
    if (typeof fetch === 'function') {
      void fetch(reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* 上报失败静默 */
      });
    }
  } catch {
    // fetch 失败静默
  }
}

/**
 * 初始化错误监控
 * - 挂载 window 'error' / 'unhandledrejection' 监听
 * - 挂载 document 'securitypolicyviolation' 监听（委托给 reportCSPViolation）
 * @param options.endpoint 上报端点，默认 '/api/error'
 */
export function initErrorMonitor(options?: ErrorMonitorOptions): void {
  if (options?.endpoint) {
    reportEndpoint = options.endpoint;
  }
  if (typeof window === 'undefined') return;
  // 避免重复挂载监听（endpoint 已在上面更新）
  if (initialized) return;
  initialized = true;

  // 捕获同步脚本错误（ErrorBoundary 主要拦截 React 渲染错误，
  // 事件回调 / setTimeout / 顶层抛出等会冒泡到此）
  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error ?? null;
    sendReport({
      type: 'error',
      message: event.message || error?.message || 'Unknown error',
      filename: event.filename || undefined,
      lineno: event.lineno || undefined,
      colno: event.colno || undefined,
      stack: error?.stack,
      url: currentUrl(),
      timestamp: Date.now(),
      userAgent: currentUserAgent(),
    });
  });

  // 捕获未处理的 Promise rejection（async 错误 ErrorBoundary 无法拦截）
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : null;
    const message = err?.message
      ?? (typeof reason === 'string' ? reason : String(reason ?? 'Unhandled rejection'));
    sendReport({
      type: 'promise',
      message,
      stack: err?.stack,
      url: currentUrl(),
      timestamp: Date.now(),
      userAgent: currentUserAgent(),
    });
  });

  // 监听 CSP 违规（委托给 reportCSPViolation 统一上报）
  document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
    reportCSPViolation({
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
    });
  });
}

/**
 * 手动上报错误（供 ErrorBoundary 调用）
 * @param error   错误对象
 * @param context 附加上下文信息
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  sendReport({
    type: 'error',
    message: error.message || String(error),
    stack: error.stack,
    url: currentUrl(),
    timestamp: Date.now(),
    userAgent: currentUserAgent(),
    context,
  });
}

/**
 * 上报 CSP 违规
 * @param violation.blockedURI       被阻止的资源 URI
 * @param violation.violatedDirective 违反的策略指令
 */
export function reportCSPViolation(violation: {
  blockedURI?: string;
  violatedDirective?: string;
}): void {
  sendReport({
    type: 'error',
    message: `CSP violation: ${violation.violatedDirective ?? 'unknown directive'}`,
    url: currentUrl(),
    timestamp: Date.now(),
    userAgent: currentUserAgent(),
    context: {
      blockedURI: violation.blockedURI,
      violatedDirective: violation.violatedDirective,
    },
  });
}
