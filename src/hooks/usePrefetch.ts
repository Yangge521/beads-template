/**
 * 路由 lazy chunk 预加载 hook
 *
 * 当用户 hover/focus 导航项时，提前加载对应的 lazy chunk，
 * 点击后无需等待网络请求，路由切换更流畅。
 *
 * 使用：在 Navbar 的导航按钮上，onMouseEnter/onFocus 时调用 prefetch('favorites') 等
 */
import { useCallback } from 'react';

// 缓存已预加载的 chunk，避免重复加载
const prefetched = new Set<string>();

// lazy chunk 映射表（与 App.tsx 中的 lazy import 对应）
const LAZY_CHUNKS: Record<string, () => Promise<unknown>> = {
  // 仅在客户端运行时动态访问，避免 SSR 问题
};

/** 注册 lazy chunk（在 App.tsx 中调用，注册各路由对应的 lazy import） */
export function registerLazyChunk(route: string, loader: () => Promise<unknown>): void {
  LAZY_CHUNKS[route] = loader;
}

/** 预加载指定路由的 lazy chunk */
export function usePrefetch() {
  return useCallback((route: string) => {
    if (prefetched.has(route)) return;
    const loader = LAZY_CHUNKS[route];
    if (loader) {
      prefetched.add(route);
      loader().catch(() => {
        // 预加载失败不影响功能，点击时会重试
        prefetched.delete(route);
      });
    }
  }, []);
}
