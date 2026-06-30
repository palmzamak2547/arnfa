import { NextRequest, NextResponse } from "next/server";
import { fetchAirForecast, dayPeak, airPeakIsBad } from "@/lib/air/forecast";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * GET /api/air-forecast?lat=&lng=&day=0 — Open-Meteo CAMS PM2.5/US-AQI FORECAST.
 * Returns the worst daytime hour of the selected day (`peak`) + whether it's unhealthy.
 * Same-origin proxy so the client never needs the air-quality host in CSP. This is the
 * forward-looking layer; Air4Thai stays the measured "now".
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit("airfc:" + clientIp(req), 40, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "13.7563");
  const lng = parseFloat(searchParams.get("lng") ?? "100.5018");
  const day = Math.min(6, Math.max(0, parseInt(searchParams.get("day") ?? "0", 10)));
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });
  try {
    const hours = await fetchAirForecast(lat, lng, Math.min(day + 1, 7));
    const peak = dayPeak(hours, day);
    return NextResponse.json(
      { peak, bad: airPeakIsBad(peak) },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch (e) {
    return NextResponse.json({ error: "airfc_unavailable", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
