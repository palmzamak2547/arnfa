import type { HourlyForecast } from "@/lib/weather/types";

/**
 * skyTone — the single source of truth for "the page changes with the REAL weather".
 *
 * Arnfa's core idea (per the brand book) is that the front page is alive: its atmosphere shifts
 * with the actual current Bangkok sky, not a static theme. This maps the live forecast to a small
 * tasteful palette used in several places at once — the faint full-page wash behind the content,
 * the sky-now box gradient, and the hero. Kept FAINT so the "เปิดฟ้า / Open Sky" warm-paper brand
 * stays; only the mood breathes. One function, so every surface agrees on today's sky.
 */

export type Sky = "clear" | "clouds" | "rain";

/** 3-state sky from one hour's forecast (shared by the backdrop + the sky-box). */
export function skyFrom(f: HourlyForecast): Sky {
  if (f.rainProb >= 0.4 || f.rainProb * f.rainIntensity > 0.18) return "rain";
  if (f.cloudCover >= 0.55 || f.rainProb >= 0.2) return "clouds";
  return "clear";
}

export type SkyTone = {
  /** faint full-page atmospheric wash (very low alpha — paper brand stays) */
  wash: string;
  /** the sky-now box gradient */
  box: string;
};

const TONES: Record<Sky, SkyTone> = {
  clear: {
    wash: "radial-gradient(130% 92% at 84% -14%, rgba(242,166,90,0.15), rgba(242,166,90,0) 56%)",
    box: "linear-gradient(180deg,#CFE2F2,#F4E8D0)",
  },
  clouds: {
    wash: "linear-gradient(180deg, rgba(150,162,178,0.14) 0%, rgba(150,162,178,0) 46%)",
    box: "linear-gradient(180deg,#C4CCD6,#EAE4D8)",
  },
  rain: {
    wash: "linear-gradient(180deg, rgba(91,127,184,0.18) 0%, rgba(91,127,184,0) 52%)",
    box: "linear-gradient(180deg,#A2B2C8,#D9D4CD)",
  },
};

export function skyTone(sky: Sky): SkyTone {
  return TONES[sky];
}
