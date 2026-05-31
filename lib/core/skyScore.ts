/**
 * skyScore.ts — "ตอนนี้ฟ้าดีแค่ไหน" for one place, right now.
 *
 * Powers the microclimate compare: score each nearby district's CURRENT hour and
 * surface where the sky is best to be out in this very moment. Rain dominates
 * (forecasting reads as a go/no-go), cloud + heat are secondary. Pure, 0–1.
 */

import type { HourlyForecast } from "@/lib/weather/types";

export function skyScoreNow(f: HourlyForecast): number {
  const dry = 1 - f.rainProb;          // most important: is it about to rain
  const bright = 1 - f.cloudCover;     // some cloud is fine, overcast less so
  const cool = 1 - f.heatIndex;        // dangerous heat makes "outside" worse
  const s = 0.55 * dry + 0.2 * bright + 0.25 * cool;
  return Math.max(0, Math.min(1, s));
}

export type SkyVerdict = "clearish" | "ok" | "closing" | "poor";

export function skyVerdict(score: number): SkyVerdict {
  if (score >= 0.7) return "clearish";
  if (score >= 0.5) return "ok";
  if (score >= 0.32) return "closing";
  return "poor";
}

export const SKY_VERDICT_TH: Record<SkyVerdict, string> = {
  clearish: "ฟ้าโปร่ง", ok: "พอไหว", closing: "ฟ้าเริ่มปิด", poor: "ไม่ค่อยดี",
};
export const SKY_VERDICT_EN: Record<SkyVerdict, string> = {
  clearish: "clear-ish", ok: "okay", closing: "clouding over", poor: "poor",
};

/**
 * Is `other` meaningfully better than `here` right now? We only nudge a move when
 * the gap is real (≥ 0.12) AND the destination is at least "okay" — so we never
 * send someone across town for a marginal, noisy difference.
 */
export function worthMoving(hereScore: number, otherScore: number): boolean {
  return otherScore - hereScore >= 0.12 && otherScore >= 0.5;
}
