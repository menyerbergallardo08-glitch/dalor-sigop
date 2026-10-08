// DALOR SIGO-P ERP — Service Worker Oficial (v2.1.0-LIVE)
// Políticas: Network-First universal con Fallback a Caché Offline para continuidad operativa

const CACHE_NAME = 'dalor-sigop-pwa-v2.2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/logo_dalor.jpg'
];

// 1. INSTALACIÓN: Cachear assets fundamentales y activar de inmediato
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precarga inicial omitida:', err);
      });
    })
  );
});

// 2. ACTIVACIÓN: Purgar inmediatamente todas las cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH INTERCEPTOR: NETWORK-FIRST UNIVERSAL
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // A. APIS (/api/v1/): Network-First estricto, nunca cachear transacciones financieras
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            status: 'offline',
            message: 'Sin conexión al servidor host. La operación fue resguardada o rechazada por seguridad.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // B. HTML Principal y Navegación: Network-First con fallback a index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // C. Assets (JS, CSS, Fuentes, Imágenes): NETWORK-FIRST para garantizar código siempre fresco
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
