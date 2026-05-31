import { NextRequest, NextResponse } from "next/server";
import { DISTRICTS } from "@/lib/poi/districts";

/**
 * GET /api/areas[?q=&tier=]  — the catalogue of plannable areas (neighbourhoods,
 * Bangkok districts, provinces, tourist spots) with real coverage counts. Public,
 * CORS-open so the Arnfa MCP / any agent can discover valid area keys.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const tier = searchParams.get("tier");
  let areas = DISTRICTS;
  if (tier) areas = areas.filter((d) => d.tier === tier);
  if (q) areas = areas.filter((d) => d.th.toLowerCase().includes(q) || d.en.toLowerCase().includes(q) || d.key.includes(q));
  return NextResponse.json(
    {
      total: areas.length,
      poiTotal: DISTRICTS.reduce((a, d) => a + d.count, 0),
      areas: areas.map((d) => ({ key: d.key, th: d.th, en: d.en, tier: d.tier, zone: d.zone, count: d.count, lat: d.lat, lng: d.lng })),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
