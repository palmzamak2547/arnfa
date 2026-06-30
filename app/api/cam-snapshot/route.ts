import type { NextRequest } from "next/server";

/**
 * Same-origin proxy for a CCTV camera JPEG snapshot (so it loads under our CSP and avoids
 * mixed-content / referer issues). Host-allowlisted to the iTIC camera CDN — never an open
 * proxy. Short cache (snapshots refresh ~30s). Iron Rule 0: any failure → 502, no fake image.
 */
export const runtime = "nodejs";

const ALLOW = /(^|\.)iticfoundation\.org$/i;

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new Response(null, { status: 400 });
  let host = "";
  try { host = new URL(u).hostname; } catch { return new Response(null, { status: 400 }); }
  if (!ALLOW.test(host)) return new Response(null, { status: 403 });
  try {
    const r = await fetch(u, { headers: { Referer: "https://arnfa.vercel.app/" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return new Response(null, { status: 502 });
    const ct = r.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image")) return new Response(null, { status: 502 });
    return new Response(await r.arrayBuffer(), {
      headers: { "Content-Type": ct, "Cache-Control": "public, max-age=30" },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
