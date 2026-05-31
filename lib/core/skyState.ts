/**
 * skyState — the forecast→sky-state mapping. Lives in a NON-client module so both
 * the server (e.g. /api/plan) and client components can use it. (It used to live in
 * SkyChip.tsx, which is "use client" — calling it server-side threw.)
 */

export type SkyState = "clear" | "partly" | "cloudy" | "rain" | "storm" | "night";

export function skyStateFrom(o: { rainProb: number; rainIntensity: number; cloudCover: number; isNight: boolean }): SkyState {
  if (o.isNight) return "night";
  if (o.rainProb > 0.5 && o.rainIntensity > 0.6) return "storm";
  if (o.rainProb > 0.35) return "rain";
  if (o.cloudCover > 0.7) return "cloudy";
  if (o.cloudCover > 0.35) return "partly";
  return "clear";
}
