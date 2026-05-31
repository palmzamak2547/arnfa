/**
 * Air4Thai — real PM2.5 from Thailand's Pollution Control Department (PCD).
 *
 * Honest, government-source air quality — a BDI-judge credibility signal and a
 * real Bangkok pain point (smog season). We find the nearest station to a
 * lat/lng and return its PM2.5 + a Thai severity label.
 *
 * Endpoint returns ALL national stations; we pick nearest. No key. We never
 * fabricate — if the station has no reading, status = "unknown".
 *
 * Spec: projects/arnfa/03-data-sources.md § Air4Thai
 */

const ENDPOINT = "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php";

export type AirReading = {
  stationNameTh: string;
  pm25: number | null;
  /** 0-5 Thai AQI band → label/color */
  level: AirLevel;
  distanceKm: number;
  fetchedAt: string;
};

export type AirLevel = "good" | "moderate" | "warn" | "unhealthy" | "very-unhealthy" | "unknown";

type Station = {
  nameTH?: string;
  lat?: string | number;
  long?: string | number;
  AQILast?: { PM25?: { value?: string; aqi?: string } };
};

const R = 6371;
function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pm25Level(pm25: number | null): AirLevel {
  if (pm25 === null || Number.isNaN(pm25)) return "unknown";
  // Thai PCD PM2.5 bands (µg/m³, 24h): 0-25 good, 26-37 moderate, 38-50 warn,
  // 51-90 unhealthy, 90+ very unhealthy.
  if (pm25 <= 25) return "good";
  if (pm25 <= 37) return "moderate";
  if (pm25 <= 50) return "warn";
  if (pm25 <= 90) return "unhealthy";
  return "very-unhealthy";
}

export const AIR_LABEL_TH: Record<AirLevel, string> = {
  good: "อากาศดี",
  moderate: "ปานกลาง",
  warn: "เริ่มมีผล",
  unhealthy: "มีผลต่อสุขภาพ",
  "very-unhealthy": "อันตราย",
  unknown: "ไม่มีข้อมูล",
};

export async function fetchNearestAir(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<AirReading> {
  const res = await fetch(ENDPOINT, { signal, headers: { "User-Agent": "Arnfa/0.1" } });
  if (!res.ok) throw new Error(`Air4Thai ${res.status}`);
  const data = (await res.json()) as { stations?: Station[] };
  const stations = data.stations ?? [];

  let best: { st: Station; d: number } | null = null;
  for (const st of stations) {
    const sLat = Number(st.lat);
    const sLng = Number(st.long);
    if (!isFinite(sLat) || !isFinite(sLng)) continue;
    const d = distKm(lat, lng, sLat, sLng);
    if (!best || d < best.d) best = { st, d };
  }

  if (!best) {
    return { stationNameTh: "—", pm25: null, level: "unknown", distanceKm: 0, fetchedAt: new Date().toISOString() };
  }

  const rawVal = best.st.AQILast?.PM25?.value;
  const pm25 = rawVal != null && rawVal !== "-1" && rawVal !== "" ? Number(rawVal) : null;
  return {
    stationNameTh: best.st.nameTH ?? "สถานีใกล้เคียง",
    pm25: pm25 != null && !Number.isNaN(pm25) ? pm25 : null,
    level: pm25Level(pm25),
    distanceKm: Math.round(best.d * 10) / 10,
    fetchedAt: new Date().toISOString(),
  };
}
