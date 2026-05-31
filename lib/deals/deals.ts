"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { SkyState } from "@/components/SkyChip";

/**
 * deals.ts — the HONEST monetization rail. We read REAL merchant deals from
 * arnfa.deal (RLS already filters to currently-active ones) and only show a chip
 * when a real one matches the weather at that stop. No deals are seeded; if the
 * table is empty (it is, today) nothing renders. We never fabricate a discount.
 */

export type Deal = {
  id: string;
  poiId: string;
  merchantName: string;
  title: string;
  weatherTrigger: "rain" | "heat" | "clear" | "any";
  url: string | null;
};

/** All currently-active deals, keyed by app POI id. Empty map if none / no Supabase. */
export async function fetchActiveDeals(): Promise<Map<string, Deal>> {
  const sb = getSupabase();
  const map = new Map<string, Deal>();
  if (!sb) return map;
  try {
    const { data, error } = await sb
      .from("deal")
      .select("id, poi_id, merchant_name, title, weather_trigger, url");
    if (error || !data) return map;
    for (const d of data as Array<Record<string, unknown>>) {
      map.set(String(d.poi_id), {
        id: String(d.id), poiId: String(d.poi_id), merchantName: String(d.merchant_name),
        title: String(d.title), weatherTrigger: d.weather_trigger as Deal["weatherTrigger"],
        url: (d.url as string | null) ?? null,
      });
    }
  } catch { /* deals are a bonus; never break the plan on a DB hiccup */ }
  return map;
}

/** Does a deal's trigger match the sky at the stop's arrival? */
export function dealMatchesWeather(trigger: Deal["weatherTrigger"], sky: SkyState): boolean {
  switch (trigger) {
    case "any": return true;
    case "rain": return sky === "rain" || sky === "storm";
    case "heat": return sky === "clear" || sky === "partly";
    case "clear": return sky === "clear";
    default: return false;
  }
}

/** Submit a shop's interest in listing weather deals (write-only intake). */
export async function submitMerchantLead(placeName: string, contact: string, note?: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.from("merchant_lead").insert({ place_name: placeName, contact, note: note ?? null });
    return !error;
  } catch { return false; }
}
