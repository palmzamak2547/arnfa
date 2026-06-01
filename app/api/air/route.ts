import { NextRequest, NextResponse } from "next/server";
import { fetchNearestAir } from "@/lib/air/air4thai";

/**
 * GET /api/air?lat=&lng= — nearest Air4Thai PM2.5 station.
 * Server-side (Air4Thai is http-only; calling from the browser would be mixed-content).
 * Cached 10 min. Honest: 200 with level:"unknown" if no reading, 503 on total failure.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "13.7563");
  const lng = parseFloat(searchParams.get("lng") ?? "100.5018");
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });
  }
  try {
    const air = await fetchNearestAir(lat, lng);
    return NextResponse.json(air, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "air_unavailable", detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
