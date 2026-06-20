const CACHE_NAME = 'formaplay-orcamentos-v6';
const STATIC_CACHE = 'formaplay-static-v6';

// Apenas métodos seguros e cacheáveis
const CACHEABLE_METHODS = ['GET'];

// Nunca cachear requisições para estas origens (APIs externas)
const API_ORIGINS = [
  'supabase.co',
  'wa.me',
];

function isApiRequest(url) {
  return API_ORIGINS.some((origin) => url.hostname.includes(origin));
}

function isCacheable(request, url) {
  // Não cachear métodos que modificam dados
  if (!CACHEABLE_METHODS.includes(request.method)) return false;
  // Não cachear extensões do Chrome ou URLs não-http
  if (!url.protocol.startsWith('http')) return false;
  // Não cachear chamadas de API (Supabase, etc.)
  if (isApiRequest(url)) return false;
  return true;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([
        '/logocircular.png',
        '/icon-192x192.png',
        '/icon-512x512.png'
      ]).catch(() => {
        // Ignora erros de pre-cache (arquivos opcionais)
      }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Deixar passar SEM interceptar: requests de API e métodos não-GET
  if (!isCacheable(event.request, url)) {
    return; // Não chama event.respondWith → browser faz o request normalmente
  }

  // Network-first para HTML, JS, CSS (nunca cachear)
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first apenas para assets estáticos (imagens, fontes, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          // Só cacheia respostas OK de recursos estáticos
          if (response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
  );
});
