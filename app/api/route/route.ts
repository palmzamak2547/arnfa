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
  const out = [];
  for (const leg of legs as [number, number][][]) {
    const [from, to] = leg ?? [];
    out.push(Array.isArray(from) && Array.isArray(to) ? await orsRoute(from, to) : null);
  }
  return NextResponse.json(
    { available: true, legs: out },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
