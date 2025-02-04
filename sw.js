// sw.js

fetch('./manifest.json')
  .then(response => response.json())
  .then(manifest => {
    const APP_VERSION = manifest.version;
    const CACHE_NAME  = `webrtc-cache-v${APP_VERSION}`;  // dynamic version from manifest

    // List of core assets to cache at install time.
    // You can add or remove files as needed.
    const urlsToCache = [
      './',             // so the app can load index.html as start URL
      './index.html',
      './manifest.json',
      './sw.js',
      './main.js',      // your main logic
      './offline.html', // fallback page
      // Example icons if you reference them in your manifest
      './icon-192.png',
      './icon-512.png',
      // Any CDNs or external resources you want cached
      'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js'
    ];

    // ========== INSTALL EVENT ==========
    self.addEventListener('install', (event) => {
      // Cache the necessary files
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
          console.log('Opened cache:', CACHE_NAME);
          return cache.addAll(urlsToCache);
        })
      );
      // Force the waiting service worker to become the active service worker
      self.skipWaiting();
    });

    // ========== ACTIVATE EVENT ==========
    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName !== CACHE_NAME) {
                console.log('Deleting old cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        })
      );
      // Tell the service worker to take control of all pages
      self.clients.claim();
    });

    // ========== FETCH EVENT (Stale-While-Revalidate + Offline Fallback) ==========
    self.addEventListener('fetch', (event) => {
      event.respondWith(
        caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            // Serve from cache first (stale-while-revalidate approach):
            // We can kick off an async fetch() in the background to update cache.
            // For simplicity here, we’re just returning the cached response immediately.
            return cachedResponse;
          }
          // Otherwise, try to fetch from network
          return fetch(event.request).catch(() => {
            // If we can’t fetch AND it’s an HTML page request, fallback to offline.html
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./offline.html');
            }
            // If not HTML, either we’re offline with no fallback or some other error
          });
        })
      );
    });
  })
  .catch(error => {
    console.error('Failed to load manifest:', error);
  });
