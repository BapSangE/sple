const CACHE_NAME = 'sple-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.error('[SW] Fetch failed:', event.request.url, err);
      if (event.request.url.includes('/api/')) {
        return new Response(
          JSON.stringify({ status: "error", message: "서버에 연결할 수 없습니다. (Offline 또는 네트워크 에러)" }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Offline');
    })
  );
});
