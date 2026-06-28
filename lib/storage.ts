/**
 * Abstracted persistence layer.
 *
 * localStorage is the fast, always-available cache. When Cloud-Sync is
 * configured and the user is signed in, every write is mirrored to Supabase
 * (`cloudPush`) and a login pulls the cloud copy down (`cloudPull`). Without
 * Supabase configured, all cloud helpers no-op and the app stays purely local.
 */

import { getSupabase, isCloudConfigured } from "@/lib/supabase";

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
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
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode — ignore, in-memory state stays authoritative */
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
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

export const storage = {
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const raw = await adapter.get(key);
    if (raw == null) return fallback;
    try {
      const parsed = JSON.parse(raw) as T;
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  },
  async setJSON<T>(key: string, value: T): Promise<void> {
    const str = JSON.stringify(value);
    try {
      await adapter.set(key, str);
    } catch {
      /* ignore */
    }
    void cloudPush(key, str); // write-through; no-op if cloud off / signed out
  },
  remove(key: string): Promise<void> {
    return adapter.remove(key);
  },
  /** Raw string access — used by Cloud-Sync to mirror exact stored values. */
  getRaw(key: string): Promise<string | null> {
    return adapter.get(key);
  },
  setRaw(key: string, value: string): Promise<void> {
    return adapter.set(key, value);
  },
};

// --- Cloud-Sync (Supabase) --------------------------------------------------

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user.id ?? null;
}

/** Mirror one key to the cloud. Silent no-op when not configured / signed out. */
export async function cloudPush(key: string, value: string): Promise<void> {
  if (!isCloudConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    const userId = await currentUserId();
    if (!userId) return;
    await sb
      .from("app_state")
      .upsert(
        { user_id: userId, key, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" },
      );
  } catch {
    /* offline / RLS — local cache stays authoritative */
  }
}

/** Seed an empty cloud from local data on first login. */
export async function cloudPushAll(entries: [string, string][]): Promise<void> {
  for (const [key, value] of entries) await cloudPush(key, value);
}

/** Pull all of the signed-in user's keys. Null when not configured / signed out. */
export async function cloudPull(): Promise<Record<string, string> | null> {
  if (!isCloudConfigured()) return null;
  const sb = getSupabase();
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
