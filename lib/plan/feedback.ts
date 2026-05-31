"use client";

import { getSupabase } from "@/lib/supabase/client";

/**
 * recordFeedback — the flywheel write. Each "ฝนตกก็โอเค 👍/👎" or accepted swap
 * lands in arnfa.feedback, sharpening the POI profile over time. Fire-and-forget,
 * never blocks the UI; silently no-ops if Supabase isn't configured (localStorage
 * Phase 1 still works). Anonymous (user_id null) until auth lands in Phase 2.
 */
export type FeedbackKind = "weather_ok" | "weather_bad" | "accept_swap" | "dismiss";

export async function recordFeedback(
  poiId: string,
  kind: FeedbackKind,
  context?: Record<string, unknown>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("feedback").insert({ poi_id: poiId, kind, context: context ?? null });
  } catch {
    /* flywheel is best-effort; never surface a DB hiccup to the user */
  }
}
