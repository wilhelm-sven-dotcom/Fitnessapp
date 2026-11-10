/**
 * Abstracted persistence layer.
 *
 * localStorage ist der Speicher der App: schnell, immer da, auch ohne Netz.
 * Dieses Gerät ist die Wahrheit. Ist Cloud-Sync eingerichtet und der Nutzer
 * angemeldet, geht jede Änderung zusätzlich als Sicherung zu Supabase
 * (`cloudPush`). Klappt das nicht (kein Netz, abgemeldet), merkt sich die App
 * das und reicht den Stand nach (`cloudOffen`). Ohne Supabase tun alle
 * Cloud-Helfer nichts.
 *
 * Drei Schutzschichten gegen Datenverlust:
 *  · Schreiben meldet Erfolg (`setJSON` → boolean). Wer danach etwas wegräumt
 *    (z. B. die laufende Einheit), tut das nur bei `true`.
 *  · Vom Verlauf und den Körperwerten bleibt die Fassung vor der ersten
 *    Änderung des Tages als Sicherung liegen (`…-sicherung`).
 *  · Unlesbare Werte werden nicht gelöscht, sondern beiseitegelegt
 *    (`…-defekt`); für Verlauf und Körperwerte springt die Sicherung ein.
 */

import { isCloudConfigured, loadSupabase } from "@/lib/supabase";

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  /** `true`, wenn der Wert wirklich geschrieben wurde. */
  set(key: string, value: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  /** Alle vorhandenen Schlüssel. */
  keys(): Promise<string[]>;
}

const isBrowser = () => typeof window !== "undefined";

const localStorageAdapter: StorageAdapter = {
  async get(key) {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    if (!isBrowser()) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      /* Speicher voll oder privater Modus */
      return false;
    }
  },
  async remove(key) {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  async keys() {
    if (!isBrowser()) return [];
    try {
      const out: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k != null) out.push(k);
      }
      return out;
    } catch {
      return [];
    }
  },
};

// --- Supabase seam: swap this one line for a `supabaseAdapter` later. ---
const adapter: StorageAdapter = localStorageAdapter;

/** Storage keys — unchanged from the original prototype, plus `body`. */
export const KEYS = {
  log: "wilhelm-training-log",
  equip: "wilhelm-training-equip",
  choices: "wilhelm-training-choices",
  custom: "wilhelm-training-custom",
  body: "wilhelm-training-body",
  settings: "wilhelm-training-settings",
  cardio: "wilhelm-training-cardio",
  // Grabsteine gelöschter Import-Einheiten (Strava-IDs) — der Sync spielt sie
  // sonst beim nächsten Lauf wieder ein. Gelöscht bleibt gelöscht.
  hiddenCardio: "wilhelm-training-cardio-hidden",
  // Deaktivierte Übungen (Ids) — fliegen aus Planung und Tausch-Vorschlägen,
  // bleiben aber im Katalog (reaktivierbar) und in der Historie sichtbar.
  disabledExercises: "wilhelm-training-disabled",
  days: "wilhelm-training-days",
  gyms: "wilhelm-training-gyms",
  exerciseVideos: "wilhelm-training-exercise-videos",
  warmupVideos: "wilhelm-training-warmup-videos",
  exerciseNotes: "wilhelm-training-exercise-notes",
  // Eingefrorene Wochen-Mission (ATLAS) — mergeCloudLocal behandelt unbekannte
  // Keys mit "local wins", der Rollover-Check heilt Konflikte beim Öffnen.
  mission: "wilhelm-training-mission",
  jumps: "wilhelm-training-jumps",
  // Die heutige, von ATLAS komponierte Einheit (synct mit).
  today: "wilhelm-training-today",
  // Laufende Live-Session (crash-sicheres Resume) — bewusst NUR lokal:
  // ein Sync mitten im Training würde Geräte gegenseitig überschreiben.
  active: "wilhelm-training-active",
  // ATLAS-Chatverlauf (gekappt, synct mit).
  chat: "wilhelm-training-chat",
  // Wochen-Rückblick von ATLAS, je Kalenderwoche einer ({ woche, text }).
  rapport: "wilhelm-training-rapport",
} as const;

