import type { SeedDistrict } from "@/lib/plan/buildPlan";

/**
 * crowdApply — the PURE read-back transform (no I/O), so it runs identically on the
 * server (/api/plan, /api/ask) and the client (/plan builds the plan in the browser).
 * Given the crowd aggregate rows, refine each POI's seed profile:
 *   • raise `confidence` for crowd-confirmed places (capped — never claims certainty),
 *   • nudge `rainEnjoyment` toward what real visitors reported while it was raining,
 *   • attach poi.crowd = {n, okRate} for the "เรียนรู้จาก N ครั้ง" chip.
 */
export type CrowdRow = { poi_id: string; n: number; ok: number; bad: number; rain_ok: number; rain_bad: number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const MIN_VERDICTS = 3; // below this a POI's crowd signal isn't trusted to move the plan

export function applyCrowdRows(district: SeedDistrict, rows: CrowdRow[] | null | undefined): SeedDistrict {
  if (!district.pois.length || !rows?.length) return district;
  const byId = new Map(rows.map((r) => [r.poi_id, r]));
  const pois = district.pois.map((p) => {
    const c = byId.get(p.id);
    if (!c || c.n < MIN_VERDICTS) return p;
    const okRate = c.ok / Math.max(1, c.ok + c.bad);
    const profile = { ...p.profile };
    profile.confidence = clamp01(Math.min(0.95, profile.confidence + Math.min(0.4, c.n * 0.04)));
    const rainN = c.rain_ok + c.rain_bad;
    if (rainN >= 2) {
      const rainOkRate = c.rain_ok / rainN;
      profile.rainEnjoyment = clamp01(profile.rainEnjoyment * 0.5 + rainOkRate * 0.5);
    }
    return { ...p, profile, crowd: { n: c.n, okRate } };
  });
  return { ...district, pois };
}
