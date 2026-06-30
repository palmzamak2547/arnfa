import { NextRequest, NextResponse } from "next/server";
import { parseFirmsCsv, summarizeFires } from "@/lib/satellite/fires";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * GET /api/fires?lat=&lng=&radiusKm=&days= — active fires near a point from NASA
 * FIRMS (VIIRS). The key lives ONLY on the server (never NEXT_PUBLIC); without it
 * the route is honestly dormant ({ available:false }) and the UI shows nothing —
 * we never invent fires. With FIRMS_MAP_KEY set it returns a real count + nearest.
 *
 * Free key (instant): https://firms.modaps.eosdis.nasa.gov/api/map_key/
 */

const SOURCE = "VIIRS_SNPP_NRT"; // free near-real-time VIIRS 375m

export async function GET(req: NextRequest) {
  const rl = rateLimit(`fires:${clientIp(req)}`, 40, 60_000); // NASA FIRMS quota guard
  if (!rl.ok) return tooMany(rl.retryAfter);
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return NextResponse.json({ available: false, reason: "no_key" });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ available: false, reason: "bad_coords" }, { status: 400 });
  }
  const radiusKm = Math.min(300, Math.max(20, parseFloat(searchParams.get("radiusKm") ?? "120")));
  const days = Math.min(3, Math.max(1, parseInt(searchParams.get("days") ?? "1", 10)));

  // bbox around the point (FIRMS wants west,south,east,north)
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const west = (lng - dLng).toFixed(3);
  const east = (lng + dLng).toFixed(3);
  const south = (lat - dLat).toFixed(3);
  const north = (lat + dLat).toFixed(3);
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${SOURCE}/${west},${south},${east},${north}/${days}`;

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "arnfa/1.0 (+https://arnfa.vercel.app)" },
    });
    if (!r.ok) return NextResponse.json({ available: false, reason: `firms_${r.status}` });
    const csv = await r.text();
    // FIRMS returns a plain-text error (e.g. "Invalid MAP_KEY") instead of a CSV header on bad key.
    if (!csv.includes("latitude")) {
      return NextResponse.json({ available: false, reason: "firms_rejected" });
    }
    const points = parseFirmsCsv(csv);
    const sum = summarizeFires(points, lat, lng, radiusKm);
    return NextResponse.json(
      { available: true, source: "VIIRS", radiusKm: Math.round(radiusKm), days, ...sum },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ available: false, reason: "fetch_failed" });
  }
}
