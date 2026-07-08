/**
 * 拼豆收集 - Service Worker (增强版)
 *
 * 策略：
 * - 静态资源 (JS/CSS/SVG/PNG/manifest)：缓存优先，后台更新（stale-while-revalidate）
 * - HTML 导航请求：网络优先，失败回退到缓存
 * - 模板数据请求：缓存优先（离线可用）
 * - 后台同步：离线编辑数据在恢复网络后同步
 * - 离线编辑：IndexedDB 存储，重新连接后同步到 localStorage
 */

const CACHE_VERSION = 'beads-v15';
const DATA_CACHE_VERSION = 'beads-data-v15';
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
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存并接管客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== DATA_CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
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

// 接收消息
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  // 离线编辑保存请求
  if (event.data && event.data.type === 'OFFLINE_SAVE') {
    // 存入 IndexedDB 供后续同步
    saveOfflineData(event.data.key, event.data.value)
      .then(() => {
        // 注册后台同步
        if ('sync' in self) {
          return (self).registration.sync.register('beads-sync');
        }
        // 不支持后台同步时，立即通知客户端同步
        notifyClientsSync();
      })
      .catch(() => {});
  }
});

// 后台同步事件
self.addEventListener('sync', (event) => {
  if (event.tag === 'beads-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// IndexedDB 操作
const DB_NAME = 'beads-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'pending-changes';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineData(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, value, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllOfflineData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function clearOfflineData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 同步离线数据到客户端（客户端通过 message 接收并写入 localStorage）
async function syncOfflineData() {
  const allData = await getAllOfflineData();
  if (allData.length === 0) return;
  // 通知所有客户端应用离线变更
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'APPLY_OFFLINE_CHANGES',
      changes: allData,
    });
  }
  await clearOfflineData();
}

// 不支持后台同步时，通知客户端立即同步
async function notifyClientsSync() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_REQUEST' });
  }
}
