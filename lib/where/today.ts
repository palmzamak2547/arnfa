/**
 * today.ts — server-side "rank every area in Thailand by a day's sky", shared by
 * GET /api/where AND the home page's live "Today's pick". One bulk Open-Meteo call
 * for all ~150 centroids. Returns null on failure so callers degrade HONESTLY
 * (Iron Rule 0 — never fabricate a pick when the data isn't there).
 */
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { rankAreas, type DaySample } from "@/lib/where/rank";
import type { SkyVerdict } from "@/lib/core/skyScore";

const pad = (n: number) => String(n).padStart(2, "0");

export type RankedArea = {
  key: string; th: string; en: string; zone: string; tier: string;
  lat: number; lng: number; tempC: number; rainProb: number;
  score: number; verdict: SkyVerdict;
};

function sampleDay(
  resp: { hourly?: Record<string, number[] | string[]> } | undefined,
): { sample: DaySample; tempMaxC: number } | null {
  const h = resp?.hourly;
  if (!h?.time) return null;
  const time = h.time as string[];
  const pp = (h.precipitation_probability as number[]) ?? [];
  const cc = (h.cloud_cover as number[]) ?? [];
  const t2 = (h.temperature_2m as number[]) ?? [];
  const at = (h.apparent_temperature as number[]) ?? [];
  const idx: number[] = [];
  for (let i = 0; i < time.length; i++) {
    const hour = +time[i].slice(11, 13);
    if (hour >= 8 && hour <= 18) idx.push(i);
  }
  if (!idx.length) return null;
  let rpSum = 0, rpMax = 0, clSum = 0, apMax = -99, tMax = -99;
  for (const i of idx) {
    const rp = (pp[i] ?? 0) / 100;
    rpSum += rp; if (rp > rpMax) rpMax = rp;
    clSum += (cc[i] ?? 0) / 100;
    const ap = at[i] ?? t2[i] ?? 30;
    if (ap > apMax) apMax = ap;
    const tt = t2[i] ?? ap;
    if (tt > tMax) tMax = tt;
  }
  return {
    sample: { rainProbMean: rpSum / idx.length, rainProbMax: rpMax, cloudMean: clSum / idx.length, apparentMaxC: apMax },
    tempMaxC: tMax,
  };
}

/**
 * Rank every area for the given day (0 = today … 6). Returns {date, areas} sorted
 * clearest-first, or null if the forecast call fails. The Open-Meteo response is
 * cached at the data layer (revalidate 30 min) so /api/where and the home page share it.
 */
export async function rankAreasForDay(day: number): Promise<{ date: string; areas: RankedArea[] } | null> {
  const d = Math.min(6, Math.max(0, day));
  // target date in Bangkok (server runs UTC) — shift +7h then add the day offset
  const bkk = new Date(Date.now() + 7 * 3600 * 1000 + d * 86400000);
  const date = `${bkk.getUTCFullYear()}-${pad(bkk.getUTCMonth() + 1)}-${pad(bkk.getUTCDate())}`;

  const lats = DISTRICTS.map((a) => a.lat).join(",");
  const lngs = DISTRICTS.map((a) => a.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&hourly=precipitation_probability,cloud_cover,temperature_2m,apparent_temperature` +
    `&start_date=${date}&end_date=${date}&timezone=Asia%2FBangkok`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), next: { revalidate: 1800 } });
    if (!r.ok) return null;
    const data = await r.json();
    const arr = Array.isArray(data) ? data : [data];

    const withSample: ({ key: string; th: string; en: string; zone: string; tier: string; lat: number; lng: number; tempC: number; rainProb: number; sample: DaySample })[] = [];
    DISTRICTS.forEach((a, i) => {
      const s = sampleDay(arr[i]);
      if (!s) return;
      withSample.push({
        key: a.key, th: a.th, en: a.en, zone: a.zone, tier: a.tier, lat: a.lat, lng: a.lng,
        tempC: Math.round(s.tempMaxC), rainProb: Math.round(s.sample.rainProbMean * 100), sample: s.sample,
      });
    });
    if (!withSample.length) return null;

    const areas = rankAreas(withSample).map(({ sample, ...rest }) => ({ ...rest, score: Math.round(rest.score * 100) / 100 }));
    return { date, areas };
  } catch {
    return null;
  }
}
