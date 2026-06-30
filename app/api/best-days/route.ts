import { NextRequest, NextResponse } from "next/server";
import { districtMeta } from "@/lib/poi/districts";
import { scoreDay } from "@/lib/where/rank";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { skyVerdict, type SkyVerdict } from "@/lib/core/skyScore";

/**
 * GET /api/best-days?keys=a,b,c — for a few saved areas, the BEST upcoming sky day
 * in the next 7 days (the honest "เตือนฟ้าเปิด" watchlist: no push infra, just tells
 * you which saved spot has the clearest day coming). One bulk Open-Meteo call.
 */

type Best = { dayOffset: number; date: string; score: number; verdict: SkyVerdict; rainProb: number };

// whole-day difference between two YYYY-MM-DD strings (tz-independent) — so dayOffset is
// the true offset from today, not the loop index (robust if the window ever shifts).
const diffDays = (a: string, b: string) => {
  const [ay, am, ad] = a.split("-").map(Number); const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
};

function bestDay(resp: { hourly?: Record<string, number[] | string[]> } | undefined): Best | null {
  const h = resp?.hourly;
  if (!h?.time) return null;
  const time = h.time as string[];
  const pp = (h.precipitation_probability as number[]) ?? [];
  const cc = (h.cloud_cover as number[]) ?? [];
  const t2 = (h.temperature_2m as number[]) ?? [];
  const at = (h.apparent_temperature as number[]) ?? [];
  const dates = [...new Set(time.map((t) => t.slice(0, 10)))];
  let best: Best | null = null;
  dates.forEach((date) => {
    const idx: number[] = [];
    for (let i = 0; i < time.length; i++) { if (time[i].slice(0, 10) === date) { const hr = +time[i].slice(11, 13); if (hr >= 8 && hr <= 18) idx.push(i); } }
    if (!idx.length) return;
    let rpS = 0, rpM = 0, clS = 0, apM = -99;
    for (const i of idx) {
      const rp = (pp[i] ?? 0) / 100; rpS += rp; if (rp > rpM) rpM = rp;
      clS += (cc[i] ?? 0) / 100;
      const ap = at[i] ?? t2[i] ?? 30; if (ap > apM) apM = ap;
    }
    const score = scoreDay({ rainProbMean: rpS / idx.length, rainProbMax: rpM, cloudMean: clS / idx.length, apparentMaxC: apM });
    if (!best || score > best.score) best = { dayOffset: diffDays(dates[0], date), date, score: Math.round(score * 100) / 100, verdict: skyVerdict(score), rainProb: Math.round((rpS / idx.length) * 100) };
  });
  return best;
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`bestdays:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { searchParams } = new URL(req.url);
  const keys = (searchParams.get("keys") ?? "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 12);
  const metas = keys.map((k) => districtMeta(k)).filter((m): m is NonNullable<typeof m> => !!m);
  if (!metas.length) return NextResponse.json({ areas: [] });

  const lats = metas.map((m) => m.lat).join(",");
  const lngs = metas.map((m) => m.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&hourly=precipitation_probability,cloud_cover,temperature_2m,apparent_temperature&forecast_days=7&timezone=Asia%2FBangkok`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return NextResponse.json({ error: `forecast_${r.status}` }, { status: 502 });
    const data = await r.json();
    const arr = Array.isArray(data) ? data : [data];
    const areas = metas
      .map((m, i) => { const b = bestDay(arr[i]); return b ? { key: m.key, th: m.th, en: m.en, ...b } : null; })
      .filter(Boolean);
    return NextResponse.json({ areas }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "best_days_unavailable" }, { status: 503 });
  }
}
