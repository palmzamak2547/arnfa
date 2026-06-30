import type { NextRequest } from "next/server";

/**
 * Longdo place search + reverse-geocode, proxied same-origin.
 *
 *   ?q=สยาม          → { results: [{ name, lat, lng, type, address }] }   (Thai POI/road/place search)
 *   ?lat=..&lng=..    → { place: { province, district, subdistrict, road, aoi, postcode } }  (where am I, in Thai)
 *
 * The Longdo key stays server-side; we cap + cache to respect the web-services quota
 * (100k/mo, 60/min — much smaller than the tile quota). Iron Rule 0: on any failure we
 * return empty, never a fabricated place. Nationwide (Longdo covers all of Thailand).
 */
export const runtime = "nodejs";

const KEY = process.env.LONGDO_KEY ?? "";
const REF = "https://arnfa.vercel.app/";

function json(body: unknown, status = 200, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

type LongdoHit = { name?: string; lat?: number; lon?: number; type?: string; address?: string };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const lat = sp.get("lat"), lng = sp.get("lng");
  if (!KEY) return json({ results: [], place: null, configured: false });

  try {
    // ── forward search ────────────────────────────────────────────────
    if (q) {
      if (q.length > 80) return json({ results: [] });
      const url = `https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(q)}&limit=8&key=${KEY}&locale=th`;
      const r = await fetch(url, { headers: { Referer: REF }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) return json({ results: [] });
      const d = (await r.json()) as { data?: LongdoHit[] };
      const results = (d?.data ?? [])
        .filter((p) => typeof p.lat === "number" && typeof p.lon === "number")
        .slice(0, 8)
        .map((p) => ({ name: p.name ?? "", lat: p.lat as number, lng: p.lon as number, type: p.type ?? "", address: p.address ?? "" }));
      // short cache — search terms repeat, but stay fresh
      return json({ results }, 200, "public, max-age=300, s-maxage=300");
    }

    // ── reverse geocode (where am I) ──────────────────────────────────
    if (lat && lng) {
      const la = Number(lat), ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) return json({ place: null });
      const url = `https://api.longdo.com/map/services/address?lon=${ln}&lat=${la}&key=${KEY}&locale=th`;
      const r = await fetch(url, { headers: { Referer: REF }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) return json({ place: null });
      const d = (await r.json()) as Record<string, unknown>;
      const place = {
        province: (d.province as string) ?? "",
        district: (d.district as string) ?? "",
        subdistrict: (d.subdistrict as string) ?? "",
        road: (d.road as string) ?? "",
        aoi: (d.aoi as string) ?? "",
        postcode: (d.postcode as string) ?? "",
      };
      return json({ place }, 200, "public, max-age=600, s-maxage=600");
    }

    return json({ results: [], place: null }, 400);
  } catch {
    return json({ results: [], place: null });
  }
}
