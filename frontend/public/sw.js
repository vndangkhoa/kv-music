const CACHE_NAME = 'audiophile-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip streaming/audio requests - let them go directly to network
  if (url.pathname.includes('/api/stream') || 
      url.pathname.includes('/api/download') ||
      event.request.headers.get('range')) {
    return;
  }
  
  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Static assets - cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, but also update cache in background
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      // Not in cache - fetch from network
      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Handle background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
});

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
});
