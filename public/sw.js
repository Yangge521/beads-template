/**
 * 拼豆收集 - Service Worker
 * 策略：
 * - 静态资源 (JS/CSS/SVG/PNG/manifest)：缓存优先，后台更新（stale-while-revalidate）
 * - HTML 导航请求：网络优先，失败回退到缓存
 * - 其他跨域请求：直接放行（不缓存）
 */

const CACHE_VERSION = 'beads-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg',
];

// 安装：预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // 用 addAll 容错：单个资源失败不影响整体安装
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存并接管客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // HTML 导航：网络优先
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          // 仅缓存成功响应
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// 接收 SKIP_WAITING 消息（用于强制更新）
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
