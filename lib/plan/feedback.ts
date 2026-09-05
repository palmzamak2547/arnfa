"use client";

import { getSupabase } from "@/lib/supabase/client";
import { CROWD_ENABLED } from "@/lib/poi/crowdEnabled";

/**
 * recordFeedback — the flywheel write. Each "ฟ้าตรงไหม 👍/👎" or accepted swap calls
 * the arnfa.record_feedback RPC, which logs the raw event (private) AND bumps the
 * public per-POI aggregate (arnfa.poi_crowd) atomically — so the read-back + the
 * "เรียนรู้จาก N ครั้ง" chip reflect it immediately. Fire-and-forget; silently no-ops
 * if Supabase isn't configured (localStorage Phase 1 still works). Anonymous for now.
 */
export type FeedbackKind = "weather_ok" | "weather_bad" | "accept_swap" | "dismiss";

export async function recordFeedback(
  poiId: string,
  kind: FeedbackKind,
  opts?: { inRain?: boolean; context?: Record<string, unknown> },
): Promise<boolean> {
  // Returns whether the write ACTUALLY landed. The flywheel is still best-effort (a failure
  // never blocks or throws at the user), but the caller must not be able to claim "Arnfah just
  // learned" when nothing was recorded — that would be a fabricated success, which is exactly
  // what this app promises never to do.
  if (!CROWD_ENABLED) return false;
  const sb = getSupabase();
  if (!sb || !poiId) return false;
  try {
    const { error } = await sb.rpc("record_feedback", {
      p_poi_id: poiId,
      p_kind: kind,
      p_in_rain: opts?.inRain ?? false,
      p_context: opts?.context ?? null,
    });
    return !error;
  } catch {
    return false;
  }
}
