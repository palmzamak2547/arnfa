/**
 * rainInject — synthesize "what if it rains at HH:00" for the Phase 0 wow-moment demo.
 * Phase 2 replaces this with real RainViewer nowcast + background re-plan.
 */

import type { HourlyForecast } from "@/lib/weather/types";

export function injectRainAt(forecast: HourlyForecast[], absSlotIndex: number, spanHours = 2): HourlyForecast[] {
  return forecast.map((f, i) => {
    if (i >= absSlotIndex && i < absSlotIndex + spanHours) {
      return { ...f, rainProb: 0.85, rainIntensity: 0.8, cloudCover: 0.95, weatherCode: 65 };
    }
    return f;
  });
}
