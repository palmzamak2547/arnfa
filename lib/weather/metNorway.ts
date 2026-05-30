/**
 * MET Norway Locationforecast — L2. No key, UA required, CC-BY commercial-OK.
 * Spec: projects/arnfa/03-data-sources.md § MET Norway
 */

import type { HourlyForecast } from "./types";

const ENDPOINT = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const UA = "Arnfa/0.1 (https://arnfa.vercel.app)";

export async function fetchMetNorway(
  lat: number,
  lng: number,
  hoursAhead = 24,
  signal?: AbortSignal,
): Promise<HourlyForecast[]> {
  const res = await fetch(`${ENDPOINT}?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`, {
    signal,
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MET Norway ${res.status} ${res.statusText}`);
  const data = (await res.json()) as MetNorwayResponse;
  const series = data?.properties?.timeseries ?? [];

  const out: HourlyForecast[] = [];
  for (const point of series.slice(0, hoursAhead)) {
    const d = point.data.instant.details ?? {};
    const next1 = point.data.next_1_hours?.details ?? null;
    const next6 = point.data.next_6_hours?.details ?? null;
    const tempC = d.air_temperature ?? 0;
    out.push({
      hourISO: point.time,
      tempC,
      apparentTempC: tempC,
      rainProb: estRain(next1, next6),
      rainIntensity: Math.min(1, (next1?.precipitation_amount ?? 0) / 10),
      heatIndex: tempC <= 28 ? 0 : tempC >= 41 ? 1 : (tempC - 28) / 13,
      cloudCover: (d.cloud_area_fraction ?? 0) / 100,
      uvIndex: d.ultraviolet_index_clear_sky ?? 0,
      windSpeedKmh: (d.wind_speed ?? 0) * 3.6,
      windDirectionDeg: d.wind_from_direction ?? 0,
      humidity: (d.relative_humidity ?? 0) / 100,
      weatherCode: 0,
      provider: "met-norway",
      fetchedAt: new Date().toISOString(),
    });
  }
  return out;
}

function estRain(
  next1: { precipitation_amount?: number } | null,
  next6: { precipitation_amount?: number } | null,
): number {
  const mm1 = next1?.precipitation_amount ?? 0;
  if (mm1 >= 1) return 0.9;
  if (mm1 >= 0.3) return 0.6;
  if (mm1 > 0) return 0.35;
  const mm6 = next6?.precipitation_amount ?? 0;
  if (mm6 >= 1) return 0.4;
  if (mm6 > 0) return 0.2;
  return 0.05;
}

type MetNorwayResponse = {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: { details: {
          air_temperature?: number; relative_humidity?: number; cloud_area_fraction?: number;
          wind_speed?: number; wind_from_direction?: number; ultraviolet_index_clear_sky?: number;
        } };
        next_1_hours?: { details: { precipitation_amount?: number } };
        next_6_hours?: { details: { precipitation_amount?: number } };
      };
    }>;
  };
};
