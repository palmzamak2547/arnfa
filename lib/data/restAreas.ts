import snapshot from "./restAreas.snapshot.json"; // 139 จุดพักรถ, from the DOH GeoServer

/**
 * restAreas — official highway rest areas (จุดพักรถ) from the Department of Highways
 * (กรมทางหลวง) GeoServer `roadnet:rest_area`. The intercity counterpart to urban rail:
 * when a trip is to a far province, "where can I pull over and rest on the way" is real
 * "การเดินทาง" data. Static snapshot → bundled, no live fetch, no fabrication.
 */
export type RestArea = { name: string; route: string; km: string; size: string; parking: number; prov: string; lat: number; lng: number };

export const REST_AREA_SOURCE = (snapshot as { source: string }).source;

const AREAS = (snapshot as { areas: RestArea[] }).areas;

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rest areas within `maxKm` of a point, nearest first (`dist` = km away; `km` stays the
 *  highway km-marker). Empty for dense city centres — the panel then simply doesn't render. */
export function nearestRestAreas(lat: number, lng: number, n = 3, maxKm = 60): (RestArea & { dist: number })[] {
  return AREAS
    .map((a) => ({ ...a, dist: km(lat, lng, a.lat, a.lng) }))
    .filter((a) => a.dist <= maxKm)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}
