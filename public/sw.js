const CACHE_NAME = 'iskylar-v3-core';
const STATIC_ASSETS = [
    '/',
    '/globals.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

self.addEventListener('install', (event) => {
    // Note: We do NOT call skipWaiting() here immediately to allow the user to control the update.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
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
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // 1. API & AI Calls -> Network Only (with custom offline error)
    if (url.pathname.startsWith('/api') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If offline, return a structured error that the UI can catch
                return new Response(
                    JSON.stringify({ error: 'OFFLINE_MODE', message: 'You are currently offline.' }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // 2. Navigation (HTML) -> Network First, Fallback to Cache (App Shell)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match('/')
                        .then(response => response || caches.match(event.request));
                })
        );
        return;
    }

    // 3. Static Assets (Next.js chunks, Images, Fonts) -> Stale-While-Revalidate
    if (
        url.pathname.startsWith('/_next/static') ||
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2)$/)
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch((err) => {
                        // Network failed, nothing to do if we have cache
                        return cachedResponse;
                    });

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Default -> Network First
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
