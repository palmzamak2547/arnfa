/**
 * districts.ts — runtime access to the generated district registry.
 *
 * Metadata (DISTRICTS) is statically available for the picker; the full POI list
 * for a district is fetched lazily via DISTRICT_LOADERS (a separate chunk each)
 * and memoised here so re-selecting a district is instant. This is what lets
 * Arnfa cover all of Bangkok without bloating the initial bundle.
 */
import { DISTRICTS as GEN_DISTRICTS, DISTRICT_KEYS as GEN_KEYS, DISTRICT_LOADERS, ZONE_ORDER as GEN_ZONE_ORDER, type DistrictMeta } from "@/lib/poi/registry.generated";
import type { SeedDistrict } from "@/lib/plan/buildPlan";
import { getMockProvinceDistrict } from "@/lib/ml/attractionDb";

export const DISTRICTS: DistrictMeta[] = [
  ...GEN_DISTRICTS,
  { key: "chiang-mai", th: "เชียงใหม่ (เมือง)", en: "Chiang Mai", lat: 18.7883, lng: 98.9853, zone: "Other Provinces", tier: "province", count: 15 },
  { key: "phuket", th: "ภูเก็ต (ป่าตอง/เมือง)", en: "Phuket", lat: 7.8804, lng: 98.3922, zone: "Other Provinces", tier: "province", count: 15 },
  { key: "chonburi", th: "ชลบุรี (พัทยา/บางแสน)", en: "Chonburi (Pattaya)", lat: 12.9236, lng: 100.8824, zone: "Other Provinces", tier: "province", count: 15 },

];
export const DISTRICT_KEYS = [...GEN_KEYS, "chiang-mai", "phuket", "chonburi"];
export const ZONE_ORDER = [...GEN_ZONE_ORDER, "Other Provinces"];

export type { DistrictMeta };

const cache = new Map<string, SeedDistrict>();
const META_BY_KEY = new Map(DISTRICTS.map((d) => [d.key, d] as const));

export function districtMeta(key: string): DistrictMeta | undefined {
  return META_BY_KEY.get(key);
}

/** Load a district's full POI list (cached). Supports mock provinces. */
export async function loadDistrict(key: string): Promise<SeedDistrict> {
  const hit = cache.get(key);
  if (hit) return hit;
  if (key === "chiang-mai" || key === "phuket" || key === "chonburi") {
    const d = getMockProvinceDistrict(key);
    cache.set(key, d);
    return d;
  }
  const loader = DISTRICT_LOADERS[key];
  if (!loader) throw new Error(`unknown district: ${key}`);
  const d = await loader();
  cache.set(key, d);
  return d;
}

const R = 6371;
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest district to a coordinate (for the "ใกล้ฉัน" geolocation shortcut). */
export function nearestDistrict(lat: number, lng: number): DistrictMeta {
  let best = DISTRICTS[0];
  let bestKm = Infinity;
  for (const d of DISTRICTS) {
    const km = haversineKm(lat, lng, d.lat, d.lng);
    if (km < bestKm) { bestKm = km; best = d; }
  }
  return best;
}

/** The n districts closest to a point, nearest first (for the microclimate compare). */
export function nearestDistricts(lat: number, lng: number, n: number): (DistrictMeta & { km: number })[] {
  return DISTRICTS
    .map((d) => ({ ...d, km: haversineKm(lat, lng, d.lat, d.lng) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

/** Group districts by zone in ZONE_ORDER, applying an optional text filter. */
export function groupedDistricts(filter = ""): { zone: string; items: DistrictMeta[] }[] {
  const q = filter.trim().toLowerCase();
  const match = (d: DistrictMeta) => !q || d.th.toLowerCase().includes(q) || d.en.toLowerCase().includes(q) || d.key.includes(q);
  const groups = new Map<string, DistrictMeta[]>();
  for (const d of DISTRICTS) {
    if (!match(d)) continue;
    (groups.get(d.zone) ?? groups.set(d.zone, []).get(d.zone)!).push(d);
  }
  return ZONE_ORDER
    .filter((z) => groups.has(z))
    .map((zone) => ({ zone, items: groups.get(zone)! }));
}
