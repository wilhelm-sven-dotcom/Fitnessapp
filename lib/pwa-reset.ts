/** Antwortet der Server wirklich? `/sw.js` fasst der Worker selbst nie an,
 *  die Anfrage geht also immer ins Netz. */
async function serverErreichbar(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const abbruch = new AbortController();
  const frist = setTimeout(() => abbruch.abort(), 4000);
  try {
    const res = await fetch("/sw.js", { cache: "no-store", signal: abbruch.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(frist);
  }
}

/**
 * Hard-reset the PWA's cached code: drop every Cache Storage entry and
 * unregister every service worker. Letzter Ausweg der Fehlerseite
 * (`app/global-error.tsx`), wenn die App gar nicht mehr startet: danach holt
 * der nächste Aufruf einen sauberen Build direkt aus dem Netz.
 *
 * Geleert wird NUR, wenn der Server gerade antwortet. Ohne Netz gäbe es danach
 * weder Worker noch Cache, und die App ließe sich erst wieder öffnen, wenn es
 * Empfang gibt — im Studio also gar nicht. „Verbunden, aber nichts kommt an“
 * zählt dabei als ohne Netz; `navigator.onLine` allein merkt das nicht.
 *
 * Best-effort and total: every step is guarded so a missing API, a blocked
 * cache, or a rejected promise can never throw — callers can safely
 * `purgeCachesAndWorkers().finally(() => location.reload())`.
 */
export async function purgeCachesAndWorkers(): Promise<void> {
  if (!(await serverErreichbar())) return;
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
