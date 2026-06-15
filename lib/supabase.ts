import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cloud-Sync is opt-in. The client only exists when both public env vars are
 * set; otherwise everything stays local (`getSupabase` returns null and all
 * cloud helpers no-op). Only the anon key is used — security is enforced by
 * Row-Level-Security in the database, never by the client.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isCloudConfigured(): boolean {
  return !!url && !!anon;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured() || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
