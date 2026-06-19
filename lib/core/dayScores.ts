/**
 * dayScores — the "ไปวันไหนดี" (when to go) axis. Scores each day in the loaded forecast
 * by its daytime sky (08–18), so the plan can flag the BEST and WORST day this week for the
 * chosen area — computed from the forecast already in hand, no extra fetch. Pure (now passed in).
 */
import { scoreDay } from "@/lib/where/rank";
import { skyVerdict, type SkyVerdict } from "@/lib/core/skyScore";
import type { HourlyForecast } from "@/lib/weather/types";

export type DayScore = { offset: number; score: number; verdict: SkyVerdict; rainProb: number };

function offsetOf(hourISO: string, now: Date): number {
  const d = new Date(hourISO);
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86400000);
}

/** Per-day sky score (daytime window) by day offset 0..6, nearest first. */
export function scoreDays(forecast: HourlyForecast[], now: Date): DayScore[] {
  const byOffset = new Map<number, HourlyForecast[]>();
  for (const f of forecast) {
    const hr = +f.hourISO.slice(11, 13);
    if (hr < 8 || hr > 18) continue;
    const o = offsetOf(f.hourISO, now);
    if (o < 0 || o > 6) continue;
    (byOffset.get(o) ?? byOffset.set(o, []).get(o)!).push(f);
  }
  const out: DayScore[] = [];
  for (const [offset, hrs] of byOffset) {
    if (!hrs.length) continue;
    let rpS = 0, rpM = 0, clS = 0, apM = -99;
    for (const f of hrs) {
      rpS += f.rainProb; if (f.rainProb > rpM) rpM = f.rainProb;
      clS += f.cloudCover;
      const ap = f.apparentTempC ?? f.tempC; if (ap > apM) apM = ap;
    }
    const n = hrs.length;
    const score = scoreDay({ rainProbMean: rpS / n, rainProbMax: rpM, cloudMean: clS / n, apparentMaxC: apM });
    out.push({ offset, score: Math.round(score * 100) / 100, verdict: skyVerdict(score), rainProb: Math.round((rpS / n) * 100) });
  }
  return out.sort((a, b) => a.offset - b.offset);
}

/** Best + worst day, only when there's a real spread worth surfacing. */
export function pickBestWorst(scores: DayScore[]): { best: DayScore | null; worst: DayScore | null } {
  if (scores.length < 2) return { best: null, worst: null };
  let best = scores[0], worst = scores[0];
  for (const s of scores) { if (s.score > best.score) best = s; if (s.score < worst.score) worst = s; }
  // only meaningful if the days actually differ
  return best.score - worst.score >= 0.08 && best.offset !== worst.offset ? { best, worst } : { best: null, worst: null };
}