/** Keys, die NIE in die Cloud gespiegelt werden (gerätelokaler Live-State). */
export const LOCAL_ONLY_KEYS: ReadonlySet<string> = new Set([KEYS.active]);

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

/** Alles, was die App in localStorage ablegt, beginnt so. */
const PRAEFIX = "wilhelm-training-";

/** Von diesen Schlüsseln bleibt die vorige Fassung als Sicherung liegen. */
const MIT_SICHERUNG: ReadonlySet<string> = new Set([KEYS.log, KEYS.body]);
const sicherungKey = (key: string) => `${key}-sicherung`;
const sicherungTagKey = (key: string) => `${key}-sicherung-tag`;
const defektKey = (key: string) => `${key}-defekt`;

/** Heutiges Datum in Ortszeit (JJJJ-MM-TT). */
const heute = () => {
  const d = new Date();
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
};

function alsListe(raw: string | null): unknown[] | null {
  if (raw == null) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Hält die Fassung fest, die vor der ersten Änderung des Tages galt. Eine
 *  leere oder unlesbare Fassung überschreibt nie eine gute Sicherung. */
async function sichereVorher(key: string, neu: string): Promise<void> {
  if (!MIT_SICHERUNG.has(key)) return;
  const alt = await adapter.get(key);
  if (alt == null || alt === neu) return;
  if ((await adapter.get(sicherungTagKey(key))) === heute()) return;
  if (!alsListe(alt)?.length) return;
  if (await adapter.set(sicherungKey(key), alt)) await adapter.set(sicherungTagKey(key), heute());
}

/** Schreibt lokal. Ist der Speicher voll, weichen zuerst Sicherungen und
 *  Beiseitegelegtes: der neue Stand ist wichtiger als der alte. */
async function schreibe(key: string, value: string): Promise<boolean> {
  await sichereVorher(key, value);
  if (await adapter.set(key, value)) return true;
  let frei = false;
  for (const k of await adapter.keys()) {
    if (!k.startsWith(PRAEFIX)) continue;
    if (k.endsWith("-sicherung") || k.endsWith("-sicherung-tag") || k.endsWith("-defekt")) {
      await adapter.remove(k);
      frei = true;
    }
  }
  return frei ? adapter.set(key, value) : false;
}

/** Ereignis am `window`: ein Wert ließ sich lokal nicht speichern. Der
 *  Provider zeigt dazu eine Meldung (die Speicherschicht kennt keine UI). */
export const SPEICHER_VOLL = "spotter-speicher-voll";
function meldeVoll(): void {
  if (isBrowser() && typeof window.dispatchEvent === "function")
    window.dispatchEvent(new Event(SPEICHER_VOLL));
}

export interface Sicherung {
  /** Tag, an dem die Sicherung entstand (JJJJ-MM-TT). */
  tag: string;
  /** Zahl der Einträge darin. */
  anzahl: number;
}

export const storage = {
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const raw = await adapter.get(key);
    if (raw == null) return fallback;
    try {
      const parsed = JSON.parse(raw) as T;
      return parsed ?? fallback;
    } catch {
      // Unlesbar: beiseitelegen statt wegwerfen. Der nächste Schreibvorgang
      // hätte den Wert sonst für immer überschrieben.
      await adapter.set(defektKey(key), raw);
      await adapter.remove(key);
      if (MIT_SICHERUNG.has(key)) {
        const kopie = await adapter.get(sicherungKey(key));
        if (alsListe(kopie) && (await adapter.set(key, kopie as string)))
          return JSON.parse(kopie as string) as T;
      }
      return fallback;
    }
  },
  /** Schreibt lokal und spiegelt in die Cloud. `false`: lokal NICHT
   *  gespeichert (Speicher voll). Dann meldet sich die App von selbst
   *  (`SPEICHER_VOLL`) — außer mit `still`, wenn der Aufrufer das Ergebnis
   *  selbst behandelt. */
  async setJSON<T>(key: string, value: T, opts: { still?: boolean } = {}): Promise<boolean> {
    const str = JSON.stringify(value);
    const ok = await schreibe(key, str);
    if (!ok && !opts.still) meldeVoll();
    // Auch dann in die Cloud, wenn lokal kein Platz war: gerade dann zählt
    // die Kopie. No-op ohne Cloud; ohne Anmeldung oder Netz wird nachgereicht.
    void cloudPush(key, str);
    return ok;
  },
  /** Wie setJSON, aber OHNE Cloud-Spiegelung — für gerätelokalen Live-State. */
  async setJSONLocal<T>(key: string, value: T): Promise<boolean> {
    return adapter.set(key, JSON.stringify(value));
  },
  remove(key: string): Promise<void> {
    return adapter.remove(key);
  },
  /** Raw string access — used by Cloud-Sync to mirror exact stored values. */
  getRaw(key: string): Promise<string | null> {
    return adapter.get(key);
  },
  setRaw(key: string, value: string): Promise<boolean> {
    return schreibe(key, value);
  },

  /** Hält den jetzigen Stand als Sicherung fest — unabhängig davon, ob heute
   *  schon eine entstand. Vor Eingriffen, die viel auf einmal ändern (Import). */
  async sichereJetzt(key: string): Promise<void> {
    const jetzt = await adapter.get(key);
    if (!alsListe(jetzt)?.length || jetzt == null) return;
    if (await adapter.set(sicherungKey(key), jetzt)) await adapter.set(sicherungTagKey(key), heute());
  },
  /** Gibt es eine Sicherung, und von wann? */
  async sicherung(key: string): Promise<Sicherung | null> {
    const liste = alsListe(await adapter.get(sicherungKey(key)));
    if (!liste?.length) return null;
    return { tag: (await adapter.get(sicherungTagKey(key))) ?? "", anzahl: liste.length };
  },
  /**
   * Tauscht den aktuellen Stand gegen die Sicherung: die Sicherung wird zum
   * Stand, der bisherige Stand zur Sicherung. Ein zweiter Aufruf macht den
   * ersten also rückgängig. Gibt den neuen Stand zurück (ungeprüft), `null`
   * ohne Sicherung oder wenn das Schreiben scheitert.
   */
  async tauscheSicherung(key: string): Promise<unknown[] | null> {
    const kopie = await adapter.get(sicherungKey(key));
    const liste = alsListe(kopie);
    if (!liste?.length || kopie == null) return null;
    const jetzt = await adapter.get(key);
    if (!(await adapter.set(key, kopie))) return null;
    if (jetzt != null && alsListe(jetzt)) {
      await adapter.set(sicherungKey(key), jetzt);
      await adapter.set(sicherungTagKey(key), heute());
    }
    void cloudPush(key, kopie);
    return liste;
  },
  /** Löscht alles, was die App auf diesem Gerät abgelegt hat. */
  async leereAlles(): Promise<void> {
    for (const k of await adapter.keys()) if (k.startsWith(PRAEFIX)) await adapter.remove(k);
  },
};

