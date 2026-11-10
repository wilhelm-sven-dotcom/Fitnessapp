import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cloud-Sync is opt-in. The client only exists when both public env vars are
 * set; otherwise everything stays local (`loadSupabase` resolves to null and
 * all cloud helpers no-op). Only the anon key is used — security is enforced by
 * Row-Level-Security in the database, never by the client.
 *
 * Das SDK (rund 60 kB gzip) wird erst hier per `import()` geladen und liegt
 * damit in einem eigenen Chunk statt im Layout-Bündel jeder Seite. Schlägt
 * das Nachladen fehl (offline, Chunk noch nicht im Cache), bleibt die App
 * lokal: `null`, wie ohne Konfiguration.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isCloudConfigured(): boolean {
  return !!url && !!anon;
}

let client: SupabaseClient | null = null;
let laedt: Promise<SupabaseClient | null> | null = null;

export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!isCloudConfigured() || typeof window === "undefined") return Promise.resolve(null);
  if (client) return Promise.resolve(client);
  laedt ??= import("@supabase/supabase-js")
    .then(({ createClient }) => {
      client = createClient(url as string, anon as string, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      return client;
    })
    .catch(() => {
      // Beim nächsten Aufruf erneut versuchen (z. B. wieder online).
      laedt = null;
      return null;
    });
  return laedt;
}
