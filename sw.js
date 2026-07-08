// ============================================
// 陶源里桌台管家 — Service Worker
// 策略：Stale While Revalidate（先用缓存秒开，后台静默更新）
// ============================================

const CACHE_NAME = 'taoyuanli-v1';

// 安装：预缓存首页
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html']))
  );
  self.skipWaiting(); // 立即激活，不等旧标签页关闭
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // 立即控制所有页面
});

// 拦截请求：Stale While Revalidate
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 只处理同源请求（不拦截第三方资源）
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 后台请求网络更新缓存
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败，静默处理（缓存已经返回了）
      });

      // 有缓存就先返回缓存（秒开），没有就等网络
      return cachedResponse || fetchPromise;
    })
  );
});
