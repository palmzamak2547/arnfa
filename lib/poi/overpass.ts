/**
 * OSM Overpass — POI primary. No key. ODbL (attribution required).
 * Spec: projects/arnfa/03-data-sources.md § OSM Overpass
 */

const ENDPOINT = "https://overpass-api.de/api/interpreter";

export type BBox = [number, number, number, number];

export const BANGKOK_DISTRICTS: Record<string, { th: string; bbox: BBox }> = {
  thonglor: { th: "ทองหล่อ", bbox: [13.7250, 100.5680, 13.7470, 100.5910] },
  ari:      { th: "อารีย์",  bbox: [13.7720, 100.5340, 13.7920, 100.5550] },
  silom:    { th: "สีลม",    bbox: [13.7200, 100.5200, 13.7350, 100.5450] },
};

export type OverpassNode = { type: "node"; id: number; lat: number; lon: number; tags?: Record<string, string> };
export type OverpassResponse = { version: number; generator: string; elements: OverpassNode[] };

export function buildOverpassQuery(bbox: BBox, timeoutSec = 25): string {
  const [s, w, n, e] = bbox;
  const box = `(${s},${w},${n},${e})`;
  return `
[out:json][timeout:${timeoutSec}];
(
  node["amenity"~"cafe|restaurant|bar|pub|food_court|marketplace|library|museum|ice_cream|fast_food"]${box};
  node["leisure"~"park|garden|playground"]${box};
  node["tourism"~"viewpoint|attraction|gallery|museum"]${box};
  node["shop"~"mall|books|bakery|department_store"]${box};
);
out body 200;
`.trim();
}

export async function fetchOverpass(bbox: BBox, signal?: AbortSignal): Promise<OverpassNode[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({ data: buildOverpassQuery(bbox) }),
    signal,
    headers: { "User-Agent": "Arnfa/0.1 (poi seeder)", "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
  const data = (await res.json()) as OverpassResponse;
  return (data.elements ?? []).filter((el) => el.type === "node" && el.tags?.name);
}

export async function fetchDistrictPois(district: keyof typeof BANGKOK_DISTRICTS, signal?: AbortSignal): Promise<OverpassNode[]> {
  const entry = BANGKOK_DISTRICTS[district];
  if (!entry) throw new Error(`Unknown district: ${district}`);
  return fetchOverpass(entry.bbox, signal);
}
