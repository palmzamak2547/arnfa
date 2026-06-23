import { NextRequest, NextResponse } from "next/server";
import { swimVerdict, seaDistanceKm } from "@/lib/marine/marine";

/**
 * GET /api/marine?lat=&lng= — beach conditions from Open-Meteo Marine (free, no key).
 * Returns current wave + sea-surface temp + a swim verdict, but ONLY if the nearest
 * marine cell is within 25 km of the requested point — otherwise the area isn't
 * really beachside and we say { available:false } rather than fake a "beach".
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ available: false, reason: "bad_coords" }, { status: 400 });

  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
    `&current=wave_height,sea_surface_temperature&daily=wave_height_max&timezone=Asia%2FBangkok&forecast_days=1`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return NextResponse.json({ available: false, reason: `marine_${r.status}` });
    const d = await r.json();
    const sst = d.current?.sea_surface_temperature ?? null;
    const waveMax = d.daily?.wave_height_max?.[0] ?? null;
    // Open-Meteo Marine often returns a valid daily wave_height_max while current.* is null
    // for that cell/hour — the swim verdict needs the wave, not SST. Only bail if NO wave at all.
    const waveNow = d.current?.wave_height ?? waveMax;
    if (waveNow == null) return NextResponse.json({ available: false, reason: "no_data" });

    const km = Math.round(seaDistanceKm(lat, lng, d.latitude, d.longitude));
    if (km > 25) return NextResponse.json({ available: false, reason: "inland", km });

    const forVerdict = Math.max(waveNow, waveMax ?? waveNow); // the roughest the sea gets today
    return NextResponse.json(
      { available: true, waveM: waveNow, waveMaxM: waveMax, seaTempC: sst, swim: swimVerdict(forVerdict), km },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ available: false, reason: "fetch_failed" });
  }
}
