import { NextRequest, NextResponse } from "next/server";
import { nearestRestAreas, REST_AREA_SOURCE } from "@/lib/data/restAreas";

/**
 * GET /api/rest-areas?lat=&lng=&n=3 — nearest official highway rest areas (จุดพักรถ) to a
 * point, from the DOH GeoServer snapshot. Empty for city centres (honest: no rest areas in town).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const n = Math.min(6, Math.max(1, parseInt(searchParams.get("n") ?? "3", 10)));
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad_coords" }, { status: 400 });
  return NextResponse.json(
    { source: REST_AREA_SOURCE, areas: nearestRestAreas(lat, lng, n) },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
