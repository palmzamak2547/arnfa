/**
 * Forecast provider chain — Open-Meteo → MET Norway. Logs providerUsed.
 * Iron Rule 0: never fabricate. All fail → throw (UI shows honest error).
 */

import { fetchOpenMeteo } from "./openMeteo";
import { fetchMetNorway } from "./metNorway";
import type { HourlyForecast, WeatherProvider } from "./types";

type ProviderFn = (lat: number, lng: number, hoursAhead: number, signal?: AbortSignal) => Promise<HourlyForecast[]>;
type ProviderConfig = { name: WeatherProvider; fetch: ProviderFn; timeoutMs: number };

const CHAIN: ProviderConfig[] = [
  { name: "open-meteo", fetch: fetchOpenMeteo, timeoutMs: 3500 },
  { name: "met-norway", fetch: fetchMetNorway, timeoutMs: 4500 },
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export type ForecastResult = {
  hours: HourlyForecast[];
  providerUsed: WeatherProvider;
  attempts: Array<{ name: WeatherProvider; ok: boolean; errorMessage?: string }>;
};

export async function getForecast(lat: number, lng: number, hoursAhead = 24): Promise<ForecastResult> {
  const attempts: ForecastResult["attempts"] = [];
  for (const provider of CHAIN) {
    const controller = new AbortController();
    try {
      const hours = await withTimeout(provider.fetch(lat, lng, hoursAhead, controller.signal), provider.timeoutMs);
      attempts.push({ name: provider.name, ok: true });
      return { hours, providerUsed: provider.name, attempts };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[arnfa.forecast] ${provider.name} failed: ${msg}`);
      attempts.push({ name: provider.name, ok: false, errorMessage: msg });
      controller.abort();
    }
  }
  throw new Error(`All forecast providers exhausted. ${attempts.map((a) => `${a.name}=${a.ok ? "ok" : a.errorMessage}`).join("; ")}`);
}
