/**
 * Longdo / iTIC live traffic CCTV cameras (DOH + iTIC). Public feed (referer only), ~163
 * cameras nationwide, each with a JPEG snapshot URL. We return all geolocated ones; the client
 * keeps the nearest few to the view. Iron Rule 0: failure → [] (never a fake camera).
 */
export const runtime = "nodejs";

function json(body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

type Raw = { camid?: string; title?: string; latitude?: string; longitude?: string; imgurl?: string; lastupdate?: string; hls_url?: string };

export async function GET() {
  try {
    const r = await fetch("https://camera.longdo.com/feed/?command=json", {
      headers: { Referer: "https://arnfa.vercel.app/" },
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) return json({ cameras: [] });
    const raw = (await r.json()) as Raw[];
    const cameras = (Array.isArray(raw) ? raw : [])
      .map((c) => ({
        id: String(c.camid ?? ""),
        title: String(c.title ?? ""),
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        // the jpeg.cgi snapshot is dead (0 bytes) — the real live feed is the HLS video stream.
        hls: String(c.hls_url ?? ""),
        updated: String(c.lastupdate ?? ""),
      }))
      // keep only cameras with an https HLS stream (mixed-content-safe + actually viewable)
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.hls.startsWith("https://"));
    return json({ cameras }, "public, max-age=300, s-maxage=300, stale-while-revalidate=300");
  } catch {
    return json({ cameras: [] });
  }
}
