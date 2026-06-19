import { NextRequest, NextResponse } from "next/server";
import { nearestStations, TRANSIT_SOURCE } from "@/lib/data/transitStations";

/**
 * GET /api/transit?lat=&lng=&n=3 — nearest RAIL stations (BTS/MRT/ARL/SRT) to a point,
 * from the Namtang open transit feed. "How do I get to this area by train."
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const n = Math.min(8, Math.max(1, parseInt(searchParams.get("n") ?? "3", 10)));
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad_coords" }, { status: 400 });
  return NextResponse.json(
    { source: TRANSIT_SOURCE, stations: nearestStations(lat, lng, n) },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
