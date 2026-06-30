/**
 * Longdo live traffic INCIDENTS — accidents, floods, road closures, breakdowns, construction.
 * Public feed (no key, no referer), nationwide, refreshed often. We normalise + keep only
 * geolocated rows. Iron Rule 0: on any failure return [] (never invent an incident).
 */
export const runtime = "nodejs";

function json(body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

type Raw = { eid?: string; title?: string; title_en?: string; description?: string; description_en?: string; latitude?: string; longitude?: string; icon?: string; severity?: string };

export async function GET() {
  try {
    const r = await fetch("https://event.longdo.com/feed/json", { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return json({ events: [] });
    const raw = (await r.json()) as Raw[];
    const events = (Array.isArray(raw) ? raw : [])
      .map((e) => ({
        eid: String(e.eid ?? ""),
        title: String(e.title ?? ""),
        titleEn: String(e.title_en ?? e.title ?? ""),
        desc: String(e.description ?? ""),
        descEn: String(e.description_en ?? e.description ?? ""),
        lat: Number(e.latitude),
        lng: Number(e.longitude),
        icon: String(e.icon ?? ""),
        severity: String(e.severity ?? ""),
      }))
      .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
    // 2-min cache — incidents change, but not every second
    return json({ events }, "public, max-age=120, s-maxage=120, stale-while-revalidate=120");
  } catch {
    return json({ events: [] });
  }
}
