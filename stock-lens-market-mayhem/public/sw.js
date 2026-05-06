const CACHE_NAME = 'stocklens-market-mayhem-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/icon.svg',
  '/assets/stock-lens-branding.jpeg'
];

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (request.method === 'GET' && response && response.ok && new URL(request.url).origin === self.location.origin) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function appShellNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) return response;
  } catch (_) {}
  return caches.match('/index.html');
}

async function handleShareTarget(request) {
  const formData = await request.formData();
  const params = new URLSearchParams();
  const title = formData.get('title');
  const text = formData.get('text');
  const sharedUrl = formData.get('url');

  if (title) params.set('share-title', String(title));
  if (text) params.set('share-text', String(text));
  if (sharedUrl) params.set('share-url', String(sharedUrl));

  return Response.redirect(`/profile${params.toString() ? `?${params.toString()}` : ''}`, 303);
}

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

  if (event.request.method === 'POST' && url.pathname === '/share') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(appShellNavigation(event.request));
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(cacheFirst(event.request).catch(() => caches.match('/index.html')));
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
  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      if ('focus' in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    return clients.openWindow(url);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
