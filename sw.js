/**
 * Service Worker.
 * 静的アセットを Cache First 戦略でキャッシュし、オフライン動作を保証する。
 * 通信環境の悪い現場での事故を防ぐため必須。
 */

const CACHE_NAME = 'magic-sw-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/reset.css',
  '/css/main.css',
  '/css/stopwatch.css',
  '/css/tabbar.css',
  '/css/modal.css',
  '/js/app.js',
  '/js/stopwatch.js',
  '/js/force.js',
  '/js/ui.js',
  '/js/secret.js',
  '/js/modal.js',
  '/js/register-sw.js',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg',
  '/assets/icons/apple-touch-icon.svg',
  '/assets/images/tabbar-clock.svg',
  '/assets/images/tabbar-alarm.svg',
  '/assets/images/tabbar-stopwatch.svg',
  '/assets/images/tabbar-timer.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* HTML（ナビゲーションリクエスト）は Network First にする。
     これにより、デプロイ直後でも最新のページが取得され、
     ネットワーク失敗時のみキャッシュ済みのものを返す。 */
  const isNavigate = req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');

  if (isNavigate) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  /* 静的アセットは Cache First のまま */
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || !res.ok || res.type === 'opaque') return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => Response.error());
    })
  );
});
