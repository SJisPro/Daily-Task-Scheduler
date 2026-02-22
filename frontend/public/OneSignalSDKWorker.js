/**
 * OneSignalSDKWorker.js
 *
 * This file must be served from the ROOT of your domain:
 *   https://your-app.vercel.app/OneSignalSDKWorker.js
 *
 * Placing it in /public/ ensures Vite copies it to /dist/ unchanged,
 * so Vercel serves it at the correct path.
 *
 * We also include our own caching logic here (importScripts runs first,
 * then our code extends the service worker) so we don't need a separate sw.js.
 */

// ── OneSignal SDK (must be first line) ────────────────────────────────────────
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// ── App shell caching (carried over from sw.js) ────────────────────────────
const CACHE_NAME = "daily-task-scheduler-v2";
const PRECACHE = ["/", "/index.html", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Always go to network for API calls
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request).then(
            (cached) =>
                cached ||
                fetch(event.request).then((res) => {
                    if (res.ok && event.request.method === "GET") {
                        const clone = res.clone();
                        caches
                            .open(CACHE_NAME)
                            .then((cache) => cache.put(event.request, clone));
                    }
                    return res;
                })
        )
    );
});
