const CACHE_NAME = 'stocklens-market-mayhem-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/icon.svg',
  '/assets/stock-lens-branding.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Stock-LENS', body: 'Your daily market turn is ready.' };
  try { data = event.data ? event.data.json() : data; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || 'Stock-LENS', {
    body: data.body || 'Your daily market turn is ready.',
    icon: '/assets/icon.svg',
    badge: '/assets/icon.svg',
    data: data.url || '/'
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.openWindow(url));
});
