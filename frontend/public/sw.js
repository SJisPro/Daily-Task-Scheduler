/**
 * sw.js — Minimal Service Worker for PWA installability.
 *
 * Strategy: Network-first for API calls, Cache-first for static assets.
 * This ensures tasks are always fresh from the server, but the app shell
 * loads instantly even on slow connections.
 */

const CACHE_NAME = 'daily-task-scheduler-v1';

// App shell files to pre-cache on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/icon-192.png',
    '/icon-512.png',
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    // Activate immediately without waiting for old tabs to close
    self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
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

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Always go to network for API calls (tasks must be fresh)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Cache-first for everything else (JS, CSS, images)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                // Cache successful GET responses
                if (response.ok && request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});
