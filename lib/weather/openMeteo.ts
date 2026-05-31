/**
 * Open-Meteo provider — L1. No key. Non-commercial free tier.
 * Spec: projects/arnfa/03-data-sources.md § Open-Meteo
 */

import type { HourlyForecast } from "./types";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export async function fetchOpenMeteo(
  lat: number,
  lng: number,
  hoursAhead = 24,
  signal?: AbortSignal,
): Promise<HourlyForecast[]> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: [
      "temperature_2m", "apparent_temperature", "precipitation_probability",
      "precipitation", "weather_code", "cloud_cover", "uv_index",
      "wind_speed_10m", "wind_direction_10m", "relative_humidity_2m",
    ].join(","),
    timezone: "Asia/Bangkok",
    forecast_days: "7", // enough to plan "this weekend / next week"
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal, headers: { "User-Agent": "Arnfa/0.1" } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} ${res.statusText}`);
  const data = (await res.json()) as OpenMeteoResponse;

  const out: HourlyForecast[] = [];
  const len = Math.min(data.hourly.time.length, hoursAhead);
  for (let i = 0; i < len; i++) {
    const tempC = data.hourly.temperature_2m[i] ?? 0;
    out.push({
      hourISO: data.hourly.time[i],
      tempC,
      apparentTempC: data.hourly.apparent_temperature[i] ?? tempC,
      rainProb: (data.hourly.precipitation_probability[i] ?? 0) / 100,
      rainIntensity: normRain(data.hourly.precipitation[i] ?? 0),
      heatIndex: normHeat(data.hourly.apparent_temperature[i] ?? tempC),
      cloudCover: (data.hourly.cloud_cover[i] ?? 0) / 100,
      uvIndex: data.hourly.uv_index[i] ?? 0,
      windSpeedKmh: data.hourly.wind_speed_10m[i] ?? 0,
      windDirectionDeg: data.hourly.wind_direction_10m[i] ?? 0,
      humidity: (data.hourly.relative_humidity_2m[i] ?? 0) / 100,
      weatherCode: data.hourly.weather_code[i] ?? 0,
      provider: "open-meteo",
      fetchedAt: new Date().toISOString(),
    });
  }
  return out;
}

const normRain = (mm: number) => Math.min(1, mm / 10);
const normHeat = (c: number) => (c <= 28 ? 0 : c >= 41 ? 1 : (c - 28) / 13);

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    cloud_cover: number[];
    uv_index: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    relative_humidity_2m: number[];
  };
};
