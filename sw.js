// メシ得！ Service Worker
// ・画面（HTML）とお得情報（deals.json）は「ネット優先」：つながる時は常に最新、圏外の時は前回の内容を表示
// ・JS / 画像 / フォントは「キャッシュ優先」：ファイル名に版が入っているので一度取れば再利用できる
const CACHE = 'meshitoku-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

async function networkFirst(req, key) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(key || req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key || req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 画面の移動（どのURLでも同じ index.html を使う）
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, new URL('./', self.registration.scope).href));
    return;
  }
  if (url.pathname.endsWith('/deals.json')) {
    e.respondWith(networkFirst(req));
    return;
  }
  const sameOrigin = url.origin === self.location.origin;
  if ((sameOrigin && /\/(_expo|assets|icons)\//.test(url.pathname)) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(req));
  }
});
