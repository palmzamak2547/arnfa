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
): Promise<void> {
  if (!CROWD_ENABLED) return;
  const sb = getSupabase();
  if (!sb || !poiId) return;
  try {
    await sb.rpc("record_feedback", {
      p_poi_id: poiId,
      p_kind: kind,
      p_in_rain: opts?.inRain ?? false,
      p_context: opts?.context ?? null,
    });
  } catch {
    /* flywheel is best-effort; never surface a DB hiccup to the user */
  }
}
