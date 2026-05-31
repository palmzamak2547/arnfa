/**
 * nowcast.ts — short-range "is rain about to hit THIS spot?" using Open-Meteo's
 * 15-minute precipitation. Powers the Live Companion's "ฝนมาในอีก ~N นาที" alert.
 *
 * summarizeNowcast() is pure (now is passed in) so it's unit-testable; fetchNowcast
 * does the network. Honest: if the provider returns nothing we report dry/unknown,
 * never a fabricated alert.
 */

export type NowcastSlot = { minISO: string; mm: number };
export type Nowcast = {
  slots: NowcastSlot[];
  rainInMin: number | null; // minutes until the first wet slot (>= WET_MM), null if dry ahead
  maxMm: number;
  provider: "open-meteo";
  fetchedAt: string;
};

const WET_MM = 0.2; // a 15-min slot with ≥0.2 mm counts as "rain"

export function summarizeNowcast(slots: NowcastSlot[], nowMs: number): Omit<Nowcast, "provider" | "fetchedAt"> {
  let rainInMin: number | null = null;
  let maxMm = 0;
  for (const s of slots) {
    maxMm = Math.max(maxMm, s.mm);
    const deltaMin = (new Date(s.minISO).getTime() - nowMs) / 60000;
    if (rainInMin === null && s.mm >= WET_MM && deltaMin >= -10) {
      rainInMin = Math.max(0, Math.round(deltaMin));
    }
  }
  return { slots, rainInMin, maxMm: Math.round(maxMm * 100) / 100 };
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export async function fetchNowcast(lat: number, lng: number, signal?: AbortSignal): Promise<Nowcast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    minutely_15: "precipitation",
    forecast_minutely_15: "8", // next 2 hours
    timezone: "Asia/Bangkok",
  });
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal, headers: { "User-Agent": "Arnfa/0.1" } });
  if (!res.ok) throw new Error(`Open-Meteo nowcast ${res.status}`);
  const data = (await res.json()) as { minutely_15?: { time: string[]; precipitation: number[] } };
  const time = data.minutely_15?.time ?? [];
  const precip = data.minutely_15?.precipitation ?? [];
  const slots: NowcastSlot[] = time.map((t, i) => ({ minISO: t, mm: precip[i] ?? 0 }));
  const summary = summarizeNowcast(slots, Date.now());
  return { ...summary, provider: "open-meteo", fetchedAt: new Date().toISOString() };
}
