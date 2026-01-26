const CACHE_NAME = 'iskylar-v2';
const STATIC_ASSETS = [
    '/',
    '/globals.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/_next/static/chunks/main-app.js', // Optimistic guess at next.js bundles, but standard caching below catches most.
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => console.warn("Some assets failed to cache:", err));
        })
    );
});

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
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip API, Firebase, and specific external calls from caching
    if (
        url.pathname.startsWith('/api') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('openai')
    ) {
        return;
    }

    // For HTML navigation (pages), use Network First, fall back to Cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/')) // Fallback to root (installable PWA shell)
        );
        return;
    }

    // For static assets (Next.js builds, images, CSS), use Stale-While-Revalidate
    if (
        url.pathname.startsWith('/_next/static') ||
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2)$/)
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        // Only cache valid responses
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse); // Swallow network errors if we have cache

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Default: Cache First for everything else
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
