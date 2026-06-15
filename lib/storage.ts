/**
 * Abstracted persistence layer.
 *
 * Today everything lives in localStorage. To move to Supabase later, implement
 * a `supabaseAdapter` with the same three methods and change the single
 * `adapter` assignment below — no call site changes, because JSON
 * (de)serialization lives in the `storage` helper, not in the adapter.
 */

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
    try {
      await adapter.set(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key: string): Promise<void> {
    return adapter.remove(key);
  },
};
