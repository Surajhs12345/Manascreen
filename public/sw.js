/* ManaScreen Service Worker
   Provides offline support + faster loads.
   Strategy: cache-first for static assets, network-first for the main app shell.
*/

const CACHE_VERSION = "manascreen-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/icon.svg",
];

// On install: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// On activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Network-first for HTML (so users get latest version when online)
// - Cache-first for everything else (JS, CSS, images, fonts)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GET requests from our origin
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !url.hostname.includes("fonts")) {
    return; // let cross-origin requests through untouched
  }

  // HTML: network-first with cache fallback
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Only cache successful responses
          if (!res || res.status !== 200 || res.type === "opaque") return res;
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => {
          // If asset not cached and offline, fail gracefully
          return new Response("", { status: 504, statusText: "Offline" });
        });
    })
  );
});
