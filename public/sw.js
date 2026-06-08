// Minimal service worker — enables PWA installation
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Pass all requests through to the network (no offline caching needed for now)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
