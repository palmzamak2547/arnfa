import { NextRequest, NextResponse } from "next/server";
import { fetchFloodTrend } from "@/lib/flood/flood";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * GET /api/flood?lat=&lng= — Open-Meteo GloFAS river-basin discharge trend.
 * HONEST: river-basin only (Chao Phraya), NOT street flooding. Surfaced as a soft
 * "ระดับน้ำในแม่น้ำกำลังขึ้น" context, never a street-flood warning.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit("flood:" + clientIp(req), 40, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "13.7563");
  const lng = parseFloat(searchParams.get("lng") ?? "100.5018");
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });
  try {
    const trend = await fetchFloodTrend(lat, lng);
    return NextResponse.json(
      { trend },
      { headers: { "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=21600" } },
    );
  } catch (e) {
    return NextResponse.json({ error: "flood_unavailable", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
