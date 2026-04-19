// Minimal PWA service worker: caches the app shell so the app is
// installable on Android (Chrome requires an SW with a fetch handler
// to show the install prompt).
const CACHE = 'behandlungsverwaltung-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/graphql')) return; // never cache API calls
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).catch(() => caches.match('/'))),
  );
});
