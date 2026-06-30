/**
 * River-basin trend from Open-Meteo Flood API (GloFAS, CC-BY 4.0, no key).
 *
 * ⛔ HONESTY (critical): this is GloFAS *river-discharge* for the large river channel nearest
 * the point (Chao Phraya basin), NOT street / urban / flash flooding. A low value does NOT mean
 * "streets are dry". So we surface it ONLY as a soft basin-trend context ("ระดับน้ำในแม่น้ำกำลังขึ้น"),
 * explicitly framed as river-basin, never as a street-flood warning — rain radar/precip is the
 * real urban-flood proxy and stays the driver of any rain-dodge logic.
 */

const ENDPOINT = "https://flood-api.open-meteo.com/v1/flood";

export type FloodTrend = {
  todayDischarge: number; // m³/s
  peakDischarge: number;
  trend: "rising" | "falling" | "steady";
  /** relative rise over the week, 0..1+ (peak/today − 1), for a soft "กำลังขึ้น" signal */
  riseRatio: number;
  days: { date: string; discharge: number }[];
};

export async function fetchFloodTrend(lat: number, lng: number, signal?: AbortSignal): Promise<FloodTrend | null> {
  const u = `${ENDPOINT}?latitude=${lat}&longitude=${lng}&daily=river_discharge&forecast_days=7`;
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`flood ${res.status}`);
  const d = (await res.json()) as { daily?: { time?: string[]; river_discharge?: (number | null)[] } };
  const t = d.daily?.time ?? [], q = d.daily?.river_discharge ?? [];
  const days: { date: string; discharge: number }[] = [];
  for (let i = 0; i < t.length; i++) {
    const v = q[i];
    if (v == null || Number.isNaN(Number(v))) continue;
    days.push({ date: t[i], discharge: Math.round(Number(v) * 100) / 100 });
  }
  if (!days.length) return null;
  const today = days[0].discharge;
  const peak = Math.max(...days.map((x) => x.discharge));
  const last = days[days.length - 1].discharge;
  const riseRatio = today > 0 ? peak / today - 1 : 0;
  // need a meaningful relative change AND a non-trivial absolute level to call a trend
  const trend: FloodTrend["trend"] =
    last > today * 1.25 ? "rising" : last < today * 0.8 ? "falling" : "steady";
  return { todayDischarge: today, peakDischarge: peak, trend, riseRatio, days };
}
