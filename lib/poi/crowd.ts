import type { SeedDistrict } from "@/lib/plan/buildPlan";
import { applyCrowdRows, type CrowdRow } from "@/lib/poi/crowdApply";
import { CROWD_ENABLED } from "@/lib/poi/crowdEnabled";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Server-side flywheel read-back: fetch arnfa.poi_crowd for a district's POIs and
 * overlay the crowd signal onto their profiles (see crowdApply). Best-effort — any
 * failure (no env / table missing / network) returns the district untouched, so the
 * plan always works on seed profiles alone ("มีน้อยดีกว่าไม่มี").
 */
export async function overlayCrowd(district: SeedDistrict): Promise<SeedDistrict> {
  if (!CROWD_ENABLED) return district;
  const sb = getServerSupabase();
  if (!sb || !district.pois.length) return district;
  try {
    const ids = district.pois.map((p) => p.id);
    const { data, error } = await sb
      .from("poi_crowd")
      .select("poi_id, n, ok, bad, rain_ok, rain_bad")
      .in("poi_id", ids);
    if (error) return district;
    return applyCrowdRows(district, data as CrowdRow[]);
  } catch {
    return district;
  }
}
