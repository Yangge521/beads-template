/**
 * Service Worker 注册与更新管理
 * - 仅在生产环境注册，避免开发态缓存干扰
 * - 检测到新 SW 接管时，提示用户刷新
 */
export function registerServiceWorker(onUpdate?: () => void): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((reg) => {
        // 检测到新版本
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新 SW 已就绪，但旧 SW 仍在控制页面
              onUpdate?.();
            }
          });
        });
      })
      .catch((err) => {
        // SW 注册失败不影响主功能
        console.warn('[SW] 注册失败:', err);
      });

    // 监听控制器变化（用户刷新或跳过等待后）
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
