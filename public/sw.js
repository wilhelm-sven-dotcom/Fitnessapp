// Minimal offline service worker — no build step, no dependency.
// Navigations: network-first (fresh when online, cached shell when offline).
// Static assets: cache-first with runtime caching (Next chunks are content-
// hashed, so a URL always maps to the same bytes — cache-first is safe).
//
// Bump CACHE on every release that must purge old code: the activate handler
// deletes every cache that isn't the current name, which throws away a previous
// build's chunk cache. Combined with the client reload below, this self-heals a
// device stuck on a stale build (an old session requesting chunks the new build
// no longer has → ChunkLoadError on navigation). It only ever clears CODE
// caches — never localStorage/IndexedDB, so training data is untouched.
const CACHE = "training-v4";
const SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1) Drop every previous-build cache (stale chunks included).
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // 2) Take control of already-open pages immediately.
      await self.clients.claim();
      // 3) Heal any window stuck on the old build: now that the stale cache is
      //    gone and we control the page, reload it so it pulls the fresh HTML +
      //    chunks. Best-effort — older WebKit may not implement client.navigate.
      try {
        const wins = await self.clients.matchAll({ type: "window" });
        await Promise.all(
          wins.map((c) =>
            typeof c.navigate === "function" ? c.navigate(c.url).catch(() => {}) : null,
          ),
        );
      } catch {
        /* navigate unsupported — the next manual reload still recovers */
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(SHELL))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(async (c) => {
              await c.put(request, copy);
              // LRU-ish prune: without a cap the runtime cache grows across
              // releases forever (old hashed chunks, media). Oldest-first.
              const keys = await c.keys();
              const MAX = 80;
              if (keys.length > MAX)
                await Promise.all(keys.slice(0, keys.length - MAX).map((k) => c.delete(k)));
            });
          }
          return res;
        }),
    ),
  );
});
