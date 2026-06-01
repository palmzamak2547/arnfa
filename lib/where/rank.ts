/**
 * rank.ts — "ไปไหนดี": score a whole DAY's sky for one area so we can rank all of
 * Thailand by where the sky is clearest. Pure, 0–1. Mirrors lib/core/skyScore's
 * weighting (rain dominates, then cloud, then heat) but scores a daytime WINDOW
 * (08:00–18:00) instead of a single hour, and penalises a wet peak so an area with
 * one nasty afternoon storm doesn't rank as "clear".
 *
 * Sky only — haze/PM2.5 is per-station and not factored here (the UI says so).
 */

import { skyVerdict, type SkyVerdict } from "@/lib/core/skyScore";

export type DaySample = {
  rainProbMean: number; // 0–1 over the daytime window
  rainProbMax: number;  // 0–1, the wettest hour
  cloudMean: number;    // 0–1
  apparentMaxC: number; // °C, hottest "feels-like" of the window
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Feels-like heat as a 0–1 penalty: 32°C → 0, 44°C → 1. */
export function heatPenalty(apparentC: number): number {
  return clamp01((apparentC - 32) / (44 - 32));
}

export function scoreDay(s: DaySample): number {
  const dry = 1 - s.rainProbMean;
  const dryWorst = 1 - s.rainProbMax; // a single wet peak still drags the day down
  const bright = 1 - s.cloudMean;
  // Sky quality is all about rain + cloud. Heat is a PENALTY that only bites when
  // it's actually hot — being cool must NOT rescue a wet, overcast day.
  const skyQuality = 0.6 * dry + 0.15 * dryWorst + 0.25 * bright;
  const score = skyQuality - 0.35 * heatPenalty(s.apparentMaxC);
  return clamp01(score);
}

export type Ranked<T> = T & { score: number; verdict: SkyVerdict };

/** Score each area's day and return them sorted clearest-first. */
export function rankAreas<T extends { sample: DaySample }>(areas: T[]): Ranked<T>[] {
  return areas
    .map((a) => {
      const score = scoreDay(a.sample);
      return { ...a, score, verdict: skyVerdict(score) };
    })
    .sort((x, y) => y.score - x.score);
}
