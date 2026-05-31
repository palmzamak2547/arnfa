import { NextResponse } from "next/server";
import { fetchRadarStatus } from "@/lib/weather/rainviewer";

/**
 * GET /api/radar — radar nowcast AVAILABILITY (defensive).
 * Never promises minute-by-minute rain; just reports whether live radar exists.
 * Cached 5 min. Honest 503 → UI simply hides the radar affordance.
 */
export async function GET() {
  try {
    const status = await fetchRadarStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "radar_unavailable", detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
