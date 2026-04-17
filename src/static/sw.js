// Sple Service Worker
const CACHE_NAME = 'sple-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
});

self.addEventListener('fetch', (event) => {
  // 기본 패치 핸들러
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline');
    })
  );
});
