// Basic service worker for PWA
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('iskylar-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/globals.css',
                '/manifest.json',
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Skip caching API calls and Firebase
    if (
        event.request.url.includes('/api/') ||
        event.request.url.includes('firebaseapp') ||
        event.request.url.includes('openai.com')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== 'iskylar-v1')
                    .map((name) => caches.delete(name))
            );
        })
    );
});
