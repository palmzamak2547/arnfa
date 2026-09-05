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

  // Iron Rule 0: an upstream failure must NOT look like "nothing nearby". On failure we send
  // the list AND `unavailable` + `reason` so the UI can say so instead of silently rendering
  // nothing; a failed read is never CDN-cached, a good one is.
  const ok = (field: string, items: unknown[]) =>
    NextResponse.json({ [field]: items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } });
  const down = (field: string, reason: string) =>
    NextResponse.json({ [field]: [], unavailable: true, reason }, { headers: { "Cache-Control": "no-store" } });

  // Events
  if (sp.has("events")) {
    const r = await tatEvents({ lat, lng, limit });
    return r.ok ? ok("events", r.items) : down("events", r.reason);
  }

  // Routes
  if (sp.has("routes")) {
    const r = await tatRoutes({ limit });
    return r.ok ? ok("routes", r.items) : down("routes", r.reason);
  }

  // Default: nearby places
  if (lat != null && lng != null) {
    const r = await tatNearbyPlaces(lat, lng, { limit });
    return r.ok ? ok("places", r.items) : down("places", r.reason);
  }

  return NextResponse.json({ error: "Provide lat & lng, or ?events=1, or ?routes=1" }, { status: 400 });
}
