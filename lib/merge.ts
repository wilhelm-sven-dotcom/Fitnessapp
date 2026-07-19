/**
 * Merge the cloud and local snapshots of the wilhelm-training-* stores for the
 * sign-in case where BOTH sides carry data (a device trained locally before
 * logging into an account that already has cloud history). Previously the
 * cloud copy silently overwrote local — losing unsynced sessions.
 *
 * Rules:
 * - history arrays union: log/cardio/body dedupe by `date`, days/gyms/custom
 *   by `id` — the cloud entry wins on a collision (it was saved first).
 * - per-key maps (choices, exerciseVideos, exerciseNotes) merge with LOCAL
 *   winning — the device's edits are the newest intent.
 * - settings: cloud wins, but device cosmetics stay local (skin, theme, icon,
 *   accentColor) and `onboarded` is sticky-true.
 * - equip stays local (it mirrors the device's currently active gym).
 *
 * Pure and raw-string based (the sync layer moves raw JSON strings), so it is
 * directly testable and never throws on malformed input.
 */
import { KEYS } from "@/lib/storage";

type RawMap = Record<string, string>;

function parse<T>(raw: string | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function unionBy<T>(local: T[], cloud: T[], key: (x: T) => string): T[] {
  const out = new Map<string, T>();
  // Array-Guard: ein Nicht-Array-Parse-Ergebnis (verformte Cloud-/Local-Kopie)
  // darf die `for..of`-Schleife nicht werfen — sonst reißt der Pull komplett ab
  // (der Docstring „never throws on malformed input" wird damit wahr).
  for (const x of Array.isArray(local) ? local : []) out.set(key(x), x);
  for (const x of Array.isArray(cloud) ? cloud : []) out.set(key(x), x); // cloud wins on collision
  return [...out.values()];
}

export function mergeCloudLocal(cloud: RawMap, local: RawMap): RawMap {
  const byDate = new Set<string>([KEYS.log, KEYS.cardio, KEYS.body]);
  const byId = new Set<string>([KEYS.days, KEYS.gyms, KEYS.custom]);
  const byKey = new Set<string>([KEYS.choices, KEYS.exerciseVideos, KEYS.exerciseNotes]);

  const merged: RawMap = {};
  for (const k of Object.values(KEYS)) {
    const c = cloud[k];
    const l = local[k];
    if (c == null && l == null) continue;
    if (c == null) {
      merged[k] = l;
      continue;
    }
    if (l == null) {
      merged[k] = c;
      continue;
    }
    if (byDate.has(k)) {
      const arr = unionBy(
        parse<{ date?: string }[]>(l, []),
        parse<{ date?: string }[]>(c, []),
        (x) => String(x?.date ?? ""),
      );
      // History consumers assume chronological order (lastPerf walks backwards,
      // log[length-1] is "latest") — keep the invariant after the union.
      arr.sort((a, b) => String(a?.date ?? "").localeCompare(String(b?.date ?? "")));
      merged[k] = JSON.stringify(arr);
    } else if (byId.has(k)) {
      merged[k] = JSON.stringify(
        unionBy(
          parse<{ id?: string }[]>(l, []),
          parse<{ id?: string }[]>(c, []),
          (x) => String(x?.id ?? ""),
        ),
      );
    } else if (byKey.has(k)) {
      merged[k] = JSON.stringify({
        ...parse<Record<string, unknown>>(c, {}),
        ...parse<Record<string, unknown>>(l, {}),
      });
    } else if (k === KEYS.settings) {
      const lo = parse<Record<string, unknown>>(l, {});
      const cl = parse<Record<string, unknown>>(c, {});
      merged[k] = JSON.stringify({
        ...lo,
        ...cl,
        skin: lo.skin ?? cl.skin,
        theme: lo.theme ?? cl.theme,
        icon: lo.icon ?? cl.icon,
        accentColor: lo.accentColor ?? cl.accentColor,
        onboarded: Boolean(lo.onboarded) || Boolean(cl.onboarded),
      });
    } else {
      merged[k] = l; // equip & future keys: the device's current state wins
    }
  }
  return merged;
}
