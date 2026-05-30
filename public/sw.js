/* Arnfa service worker — minimal app-shell cache. Bump CACHE_VERSION on shell-layout changes. */
const CACHE_VERSION = "arnfa-v1-2026-05-31";
const SHELL = ["/", "/plan", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return; // never cache forecast — Iron Rule 0
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(request).then((r) => r ?? caches.match("/"))));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ?? fetch(request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
        }
        return res;
      }),
    ),
  );
});
