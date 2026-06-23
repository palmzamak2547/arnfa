import { NextRequest, NextResponse } from "next/server";
import { orsRoute, orsConfigured } from "@/lib/transport/route";

/**
 * POST /api/route { legs: [[[lng,lat],[lng,lat]], …] } — exact OpenRouteService walking
 * times for the few displayed hops. Dormant-until-key: returns { available:false } with no
 * ORS_API_KEY, so the UI keeps its road-realistic estimate. Max 8 legs (one plan's hops).
 */
export async function POST(req: NextRequest) {
  if (!orsConfigured()) return NextResponse.json({ available: false });
  let legs: unknown;
  try { legs = (await req.json())?.legs; } catch { /* bad body */ }
  if (!Array.isArray(legs) || !legs.length || legs.length > 8) {
    return NextResponse.json({ error: "bad_legs" }, { status: 400 });
  }
  // Concurrent, not sequential: each orsRoute is 8s-capped, so awaiting up to 8 in a
  // loop could stack to ~64s and 504 the whole request. Promise.all keeps it ≤ ~8s.
  const out = await Promise.all((legs as [number, number][][]).map((leg) => {
    const [from, to] = leg ?? [];
    return Array.isArray(from) && Array.isArray(to) ? orsRoute(from, to) : Promise.resolve(null);
  }));
  return NextResponse.json(
    { available: true, legs: out },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
