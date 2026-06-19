import { NextRequest, NextResponse } from "next/server";
import { fetchCoolingCenters, nearestCooling, COOLING_SOURCE } from "@/lib/data/bmaCooling";

/**
 * GET /api/cooling?lat=&lng=&n=3 — the nearest OFFICIAL BMA cooling centers (ห้องหลบร้อน)
 * to a point. Server holds the full 592-row dataset; the client gets only the nearest few.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const n = Math.min(8, Math.max(1, parseInt(searchParams.get("n") ?? "3", 10)));
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad_coords" }, { status: 400 });

  const centers = await fetchCoolingCenters();
  if (!centers.length) return NextResponse.json({ error: "cooling_unavailable" }, { status: 503 });
  return NextResponse.json(
    { source: COOLING_SOURCE, centers: nearestCooling(centers, lat, lng, n) },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
