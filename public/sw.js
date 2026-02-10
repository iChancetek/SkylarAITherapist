
// Placeholder Service Worker
// The actual PWA configuration is currently disabled in next.config.ts.
// This file exists to prevent 404 errors in the console.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    console.log('Service Worker activated (Placeholder)');
});
