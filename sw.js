// Service worker: network-first strategy for JS and CSS files.
// Ensures GitHub Pages deployments are picked up immediately
// without requiring a hard refresh.

const CACHE_NAME = "cambrian-v1";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin JS/CSS requests
  if (url.origin !== location.origin) return;
  if (!url.pathname.match(/\.(js|css)$/)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Got a fresh response — cache it and return
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Network failed — fall back to cache (offline support)
        return caches.match(event.request);
      })
  );
});

// On activation, clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
});
