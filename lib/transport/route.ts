/**
 * transport/route — the single source of travel-time truth.
 *
 * Two layers, by accuracy:
 *   1. walkMinutes()  — pure, synchronous: a road-realistic estimate (haversine ×
 *      detour factor), used by the planner AND the UI so every distance is consistent.
 *      A straight line under-counts city walking by ~40%; the detour factor fixes that
 *      immediately, with no network call.
 *   2. orsRoute()     — async true NAVIGATION via OpenRouteService (real footpaths).
 *      Dormant-until-key (ORS_API_KEY); used to upgrade the FEW displayed hops to exact
 *      times. Falls back to walkMinutes when there's no key / it fails — never blocks.
 *
 * Why ORS and not the public OSRM demo: OSRM's public server only runs the CAR profile,
 * so its /foot/ routes return driving speeds (verified: 7 km "walk" in 10 min). ORS has a
 * real foot-walking profile.
 */
const WALK_KMH = 4.8;       // average city walking speed
const DETOUR = 1.4;         // road path vs straight line, dense Bangkok

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road-realistic walking minutes between two points (pure, synchronous). */
export function walkMinutes(aLat: number, aLng: number, bLat: number, bLng: number): number {
  return (haversineKm(aLat, aLng, bLat, bLng) * DETOUR / WALK_KMH) * 60;
}

export function orsConfigured(): boolean {
  return !!process.env.ORS_API_KEY;
}

export type RoutedLeg = { minutes: number; meters: number; source: "ors" | "estimate" };

/**
 * True walking route for ONE leg via OpenRouteService. Returns null if no key / failure
 * (the caller falls back to walkMinutes). ORS free tier = 2000 routes/day, real footpaths.
 */
export async function orsRoute(
  from: [number, number], // [lng, lat]
  to: [number, number],
): Promise<RoutedLeg | null> {
  const key = process.env.ORS_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking", {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [from, to] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const seg = j?.routes?.[0]?.summary;
    if (!seg || typeof seg.duration !== "number") return null;
    return { minutes: seg.duration / 60, meters: seg.distance ?? 0, source: "ors" };
  } catch {
    return null;
  }
}
