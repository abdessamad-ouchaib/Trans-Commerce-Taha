/* Service Worker — Trans Commerce Taha
   Stratégie : cache uniquement les fichiers statiques (JS/CSS/icônes).
   Les appels API (/api/...) et Socket.io passent toujours par le réseau
   pour garantir des données et une messagerie toujours à jour. */

const CACHE_NAME = 'tct-static-v1';

const STATIC_ASSET_REGEX = /\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?)$/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ne jamais intercepter les appels API ou Socket.io — toujours réseau frais
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('/socket.io/')
  ) {
    return;
  }

  // Fichiers statiques : cache d'abord, puis réseau (et mise à jour du cache)
  if (STATIC_ASSET_REGEX.test(new URL(request.url).pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Navigation (rechargement de page) : réseau d'abord, cache en secours hors-ligne
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
  }
});
