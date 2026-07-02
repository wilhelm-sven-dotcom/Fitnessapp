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
const CACHE = "training-v5";
const SHELL = "/";

// True when this install replaces a previous worker (a release update) — only
// then is there a window on a stale build worth healing. Module state survives
// the install→activate hop because skipWaiting activates immediately.
let isUpdate = false;

self.addEventListener("install", (event) => {
  isUpdate = !!self.registration.active;
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
      //    Two hard-learned rules:
      //    · Only on UPDATES — on the very first install there is no stale
      //      build, and reloading a page that just loaded is pure churn.
      //    · NEVER await the navigations inside waitUntil — a navigation can't
      //      be served until activation finishes (fetch events queue behind the
      //      activating worker), so awaiting it here deadlocks the page.
      if (isUpdate) {
        try {
          const wins = await self.clients.matchAll({ type: "window" });
          for (const c of wins) {
            if (typeof c.navigate === "function") c.navigate(c.url).catch(() => {});
          }
        } catch {
          /* navigate unsupported — the next manual reload still recovers */
        }
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
          // Cache successful same-origin GETs. NO size-cap prune: within one
          // release the content-hashed URL set is fixed, so this cache is
          // naturally bounded to a single build's assets, and the activate
          // handler drops the whole previous-version cache on the next release.
          // A prior oldest-first prune (removed — it caused a crash loop) evicted
          // the FIRST-cached entries, i.e. the shell + framework/webpack chunks
          // the app can't run without → ChunkLoadError on the next navigation.
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
