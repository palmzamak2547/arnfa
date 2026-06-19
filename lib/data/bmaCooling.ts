import snapshot from "./bmaCooling.snapshot.json"; // bundled real data — portal blocks Vercel

/**
 * bmaCooling — OFFICIAL Bangkok "ห้องหลบร้อน" cooling centers (BMA ArcGIS layer
 * COOLINGCENTER/BKKCOOLINGCENTER). Real public heat/haze refuges with coordinates,
 * district, address, hours. The BDI "Envi Link" health×environment cross-link: when
 * heat or PM2.5 is dangerous, Arnfa points you at the nearest official refuge. Snapshot
 * fallback because the portal blocks cloud IPs (see reference_thai-gov-portal-blocks-vercel-snapshot).
 */
export type CoolingCenter = {
  id: string; name: string; type: string; district: string; address: string; time: string; lat: number; lng: number;
};

export const COOLING_ARCGIS =
  "https://bmamap.bangkok.go.th/bmamap/rest/services/COOLINGCENTER/BKKCOOLINGCENTER/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson";
export const COOLING_SOURCE = "bmamap.bangkok.go.th";
export const COOLING_SNAPSHOT_DATE = (snapshot as { date: string }).date;

const BKK = { latMin: 13.4, latMax: 14.0, lngMin: 100.2, lngMax: 100.95 };

type GeoFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> };

/** Pure parse of the ArcGIS GeoJSON → validated centers (out-of-bounds / nameless dropped). */
export function parseCoolingGeoJSON(gj: { features?: GeoFeature[] }): CoolingCenter[] {
  const out: CoolingCenter[] = [];
  for (const f of gj?.features ?? []) {
    const [lng, lat] = f?.geometry?.coordinates ?? [];
    const p = f?.properties ?? {};
    const name = String(p.NAME ?? "").trim();
    if (!name || typeof lat !== "number" || typeof lng !== "number") continue;
    if (lat < BKK.latMin || lat > BKK.latMax || lng < BKK.lngMin || lng > BKK.lngMax) continue;
    out.push({
      id: String(p.ID ?? p.OBJECTID ?? out.length),
      name, type: String(p.TYPE ?? "").trim(), district: String(p.DNAME ?? "").trim(),
      address: String(p.ADDRESS ?? "").trim(), time: String(p.TIME ?? "").trim(), lat, lng,
    });
  }
  return out;
}

/** Fetch live (with snapshot fallback). Server-side; the 592-row snapshot stays off the client. */
export async function fetchCoolingCenters(): Promise<CoolingCenter[]> {
  try {
    const r = await fetch(COOLING_ARCGIS, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    if (r.ok) {
      const live = parseCoolingGeoJSON(await r.json());
      if (live.length) return live;
    }
  } catch {
    /* portal blocks cloud IPs → snapshot */
  }
  return (snapshot as { centers: CoolingCenter[] }).centers;
}

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The n nearest centers to a point, with the distance (km) attached. */
export function nearestCooling(centers: CoolingCenter[], lat: number, lng: number, n: number): (CoolingCenter & { km: number })[] {
  return centers.map((c) => ({ ...c, km: km(lat, lng, c.lat, c.lng) })).sort((a, b) => a.km - b.km).slice(0, n);
}
