/**
 * Air-quality FORECAST from Open-Meteo (CAMS model, CC-BY 4.0, no key).
 *
 * This is the FUTURE layer. It COMPLEMENTS Air4Thai (real-time ground stations = the NOW /
 * measured truth) — we never overwrite a measured Air4Thai value with this model; we use it
 * only to warn AHEAD ("ฝุ่นบ่ายจะแย่ → เลี่ยงกลางแจ้งช่วงนั้น"). Honest: it's a ~11km model cell,
 * not a street sensor, so it's framed as a forecast, never as "now".
 */

const ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality";

export type AirForecastHour = { iso: string; pm25: number; usAqi: number };

/** Hourly PM2.5 + US-AQI forecast (Asia/Bangkok local timestamps), up to `days` ahead. */
export async function fetchAirForecast(lat: number, lng: number, days = 2, signal?: AbortSignal): Promise<AirForecastHour[]> {
  const u = `${ENDPOINT}?latitude=${lat}&longitude=${lng}&hourly=pm2_5,us_aqi&forecast_days=${Math.min(Math.max(days, 1), 7)}&timezone=Asia%2FBangkok`;
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`air-forecast ${res.status}`);
  const d = (await res.json()) as { hourly?: { time?: string[]; pm2_5?: (number | null)[]; us_aqi?: (number | null)[] } };
  const t = d.hourly?.time ?? [], p = d.hourly?.pm2_5 ?? [], a = d.hourly?.us_aqi ?? [];
  const hours: AirForecastHour[] = [];
  for (let i = 0; i < t.length; i++) {
    const pm = p[i];
    if (pm == null || Number.isNaN(Number(pm))) continue;
    hours.push({ iso: t[i], pm25: Math.round(Number(pm) * 10) / 10, usAqi: Math.round(Number(a[i] ?? 0)) });
  }
  return hours;
}

/** Worst (highest PM2.5) daytime hour of the N-th forecast day. Groups by the API's own
 *  Bangkok-local date string — no timezone math, so it's correct on a UTC server. */
export function dayPeak(hours: AirForecastHour[], dayOffset: number): AirForecastHour | null {
  const dates = [...new Set(hours.map((h) => h.iso.slice(0, 10)))].sort();
  const target = dates[Math.min(Math.max(dayOffset, 0), dates.length - 1)];
  if (!target) return null;
  let peak: AirForecastHour | null = null;
  for (const h of hours) {
    if (h.iso.slice(0, 10) !== target) continue;
    const hr = Number(h.iso.slice(11, 13));
    if (hr < 8 || hr > 19) continue; // daytime, when people are out
    if (!peak || h.pm25 > peak.pm25) peak = h;
  }
  return peak;
}

/** US-AQI > 100 (unhealthy-for-sensitive) OR Thai PM2.5 orange (> 37.5 µg/m³) = worth a forward warning. */
export function airPeakIsBad(peak: AirForecastHour | null): boolean {
  return !!peak && (peak.usAqi > 100 || peak.pm25 > 37.5);
}
