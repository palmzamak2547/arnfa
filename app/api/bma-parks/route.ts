import { NextResponse } from "next/server";
import { fetchBmaParks, BMA_PARK_SOURCE } from "@/lib/data/bmaParks";

/**
 * GET /api/bma-parks — OFFICIAL Bangkok public parks (data.bangkok.go.th). The BDI
 * "Envi Link" data-as-trust layer. Cached a day; honest 503 if the city portal is down.
 */
export async function GET() {
  const parks = await fetchBmaParks();
  if (!parks.length) return NextResponse.json({ error: "bma_parks_unavailable" }, { status: 503 });
  return NextResponse.json(
    { source: BMA_PARK_SOURCE, count: parks.length, parks },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
