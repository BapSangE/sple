const CACHE_NAME = 'sple-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline');
    })
  );
});
