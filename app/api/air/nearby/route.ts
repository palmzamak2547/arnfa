import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyAir } from "@/lib/air/air4thai";

/**
 * GET /api/air/nearby?lat=&lng=&n=10 — the nearest Air4Thai PM2.5 stations (each with
 * coords + reading + band) for the map's air layer. Server-side (Air4Thai is http-only).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "13.7563");
  const lng = parseFloat(searchParams.get("lng") ?? "100.5018");
  const n = Math.min(20, Math.max(1, parseInt(searchParams.get("n") ?? "10", 10)));
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });
  try {
    return NextResponse.json(
      { stations: await fetchNearbyAir(lat, lng, n) },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch (e) {
    return NextResponse.json({ error: "air_unavailable", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
