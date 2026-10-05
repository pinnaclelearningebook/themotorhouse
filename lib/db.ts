import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for server-side use only.
 *
 * This uses the SERVICE ROLE key, which bypasses row-level security. The
 * `server-only` import above makes importing this file from a client
 * component a build error rather than a leaked key.
 *
 * RLS currently denies everything to anon and authenticated by design
 * (supabase/migrations/20261005120100_rls.sql), so the service role is
 * the only path that can read or write. That is deliberate for Phase B.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  client ??= createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
