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

  event.respondWith(
    fetch(event.request).catch((err) => {
      console.error('[SW] Fetch failed:', event.request.url, err);
      
      if (event.request.mode === 'navigate') {
        return new Response('네트워크 연결을 확인해주세요. (Offline)', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      if (event.request.url.includes('/api/')) {
        return new Response(
          JSON.stringify({ status: "error", message: "서버에 연결할 수 없습니다. (Offline 또는 네트워크 에러)" }),
          { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
      
      return Response.error();
    })
  );
});
