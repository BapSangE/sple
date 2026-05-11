// Sple Service Worker
const CACHE_NAME = 'sple-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[SW] Install');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // 기본 패치 핸들러
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.error('[SW] Fetch failed:', event.request.url, err);
      
      if (event.request.mode === 'navigate') {
        return new Response('네트워크 연결을 확인해주세요. (Offline)', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      
      return Response.error();
    })
  );
});
