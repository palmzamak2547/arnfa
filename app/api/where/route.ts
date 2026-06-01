import { NextRequest, NextResponse } from "next/server";
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { rankAreas, type DaySample } from "@/lib/where/rank";

/**
 * GET /api/where?day=0..6 — rank every area in Thailand by the chosen day's sky.
 * ONE bulk Open-Meteo call for all ~150 centroids (comma-separated coords → array),
 * limited to the target day via start_date/end_date so the payload stays small.
 * Sky only (rain/cloud/heat over 08:00–18:00); haze is per-station, not factored.
 */

const pad = (n: number) => String(n).padStart(2, "0");

type AreaIn = {
  key: string; th: string; en: string; zone: string; tier: string;
  lat: number; lng: number; tempC: number; rainProb: number; sample: DaySample;
};

function sampleDay(resp: { hourly?: Record<string, number[] | string[]> } | undefined): { sample: DaySample; tempMaxC: number } | null {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const day = Math.min(6, Math.max(0, parseInt(searchParams.get("day") ?? "0", 10)));

  // target date in Bangkok (server runs UTC) — shift +7h then add the day offset
  const bkk = new Date(Date.now() + 7 * 3600 * 1000 + day * 86400000);
  const date = `${bkk.getUTCFullYear()}-${pad(bkk.getUTCMonth() + 1)}-${pad(bkk.getUTCDate())}`;

  const lats = DISTRICTS.map((d) => d.lat).join(",");
  const lngs = DISTRICTS.map((d) => d.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&hourly=precipitation_probability,cloud_cover,temperature_2m,apparent_temperature` +
    `&start_date=${date}&end_date=${date}&timezone=Asia%2FBangkok`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return NextResponse.json({ error: `forecast_${r.status}` }, { status: 502 });
    const data = await r.json();
    const arr = Array.isArray(data) ? data : [data];

    const withSample: AreaIn[] = [];
    DISTRICTS.forEach((d, i) => {
      const s = sampleDay(arr[i]);
      if (!s) return;
      withSample.push({
        key: d.key, th: d.th, en: d.en, zone: d.zone, tier: d.tier, lat: d.lat, lng: d.lng,
        tempC: Math.round(s.tempMaxC), rainProb: Math.round(s.sample.rainProbMean * 100), sample: s.sample,
      });
    });

    const ranked = rankAreas(withSample).map(({ sample, ...rest }) => ({ ...rest, score: Math.round(rest.score * 100) / 100 }));
    return NextResponse.json(
      { day, date, count: ranked.length, areas: ranked },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "where_unavailable" }, { status: 503 });
  }
}
