/**
 * buildPlan — ties seed POIs + forecast + weatherFit + planner into a day plan.
 * Spec: projects/arnfa/02-architecture.md
 */

import { weatherFit, finalScore, type PoiProfile, type SlotForecast } from "@/lib/core/weatherFit";
import { planTrip, type Candidate, type PlannerOutput } from "@/lib/core/planner";
import { isOpenAtISO, type OpenStatus } from "@/lib/core/openingHours";
import type { HourlyForecast } from "@/lib/weather/types";
import { skyStateFrom, type SkyState } from "@/components/SkyChip";

export type SeedPoi = {
  id: string;
  osmId: number;
  name: string;
  nameTh: string | null;
  lat: number;
  lng: number;
  category: string;
  profile: PoiProfile;
  openingHoursRaw: string | null;
  tags: Record<string, string | undefined>;
};

export type SeedDistrict = {
  district: string;
  districtTh: string;
  bbox: [number, number, number, number];
  fetchedAt: string;
  count: number;
  pois: SeedPoi[];
};

export type TasteVector = Partial<Record<string, number>>;

export const NEUTRAL_TASTE: TasteVector = {
  cafe: 0.7, restaurant: 0.6, bar: 0.5, park: 0.7, garden: 0.6,
  market: 0.6, mall: 0.4, museum: 0.6, gallery: 0.6, library: 0.5,
  viewpoint: 0.7, playground: 0.3, other: 0.4,
};

const R = 6371;
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const walkMin = (aLat: number, aLng: number, bLat: number, bLng: number) => (haversineKm(aLat, aLng, bLat, bLng) / 5) * 60;

const toSlot = (f: HourlyForecast): SlotForecast => ({
  hourISO: f.hourISO, rainProb: f.rainProb, rainIntensity: f.rainIntensity, heatIndex: f.heatIndex,
});

export type PlanOptions = {
  startHourIndex: number;
  budgetMin: number;
  start: { lat: number; lng: number };
  taste?: TasteVector;
  forecastOverride?: HourlyForecast[];
};

export type EnrichedStop = {
  poi: SeedPoi;
  arrivalHourISO: string;
  arrivalLabel: string;
  skyState: SkyState;
  tempC: number;
  rainProb: number;
  fit: number;
  reason: string;
  score: number;
  /** Honest open/closed status at arrival (from OSM opening_hours). */
  openStatus: OpenStatus;
};

export type BuiltPlan = { stops: EnrichedStop[]; totalScore: number; totalMin: number; providerUsed?: string };

