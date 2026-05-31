import { NextRequest, NextResponse } from "next/server";
import { fetchNowcast } from "@/lib/weather/nowcast";

/**
 * GET /api/nowcast?lat=&lng=  — next ~2h of 15-minute precipitation at a point.
 * Powers the Live Companion's imminent-rain alert. Short cache (the whole point
 * is freshness). Iron Rule 0: provider fails → 503, never a fabricated nowcast.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });
  }
  try {
    const nowcast = await fetchNowcast(lat, lng);
    return NextResponse.json(nowcast, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (e) {
    return NextResponse.json({ error: "nowcast_unavailable", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
