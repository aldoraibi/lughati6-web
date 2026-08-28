// عملٌ بلا إنترنت بعد أوّل فتح
const V = 'lughati6-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const c = res.clone();
      caches.open(V).then(cache => cache.put(e.request, c));
      return res;
    }).catch(() => hit))
  );
});
