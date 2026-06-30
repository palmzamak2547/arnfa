import type { NextRequest } from "next/server";

/**
 * Longdo real-time traffic tiles, proxied same-origin.
 *
 * Why a proxy: Longdo's tile server sends no `Access-Control-Allow-Origin`, so MapLibre
 * (which loads raster tiles as CORS-clean WebGL textures) can't paint them cross-origin —
 * the tile downloads but the texture upload fails silently. Serving them from our own origin
 * sidesteps CORS entirely. It also keeps the key server-side and lets us cache (3 min, matching
 * Longdo's refresh) so we stay well under the free 800k-tiles/month quota.
 *
 * Iron Rule 0: any failure / out-of-coverage tile (Longdo 302s outside cities) returns a
 * transparent 1×1 PNG, so the map never shows a broken tile and never fabricates congestion.
 */
export const runtime = "nodejs";

const KEY = process.env.LONGDO_KEY ?? ""; // server-only — never a NEXT_PUBLIC_* fallback (would inline into the client bundle)

// 1×1 transparent PNG — the honest "no traffic here" tile.
const BLANK = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function png(body: Buffer | ArrayBuffer, cache: string, status = 200): Response {
  return new Response(body as BodyInit, {
    status,
    headers: { "Content-Type": "image/png", "Cache-Control": cache },
  });
}

const blankTile = () => png(BLANK, "public, max-age=60");

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const z = Number(sp.get("z")), x = Number(sp.get("x")), y = Number(sp.get("y"));
  // reject anything outside the real tile pyramid LOCALLY (no upstream call) so the metered
  // Longdo tile quota can only ever be spent on coordinates that actually exist.
  const max = 2 ** z;
  if (!KEY || ![z, x, y].every(Number.isInteger) || z < 0 || z > 20 || x < 0 || y < 0 || x >= max || y >= max) return blankTile();

  const url = `https://mstraffic1.longdo.com/mmmap/tile.php?proj=epsg3857&mode=trafficoverlay&zoom=${z}&x=${x}&y=${y}&key=${KEY}`;
  try {
    const r = await fetch(url, { headers: { Referer: "https://arnfa.vercel.app/" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok || !(r.headers.get("content-type") || "").includes("image")) return blankTile();
    return png(await r.arrayBuffer(), "public, max-age=180, s-maxage=180, stale-while-revalidate=300");
  } catch {
    return blankTile();
  }
}
