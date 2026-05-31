"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Arnfa Supabase client — points at the miracle-investment project, scoped to the
 * `arnfa` Postgres schema (shared DB, namespaced — never touches public mi_* tables).
 *
 * Anonymous by default: Phase 1 has no auth yet, so feedback writes go in with a
 * null user_id (the RLS `feedback_insert_own` policy allows user_id IS NULL). Saved
 * trips + taste sync require auth and light up in Phase 2.
 *
 * Returns null if env isn't configured, so the app degrades gracefully to
 * localStorage-only (Phase 1 worked entirely without a DB).
 */

// Inferred type keeps the schema-parameterized client ("arnfa") instead of the
// default "public" — avoids the SupabaseClient<...,"public"> assignability error.
function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: "arnfa" },
    auth: { persistSession: false },
  });
}

let _client: ReturnType<typeof makeClient> | undefined;

export function getSupabase() {
  if (_client === undefined) _client = makeClient();
  return _client;
}
