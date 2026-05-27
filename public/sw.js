self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple pass-through fetch handler for now
  // This satisfies the PWA requirement for having a fetch handler
  event.respondWith(fetch(event.request));
});
