const CACHE_NAME = 'call-out-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './js/app.js',
  './js/auth.js',
  './js/chat.js',
  './js/profile.js',
  './icon-192.png',
  './icon-512.png'
];

// Install the service worker and cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Serve cached files when offline or loading
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});