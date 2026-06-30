import { haversineKm, walkMinutes } from "@/lib/transport/route";

/**
 * transit.ts — "how do I get between stops". The minutes are road-realistic (haversine ×
 * detour, via walkMinutes — consistent with the planner), not a naive straight line. Still
 * an ESTIMATE (prefixed "~") until a real route is fetched; PlanClient upgrades the few
 * displayed hops to exact OpenRouteService walking times when an ORS key is configured.
 */

export type Hop = { km: number; min: number; mode: "walk" | "ride" };

export function hopEstimate(aLat: number, aLng: number, bLat: number, bLng: number): Hop {
  const km = haversineKm(aLat, aLng, bLat, bLng);
  if (km <= 1.5) return { km, min: Math.max(1, Math.round(walkMinutes(aLat, aLng, bLat, bLng))), mode: "walk" };
  return { km, min: Math.max(1, Math.round((km * 1.4 / 18) * 60)), mode: "ride" }; // ~18 km/h urban, road-corrected
}

export function hopLabel(h: Hop, en: boolean): string {
  const dist = h.km < 1 ? `~${Math.round(h.km * 1000)} ${en ? "m" : "ม."}` : `~${h.km.toFixed(1)} ${en ? "km" : "กม."}`;
  if (h.mode === "walk") return en ? `walk ~${h.min} min, ${dist}` : `เดิน ~${h.min} นาที, ${dist}`;
  return en ? `~${h.min} min by car, ${dist}` : `นั่งรถ ~${h.min} นาที, ${dist}`;
}

/** Real routed label (no "~") for an exact OpenRouteService leg. */
export function routedHopLabel(minutes: number, meters: number, en: boolean): string {
  const dist = meters < 1000 ? `${Math.round(meters)} ${en ? "m" : "ม."}` : `${(meters / 1000).toFixed(1)} ${en ? "km" : "กม."}`;
  return en ? `walk ${Math.max(1, Math.round(minutes))} min, ${dist}` : `เดิน ${Math.max(1, Math.round(minutes))} นาที, ${dist}`;
}
