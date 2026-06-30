import type { NextRequest } from "next/server";

/**
 * Traffic-aware travel time + distance between two points, via Longdo RouteService (mode=t
 * bakes LIVE congestion into the ETA — Thai-road aware, not a haversine guess). Key stays
 * server-side. Returns total seconds + metres (summed over the route's segments) and the
 * route geometry. Iron Rule 0: failure → { ok:false } (the UI falls back to its estimate).
 */
export const runtime = "nodejs";

const KEY = process.env.LONGDO_KEY ?? "";

function json(body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

const num = (v: string | null) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const flon = num(sp.get("flon")), flat = num(sp.get("flat")), tlon = num(sp.get("tlon")), tlat = num(sp.get("tlat"));
  if (!KEY || flon == null || flat == null || tlon == null || tlat == null) return json({ ok: false });

  try {
    const url = `https://api.longdo.com/RouteService/geojson/route?flon=${flon}&flat=${flat}&tlon=${tlon}&tlat=${tlat}&mode=t&type=25&restrict=0&locale=th&key=${KEY}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return json({ ok: false });
    const d = (await r.json()) as { features?: { properties?: { distance?: number; interval?: number } }[]; meta?: { status?: number } };
    if (d?.meta?.status && d.meta.status !== 200) return json({ ok: false });
    const feats = Array.isArray(d.features) ? d.features : [];
    let seconds = 0, meters = 0;
    for (const f of feats) {
      seconds += Number(f.properties?.interval ?? 0);
      meters += Number(f.properties?.distance ?? 0);
    }
    if (seconds <= 0 || meters <= 0) return json({ ok: false });
    return json({ ok: true, seconds, meters }, "public, max-age=120, s-maxage=120");
  } catch {
    return json({ ok: false });
  }
}