// --- Cloud-Sync (Supabase) --------------------------------------------------

/** „1“: es gibt Änderungen, die die Cloud noch nicht hat. */
const CLOUD_OFFEN = `${PRAEFIX}cloud-offen`;
/** Nutzer-Id, mit der dieses Gerät zuletzt abgeglichen wurde. */
const CLOUD_KONTO = `${PRAEFIX}cloud-konto`;
/** Nutzer-Id: „Alle Daten löschen“ konnte dessen Cloud noch nicht leeren. */
const CLOUD_LEEREN = `${PRAEFIX}cloud-leeren`;

async function currentUserId(): Promise<string | null> {
  const sb = await loadSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user.id ?? null;
}

/**
 * Spiegelt einen Schlüssel in die Cloud. `true`: steht dort (oder muss nicht
 * dorthin). `false`: ging nicht (kein Netz, abgemeldet, abgelehnt) — dann ist
 * vermerkt, dass nachgereicht werden muss.
 */
export async function cloudPush(key: string, value: string): Promise<boolean> {
  if (LOCAL_ONLY_KEYS.has(key) || !isCloudConfigured()) return true;
  let ok = false;
  try {
    const sb = await loadSupabase();
    const userId = sb ? await currentUserId() : null;
    if (sb && userId) {
      const { error } = await sb
        .from("app_state")
        .upsert(
          { user_id: userId, key, value, updated_at: new Date().toISOString() },
          { onConflict: "user_id,key" },
        );
      ok = !error;
    }
  } catch {
    /* offline — wird nachgereicht */
  }
  if (!ok) await adapter.set(CLOUD_OFFEN, "1");
  return ok;
}

