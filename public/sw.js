const STATIC_CACHE = "tijori-static-v1";
const STATIC_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-512-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Only the pre-cached icons are ever served from cache. Everything else
// (pages, API calls) always goes to the network — this is a financial app,
// so a stale cached balance shown while offline would be worse than the
// browser's normal offline error.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
