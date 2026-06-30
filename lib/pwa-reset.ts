/**
 * Hard-reset the PWA's cached code: drop every Cache Storage entry and
 * unregister every service worker. Used to recover from a stale-chunk /
 * version-skew state — an old open session (typical on an iOS standalone PWA
 * that resumes a suspended tab) requesting content-hashed code chunks that no
 * longer exist after a new deploy → a ChunkLoadError on navigation. After this
 * runs, the next load fetches a clean, internally-consistent build straight
 * from the network with no worker in the way.
 *
 * Best-effort and total: every step is guarded so a missing API, a blocked
 * cache, or a rejected promise can never throw — callers can safely
 * `purgeCachesAndWorkers().finally(() => location.reload())`.
 */
export async function purgeCachesAndWorkers(): Promise<void> {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* Cache Storage unavailable or blocked */
  }
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* Service Worker API unavailable or blocked */
  }
}
