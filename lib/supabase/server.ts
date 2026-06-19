import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase reader for the `arnfa` schema — stateless, anonymous, for
 * public reads from API routes (e.g. the crowd-feedback aggregate poi_crowd).
 * Returns null if env isn't configured, so the engine degrades to seed profiles.
 */
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: "arnfa" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