/** Alle Einträge in die Cloud. `true`, wenn jeder angekommen ist. */
export async function cloudPushAll(entries: [string, string][]): Promise<boolean> {
  let alle = true;
  for (const [key, value] of entries) if (!(await cloudPush(key, value))) alle = false;
  return alle;
}

/** Wartet etwas darauf, in die Cloud nachgereicht zu werden? */
export async function cloudOffen(): Promise<boolean> {
  return (await adapter.get(CLOUD_OFFEN)) === "1";
}
/** Vor dem Nachreichen aufrufen: ein Fehlschlag setzt den Vermerk neu. */
export function cloudOffenErledigt(): Promise<void> {
  return adapter.remove(CLOUD_OFFEN);
}

/** Mit welchem Konto dieses Gerät zuletzt abgeglichen wurde. */
export function cloudKonto(): Promise<string | null> {
  return adapter.get(CLOUD_KONTO);
}
export async function setzeCloudKonto(userId: string): Promise<void> {
  await adapter.set(CLOUD_KONTO, userId);
}

/** Für welches Konto (Nutzer-Id) die Cloud noch geleert werden muss. */
export function cloudLeerenOffen(): Promise<string | null> {
  return adapter.get(CLOUD_LEEREN);
}
/** „Alle Daten löschen“ kam nicht bis in die Cloud: für dieses Konto nachholen.
 *  Bis dahin wird von dort nichts zurückgeholt. */
export async function merkeCloudLeeren(userId: string): Promise<void> {
  await adapter.set(CLOUD_LEEREN, userId);
}

/**
 * Löscht alle Einträge des angemeldeten Nutzers in der Cloud.
 * `true`: geleert. `null`: nichts zu tun (keine Cloud, niemand angemeldet).
 * `false`: ging nicht (kein Netz, abgelehnt).
 */
export async function cloudLeeren(): Promise<boolean | null> {
  if (!isCloudConfigured()) return null;
  try {
    const sb = await loadSupabase();
    const userId = sb ? await currentUserId() : null;
    if (!sb || !userId) return null;
    const { error } = await sb.from("app_state").delete().eq("user_id", userId);
    if (error) return false;
    if ((await adapter.get(CLOUD_LEEREN)) === userId) await adapter.remove(CLOUD_LEEREN);
    return true;
  } catch {
    return false;
  }
}

/** Pull all of the signed-in user's keys. Null when not configured / signed out. */
export async function cloudPull(): Promise<Record<string, string> | null> {
  if (!isCloudConfigured()) return null;
  const sb = await loadSupabase();
  if (!sb) return null;
  try {
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await sb.from("app_state").select("key,value");
    if (error || !data) return null;
    const out: Record<string, string> = {};
    for (const row of data as { key: string; value: string }[]) out[row.key] = row.value;
    return out;
  } catch {
    return null;
  }
}
