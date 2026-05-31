/**
 * NASA FIRMS (Fire Information for Resource Management System) — real active-fire
 * / thermal-anomaly detections from VIIRS, the data behind Thailand's burning-
 * season haze (ก.พ.–เม.ย. in the north). FIRMS needs a FREE map key, so the
 * /api/fires route stays dormant until FIRMS_MAP_KEY is set, then lights up the
 * "fires from space" advisory. These pure helpers parse + summarise the CSV so the
 * route stays thin and the logic is unit-tested.
 *
 * Key (free, instant): https://firms.modaps.eosdis.nasa.gov/api/map_key/
 */

export type FirePoint = {
  lat: number;
  lng: number;
  acqDate: string;
  frp: number | null; // fire radiative power (MW) — bigger = hotter
  confidence: string;
};

export type FireSummary = {
  count: number;
  nearestKm: number | null;
  maxFrp: number | null;
};

/** Parse a FIRMS "area CSV" response, robust to column order across sources. */
export function parseFirmsCsv(csv: string): FirePoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const iLat = header.indexOf("latitude");
  const iLng = header.indexOf("longitude");
  const iDate = header.indexOf("acq_date");
  const iFrp = header.indexOf("frp");
  const iConf = header.indexOf("confidence");
  if (iLat < 0 || iLng < 0) return [];

  const out: FirePoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const lat = parseFloat(c[iLat]);
    const lng = parseFloat(c[iLng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const frp = iFrp >= 0 ? parseFloat(c[iFrp]) : NaN;
    out.push({
      lat,
      lng,
      acqDate: iDate >= 0 ? (c[iDate] ?? "").trim() : "",
      frp: Number.isFinite(frp) ? frp : null,
      confidence: iConf >= 0 ? (c[iConf] ?? "").trim() : "",
    });
  }
  return out;
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Count + nearest + hottest of the fires within radiusKm of an origin. */
export function summarizeFires(
  points: FirePoint[],
  originLat: number,
  originLng: number,
  radiusKm: number,
): FireSummary {
  let count = 0;
  let nearest = Infinity;
  let maxFrp = 0;
  for (const p of points) {
    const km = haversineKm(originLat, originLng, p.lat, p.lng);
    if (km > radiusKm) continue;
    count++;
    if (km < nearest) nearest = km;
    if (p.frp && p.frp > maxFrp) maxFrp = p.frp;
  }
  return {
    count,
    nearestKm: count ? Math.round(nearest) : null,
    maxFrp: maxFrp || null,
  };
}
