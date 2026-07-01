import { NextRequest, NextResponse } from "next/server";
import { tatNearbyPlaces, tatEvents, tatRoutes, tatConfigured } from "@/lib/tat/client";

export const runtime = "nodejs";

/**
 * GET /api/tat — proxy for TAT Data API. Hides the API key from the client.
 *
 * Query params:
 *   ?lat=13.74&lng=100.53           → nearby places
 *   ?lat=13.74&lng=100.53&events=1  → nearby events
 *   ?routes=1                       → recommended routes
 */
export async function GET(req: NextRequest) {
  if (!tatConfigured()) {
    return NextResponse.json({ error: "TAT API not configured" }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  const lat = sp.get("lat") ? Number(sp.get("lat")) : undefined;
  const lng = sp.get("lng") ? Number(sp.get("lng")) : undefined;
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 6;

  // Events
  if (sp.has("events")) {
    const events = await tatEvents({ lat, lng, limit });
    return NextResponse.json({ events });
  }

  // Routes
  if (sp.has("routes")) {
    const routes = await tatRoutes({ limit });
    return NextResponse.json({ routes });
  }

  // Default: nearby places
  if (lat != null && lng != null) {
    const places = await tatNearbyPlaces(lat, lng, { limit });
    return NextResponse.json({ places });
  }

  return NextResponse.json({ error: "Provide lat & lng, or ?events=1, or ?routes=1" }, { status: 400 });
}