const isNightHour = (hourISO: string) => { const h = new Date(hourISO).getHours(); return h < 6 || h >= 19; };
const hourLabel = (hourISO: string) => { const d = new Date(hourISO); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function buildPlan(district: SeedDistrict, forecast: HourlyForecast[], opts: PlanOptions): BuiltPlan {
  const taste = opts.taste ?? NEUTRAL_TASTE;
  const fc = opts.forecastOverride ?? forecast;
  const slotSizeMin = 60;

  const poiCategory = new Map(district.pois.map((p) => [p.id, p.category]));

  const candidates: Candidate[] = district.pois.map((poi) => {
    const scoreAtSlot: Record<number, number> = {};
    for (let i = 0; i < fc.length; i++) {
      const fit = weatherFit(poi.profile, toSlot(fc[i])).fit;
      scoreAtSlot[i] = finalScore({
        interest: taste[poi.category] ?? 0.4,
        fit, isOpenAt: 1, reachable: 1, proximityBoost: 1, confidence: poi.profile.confidence,
      });
    }
    const travelMin: Record<string, number> = {};
    for (const other of district.pois) {
      if (other.id === poi.id) continue;
      travelMin[other.id] = walkMin(poi.lat, poi.lng, other.lat, other.lng);
    }
    // Honest open/closed per forecast hour — a KNOWN-closed place is hard-gated
    // out of the plan; unknown stays eligible (flagged in UI, not fabricated).
    const openByAbs = fc.map((f) => isOpenAtISO(poi.openingHoursRaw, f.hourISO));
    const isOpenAt = ((rel: number) => {
      const abs = Math.min(Math.max(opts.startHourIndex + rel, 0), openByAbs.length - 1);
      return openByAbs[abs] === "closed" ? 0 : 1;
    }) as Candidate["isOpenAt"];
    return {
      id: poi.id,
      baseScore: scoreAtSlot[opts.startHourIndex] ?? 0,
      scoreAtSlot,
      travelMin,
      stayMin: stayForCategory(poi.category),
      isOpenAt,
    };
  });

  const shifted = candidates.map((c) => {
    const s: Record<number, number> = {};
    for (const [k, v] of Object.entries(c.scoreAtSlot ?? {})) {
      const rel = Number(k) - opts.startHourIndex;
      if (rel >= 0) s[rel] = v;
    }
    return { ...c, scoreAtSlot: s, baseScore: s[0] ?? 0 };
  });

  const startTravelMin: Record<string, number> = {};
  for (const poi of district.pois) startTravelMin[poi.id] = walkMin(opts.start.lat, opts.start.lng, poi.lat, poi.lng);

  // Diversity dampener — without it a cafe-dense district yields an all-cafe plan
  // (boring, and the rain-swap never fires). Halve a candidate's score for each
  // OTHER candidate of the same category that out-scores it, so the planner spreads
  // across categories (cafe → park → market → gallery …) instead of stacking one.
  const catRank = new Map<string, number>();
  const byCat: Record<string, { id: string; base: number }[]> = {};
  for (const c of shifted) {
    const cat = poiCategory.get(c.id) ?? "other";
    (byCat[cat] ??= []).push({ id: c.id, base: c.baseScore });
  }
  for (const cat of Object.keys(byCat)) {
    byCat[cat].sort((a, b) => b.base - a.base).forEach((x, i) => catRank.set(x.id, i));
  }
  const diversified = shifted.map((c) => {
    const rank = catRank.get(c.id) ?? 0;
    const damp = 1 / (1 + rank * 0.9); // 1st of its category = 1.0, 2nd ≈ 0.53, 3rd ≈ 0.36…
    const s: Record<number, number> = {};
    for (const [k, v] of Object.entries(c.scoreAtSlot ?? {})) s[Number(k)] = v * damp;
    return { ...c, scoreAtSlot: s, baseScore: (s[0] ?? 0) };
  });

  const planOut: PlannerOutput = planTrip({ candidates: diversified, budgetMin: opts.budgetMin, startTravelMin, slotSizeMin });

  const poiById = new Map(district.pois.map((p) => [p.id, p]));
  const stops: EnrichedStop[] = planOut.stops.map((s) => {
    const poi = poiById.get(s.id)!;
    const f = fc[Math.min(opts.startHourIndex + s.slotIndex, fc.length - 1)];
    const fitR = weatherFit(poi.profile, toSlot(f));
    return {
      poi,
      arrivalHourISO: f.hourISO,
      arrivalLabel: hourLabel(f.hourISO),
      skyState: skyStateFrom({ rainProb: f.rainProb, rainIntensity: f.rainIntensity, cloudCover: f.cloudCover, isNight: isNightHour(f.hourISO) }),
      tempC: f.tempC,
      rainProb: f.rainProb,
      fit: fitR.fit,
      reason: fitR.reason,
      score: s.scoreRealized,
      openStatus: isOpenAtISO(poi.openingHoursRaw, f.hourISO),
    };
  });

  return { stops, totalScore: planOut.totalScore, totalMin: planOut.totalMin };
}

function stayForCategory(cat: string): number {
  switch (cat) {
    case "cafe": return 60;
    case "restaurant": return 75;
    case "bar": return 90;
    case "park": case "garden": return 75;
    case "market": return 60;
    case "mall": return 90;
    case "museum": case "gallery": return 75;
    case "library": return 60;
    case "viewpoint": return 30;
    default: return 60;
  }
}

export function districtCentroid(d: SeedDistrict): { lat: number; lng: number } {
  const [s, w, n, e] = d.bbox;
  return { lat: (s + n) / 2, lng: (w + e) / 2 };
}
