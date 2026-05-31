/**
 * shelter.ts — when rain is imminent, find the nearest place to DUCK INTO.
 * Prefers genuinely indoor/covered venues (café, mall, gallery, library) close to
 * the user's live position. Pure + testable.
 */

import type { SeedPoi } from "@/lib/plan/buildPlan";

export type Shelter = { poi: SeedPoi; km: number; walkMin: number; covered: boolean };

const R = 6371;
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const isCovered = (p: SeedPoi) => p.profile.indoorness >= 0.6 || p.profile.covered >= 0.7;

/**
 * Nearest shelter to (lat,lng). Prefers covered venues; if none are within reach
 * it falls back to the nearest place overall (flagged covered=false so the UI can
 * be honest that it's not fully indoor). Returns null only when there are no POIs.
 */
export function nearestShelter(pois: SeedPoi[], lat: number, lng: number): Shelter | null {
  if (!pois.length) return null;
  const withDist = pois.map((poi) => ({ poi, km: haversineKm(lat, lng, poi.lat, poi.lng) }));
  const covered = withDist.filter((x) => isCovered(x.poi)).sort((a, b) => a.km - b.km);
  const pick = covered[0] ?? withDist.sort((a, b) => a.km - b.km)[0];
  return { poi: pick.poi, km: Math.round(pick.km * 1000) / 1000, walkMin: Math.round((pick.km / 5) * 60), covered: isCovered(pick.poi) };
}
